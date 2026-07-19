# Recall

A private, calming dream journal with Google sign-in, a tactile monthly calendar, multiple dreams per day, and persistent AI-assisted reflections.

## What changed

- Apple-inspired responsive experience with a peach calendar, circular days, mood dots, “Today” navigation, subtle clouds, and reduced-motion support.
- Google sign-in through Firebase Authentication (popup on desktop, redirect on mobile).
- Firestore data isolated under `users/{uid}` and accessed only by the authenticated Flask API.
- Multiple dream entries per date, expandable journal cards, search, editing primitives, and a focused capture modal.
- Structured, persistent insight records with generated titles, themes, emotional tone, intensity, a reflection question, and evidence-gated pattern notes.
- Cloud Run production container that serves the React build and Flask API together.

## Insight architecture

One bounded model call handles title, reflection, structured metadata, and memory extraction. LangChain/LangGraph is deliberately not used: there is no branching or tool-driven agent loop here, so it would add latency, dependencies, and tracing surface without improving this workflow.

The request contains:

1. The current dream (maximum 6,000 characters).
2. The user-selected mood.
3. At most 12 deduplicated theme/motif keywords from a rolling memory document.

Raw previous dreams are never resent. The response produces a structured 2–4 paragraph reflection (roughly 180–420 words), one reflection question, and privacy-minimised keywords. A content hash makes insights idempotent: unchanged entries return the stored result for no model cost. Editing the dream marks the insight stale.

Cost and abuse controls:

- A configurable cost-conscious model (`gpt-5.6-luna` by default), low reasoning, and a 1,400 output-token ceiling.
- One structured response rather than separate title, metadata, and analysis calls.
- One to three themes selected from an 18-item controlled vocabulary; the UI shows up to four recent themes and only reveals “Most recurring” after a theme appears twice.
- Pre-moderation, strict JSON schema, a stable privacy-preserving safety identifier, and `store=False`.
- Server-side ownership checks; the client cannot select another user ID.
- Three fresh insights per user per UTC day and a 45-second cooldown, reserved transactionally.
- A generated insight is never regenerated until the dream body changes.
- The dream is treated as untrusted data, so journal-based prompt injection cannot alter the developer instruction.
- Reflections explicitly avoid diagnosis, deterministic symbolism, claims about hidden truths, or invented life history.

For production, add Cloud Armor/API Gateway rate limits if the endpoint becomes a public abuse target, and schedule deletion/export flows before launch.

## Local development

Requirements: Node 22+, Python 3.12+, a Firebase project, and Google Application Default Credentials.

```bash
cp .env.example .env
gcloud auth application-default login

cd client
npm ci
npm run dev
```

In another terminal:

```bash
cd flask-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
set -a; source ../.env; set +a
python main.py
```

Without the React Firebase variables, the frontend opens in clearly labelled preview mode using seeded dreams. No real API data is written in preview mode.

## Deploy to Firebase + Firestore + Cloud Run

### 1. Create separate pre-production and production projects

Use two independent Google Cloud/Firebase projects, for example `recall-preprod`
and `recall-prod`. Repeat steps 2–8 for each environment. This keeps test users,
Firestore journals, quotas, secrets, logs, and billing isolated.

```bash
gcloud auth login
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
gcloud billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

Start with pre-production, complete the smoke tests in step 8, and only then
repeat the deployment for production. You can instead create each project in
the Firebase console. Choose a nearby region carefully; Firestore’s location
cannot be changed later.

The Firebase web configuration is compiled into the React bundle, so build one
container per environment. Do not promote a pre-production image containing
pre-production Firebase values into production.

### 2. Add Firebase and Google sign-in

1. Open the [Firebase console](https://console.firebase.google.com/), add Firebase to the project, then create a Web app.
2. In **Authentication → Sign-in method**, enable **Google** and choose the support email.
3. Add your eventual Cloud Run domain and any custom domain to **Authentication → Settings → Authorized domains**.
4. Copy the Web app’s `apiKey`, `authDomain`, and `projectId`; these are client configuration values, not server secrets.

### 3. Create Firestore and deploy locked rules

Create a Firestore **Native mode** database in the Firebase console, then:

```bash
npm install -g firebase-tools
firebase login
firebase use --add YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

The included rules deny all browser access. The Flask Admin SDK accesses Firestore through its Cloud Run service account and IAM, preventing the browser from altering insight, quota, or ownership fields.

### 4. Enable Google Cloud services

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com
```

### 5. Create the runtime identity and secret

```bash
gcloud iam service-accounts create recall-api \
  --display-name="Recall Cloud Run API"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:recall-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

printf '%s' 'YOUR_OPENAI_API_KEY' | \
  gcloud secrets create OPENAI_API_KEY --data-file=-

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member="serviceAccount:recall-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Use Secret Manager; never put the OpenAI key in React variables or the Docker image.

### 6. Build the production container

Use the Firebase Web app values from step 2:

Build locally with the explicit Firebase client arguments:

```bash
gcloud artifacts repositories create recall \
  --repository-format=docker \
  --location=europe-west2

gcloud auth configure-docker europe-west2-docker.pkg.dev

docker build \
  --build-arg REACT_APP_FIREBASE_API_KEY=YOUR_KEY \
  --build-arg REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com \
  --build-arg REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID \
  --build-arg REACT_APP_API_URL= \
  -t europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/recall/recall:latest .

docker push europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/recall/recall:latest
```

An empty `REACT_APP_API_URL` uses the same Cloud Run origin for `/api`.

### 7. Deploy Cloud Run

```bash
gcloud run deploy recall \
  --image europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/recall/recall:latest \
  --region europe-west2 \
  --allow-unauthenticated \
  --service-account recall-api@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets OPENAI_API_KEY=OPENAI_API_KEY:1 \
  --set-env-vars OPENAI_INSIGHT_MODEL=gpt-5.6-luna \
  --memory 512Mi \
  --cpu 1 \
  --min 0 \
  --max 10 \
  --concurrency 40
```

“Allow unauthenticated” makes the website and API endpoint reachable; every private API route still verifies a Firebase ID token.
The secret is pinned to version `1`; deploy a new Cloud Run revision pointing to
the next numbered secret version when rotating the key.

### 8. Finish and verify

1. Copy the Cloud Run URL into Firebase Authorized Domains (hostname only).
2. Open the app in a private window and sign in with Google.
3. Create two dreams, refresh, and verify both persist.
4. Generate an insight, request it again, and verify the response is cached.
5. Confirm a different Google account cannot access the first account’s dreams.
6. Exercise bold, italic, underline, lists, quotes, multiple dreams on one date, editing, calendar selection, Patterns, and the mobile layout.
7. Check Cloud Run logs, the `/api/health` endpoint, and set billing-budget alerts.
8. In OpenAI project settings, use a separate restricted project key and conservative usage limit for each environment.

## Data layout

```text
users/{uid}
  insightUsage { day, count, lastAt }
  dreams/{dreamId}
    date, title, body, mood, contentHash
    insightStatus
    insight { summary, themes, reflection, pattern, emotionalTone, intensity, contentHash }
  memory/rolling
    themes[], motifs[], lastMood, updatedAt
```

## Validation

```bash
cd client && npm run build
cd ../flask-server && python3 -m py_compile main.py util/ai.py util/prompts.py
docker build .
```

The UI has been visually checked at 1280×720 and 390×844, including login, dashboard, month calendar, expanded dream, insight affordance, and create-entry modal.
