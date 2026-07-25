# Recall

A private, calming dream journal with Google sign-in, a tactile monthly calendar, multiple dreams per day, and persistent AI-assisted reflections.

## What changed

- Apple-inspired responsive experience with a peach calendar, circular days, mood dots, “Today” navigation, subtle clouds, and reduced-motion support.
- Google sign-in through Firebase Authentication (popup on desktop, redirect on mobile).
- Firestore data isolated under `users/{uid}` and accessed only by the authenticated Flask API.
- Multiple dream entries per date, expandable journal cards, search, editing primitives, and a focused capture modal.
- Structured, persistent insight records with generated titles, themes, emotional tone, a reflection question, and evidence-gated pattern notes.
- A bounded semantic episode memory that can notice a similar person, place, relationship, or event without resending old dream text.
- Cloud Run production container that serves the React build and Flask API together.

## Insight architecture

One bounded generation call handles title, reflection, structured metadata, and memory extraction. Small 256-dimension embedding calls retrieve relevant prior episode cards and merge proposed themes into the user's personal taxonomy. LangChain/LangGraph is deliberately not used: the workflow is a fixed retrieve → reflect → persist pipeline with no tool-driven agent loop, branching, or resumable human approval.

The request contains:

1. The current dream (maximum 6,000 characters).
2. The user-selected mood.
3. At most 12 deduplicated theme/motif keywords plus the eight nearest labels from the user's personal theme taxonomy.
4. At most three semantically similar episode cards, each containing a date, generated title, one literal sentence, and up to six anchors.

Raw previous dreams are never resent as historical context. The current dream is embedded and analysed, while old dreams are represented by compact cards. The response produces a structured 2–4 paragraph reflection (roughly 180–420 words), one reflection question, and privacy-minimised retrieval metadata. A content hash makes insights idempotent: unchanged entries return the stored result for no model cost. Editing the dream marks the insight stale and overwrites its episode card when re-analysed.

Cost and abuse controls:

- A configurable cost-conscious model (`gpt-5.6-luna` by default), low reasoning, and a 1,400 output-token ceiling.
- One structured response rather than separate title, metadata, and analysis calls.
- One to three themes selected from 18 starter labels or a genuinely new personal label; the UI shows up to four recent themes and only reveals “Most recurring” after a theme appears twice.
- Proposed labels are embedded in one small batch and merged into semantically close personal themes. Legacy aliases such as `trust → self-trust` are also canonicalised.
- Each user keeps at most 60 active theme labels. Low-frequency, older labels are archived rather than deleted when the catalogue grows, so the prompt stays compact while history remains intact.
- Semantic retrieval uses `text-embedding-3-small` at 256 dimensions, checks at most 60 private episode cards, and sends no more than three strong matches to the reflection prompt.
- Evidence-gated recurrence notes persist the supporting dream IDs, allowing the Patterns UI to show exactly which entries were connected.
- The rolling motif list is capped at 40 and episode memory at 60 cards; unrelated history is never added merely to fill context.
- Pre-moderation, strict JSON schema, a stable privacy-preserving safety identifier, and `store=False`.
- Server-side ownership checks; the client cannot select another user ID.
- Three fresh insights per user per UTC day and a 45-second cooldown, reserved transactionally.
- A private hashed-email allowlist can remove the three-per-day cap for selected verified Google
  accounts. The cooldown remains in place to prevent accidental rapid duplicate requests.
- A generated insight is never regenerated until the dream body changes.
- The dream is treated as untrusted data, so journal-based prompt injection cannot alter the developer instruction.
- Reflections explicitly avoid diagnosis, deterministic symbolism, claims about hidden truths, or invented life history.

The complete rationale, prompt contract, memory lifecycle, research basis, and
criteria for adopting LangGraph later are in
[`docs/INSIGHT_ARCHITECTURE.md`](docs/INSIGHT_ARCHITECTURE.md).
The codebase layout and placement rules are in
[`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

For production, add Cloud Armor/API Gateway rate limits if the endpoint becomes a public abuse target, and schedule deletion/export flows before launch.

## Local development

Local development uses the real pre-production Firebase Authentication, Firestore database, and
Cloud KMS key. There is no seeded journal or demo-login mode.

Install the Google Cloud CLI if `gcloud --version` is unavailable:

```bash
brew install --cask google-cloud-sdk
```

The repository is pinned to the `recall-preprod` pyenv environment through `.python-version`.
VS Code is configured to use the same interpreter. To recreate it:

```bash
pyenv virtualenv 3.12.0 recall-preprod
pyenv local recall-preprod
python -m pip install -r flask-server/requirements.txt
```

Create the two ignored local configuration files:

```bash
cp .env.example .env
cp client/.env.example client/.env.local
```

Fill `.env` with the pre-production project ID, KMS key resource name, and an OpenAI API key. Fill
`client/.env.local` with the Firebase Web app configuration shown in Firebase Console under
**Project settings → General → Your apps → SDK setup and configuration**.

Authenticate the Python backend to the pre-production Google Cloud project:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PREPROD_PROJECT_ID
```

The signed-in development identity needs Firestore access and
`roles/cloudkms.cryptoKeyEncrypterDecrypter` on the pre-production key. Then install frontend
packages and start both services:

```bash
cd client
npm ci
npm start
```

Open `http://localhost:3000`. Missing Firebase configuration now fails visibly and never falls back
to fake users, fake dreams, or client-only saves.

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

1. Open the [Firebase console](https://console.firebase.google.com/) and select **Create a project**.
   Name it `Recall Preprod`, choose a permanent unique project ID, and leave Google Analytics off
   unless you explicitly need it.
2. On **Project overview**, select the Web icon (`</>`), use app nickname `Recall Web Preprod`,
   leave Firebase Hosting unchecked, and select **Register app**.
3. Copy `apiKey`, `authDomain`, and `projectId` from the displayed configuration into
   `client/.env.local`.
4. Open **Security → Authentication → Get started → Sign-in method → Add new provider → Google**.
   Enable it, select a project support email, and save. Do not enable Email/Password.
5. Open **Authentication → Settings → Authorized domains → Add domain** and add `localhost`.
   New Firebase projects no longer add it automatically. Add the Cloud Run hostname after deploy.

### 3. Create Firestore and deploy locked rules

In Firebase Console open **Databases & Storage → Firestore Database → Create database**. Choose
the Standard edition, **Production mode**, and a permanent location near the backend and KMS key
(for example `europe-west2`). Set `FIRESTORE_DATABASE_ID` to the exact database ID. The checked-in
pre-production Firebase configuration targets the named `recall-preprod` database. Then deploy the
repository’s deny-by-default client rules:

```bash
npm install -g firebase-tools
firebase login
firebase use --add YOUR_PROJECT_ID
firebase deploy --only firestore
```

The included rules deny all browser access. The Flask Admin SDK accesses Firestore through its Cloud Run service account and IAM, preventing the browser from altering insight, quota, or ownership fields.

### 4. Enable Google Cloud services

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudkms.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com
```

### 5. Create the runtime identity, encryption key, and secret

```bash
gcloud iam service-accounts create recall-api \
  --display-name="Recall Cloud Run API"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:recall-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud kms keyrings create recall-data \
  --location=europe-west2

gcloud kms keys create journal-data \
  --keyring=recall-data \
  --location=europe-west2 \
  --purpose=encryption \
  --protection-level=software

gcloud kms keys add-iam-policy-binding journal-data \
  --keyring=recall-data \
  --location=europe-west2 \
  --member="serviceAccount:recall-api@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

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
  --set-env-vars FIRESTORE_DATABASE_ID=YOUR_DATABASE_ID,OPENAI_INSIGHT_MODEL=gpt-5.6-luna,OPENAI_EMBEDDING_MODEL=text-embedding-3-small,OPENAI_EMBEDDING_DIMENSIONS=256,SEMANTIC_MEMORY_ENABLED=true,THEME_MERGE_THRESHOLD=0.82,THEME_CANDIDATE_THRESHOLD=0.25,DATA_ENCRYPTION_MODE=required,DATA_KMS_KEY_NAME=projects/YOUR_PROJECT_ID/locations/europe-west2/keyRings/recall-data/cryptoKeys/journal-data \
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
  security/encryptionKey
    wrappedRootKey, kmsKeyName, algorithm, version
  dreams/{dreamId}
    date, keyed contentHash, insightStatus, timestamps
    encryptedData { version, algorithm, nonce, ciphertext }
  memory/rolling
    encryptedData, updatedAt
  memoryEpisodes/{dreamId}
    date, dreamId, encryptedData, updatedAt
  themeTaxonomy/{themeId}
    encryptedData, count, active
    firstSeenAt, lastSeenAt, archivedAt?

insightAccess/{sha256(normalizedGoogleEmail)}
  active, unlimitedInsights, updatedAt
```

Raw allowlisted email addresses are not stored in Firestore. The backend hashes the verified
Google-account email from the Firebase ID token and performs an exact server-side document lookup.
The browser cannot read or write this collection.

## Encryption and sensitive data

Firestore encrypts all documents and metadata at rest using Google-managed keys by default, and
uses TLS for data in transit. Recall additionally encrypts private fields at the application layer
before Firestore receives them, so a Firestore-console administrator without KMS decryption access
sees ciphertext rather than journal content.

Each user receives a random 256-bit root key. Cloud KMS wraps that root key, and only the wrapped
key is stored in `users/{uid}/security/encryptionKey`. Recall derives a distinct AES-256-GCM key for
each record scope and uses a fresh random nonce for every write. Authenticated scope data binds
ciphertext to its user and document, preventing it from being copied to another record.

Encrypted fields include dream title, body, rich text, mood, generated insight, rolling memory,
episode title/summary/anchors/themes/mood/embedding, and personal theme labels/aliases/embeddings.
The content hash is a per-user keyed digest rather than a plain SHA-256 value. Query-critical
metadata remains visible: record dates, timestamps, insight status, theme counts/active flags, and
usage quotas.

This is not end-to-end encryption: the authorised Flask service must decrypt dream text to return it
to its owner and to send the current dream to the insight model. A project principal who can both
change the running application/IAM and grant itself KMS decryption could still obtain plaintext.
Production should therefore keep Firestore administrators separate from KMS key users, ideally
placing KMS keys in a separately administered key project.

`DATA_ENCRYPTION_MODE` defaults to `required`; production writes fail rather than silently storing
plaintext when `DATA_KMS_KEY_NAME` is missing. `disabled` exists only for disposable local/emulator
data and stores a visibly marked plaintext development envelope.

### Encrypt existing plaintext records

Deploy/configure the KMS key first. Using an identity temporarily authorised for both Firestore and
`roles/cloudkms.cryptoKeyEncrypterDecrypter`, run a dry run:

```bash
cd flask-server
export GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID
export FIRESTORE_DATABASE_ID=YOUR_DATABASE_ID
export DATA_ENCRYPTION_MODE=required
export DATA_KMS_KEY_NAME=projects/YOUR_PROJECT_ID/locations/europe-west2/keyRings/recall-data/cryptoKeys/journal-data
python scripts/migrate_encrypt_firestore.py
```

Then migrate:

```bash
python scripts/migrate_encrypt_firestore.py --apply
```

The migration is resumable and skips already encrypted documents. Test it in pre-production,
verify that plaintext fields no longer appear in the Firestore console, then run it in production.
Remove the human migration identity's KMS decryption role afterward.

## Unlimited-insight access

From `flask-server`, using Application Default Credentials for the intended Firebase project:

```bash
GOOGLE_CLOUD_PROJECT=recall-preprod FIRESTORE_DATABASE_ID=recall-preprod \
  python scripts/set_unlimited_insights.py user@gmail.com --enable
```

Disable access with:

```bash
GOOGLE_CLOUD_PROJECT=recall-preprod FIRESTORE_DATABASE_ID=recall-preprod \
  python scripts/set_unlimited_insights.py user@gmail.com --disable
```

The account must sign in through the Google provider with a verified email. The email supplied to
the script is normalised and hashed locally; only the hash is used as the Firestore document ID.
An allowlisted account bypasses the daily count but still observes the 45-second cooldown. Access
lookup failures fail closed and apply the normal free limit.

## Validation

```bash
cd client && npm run build
cd ../flask-server
PYTHONPYCACHEPREFIX=/tmp/recall-pycache \
  python3 -m py_compile main.py $(find app -name '*.py' -type f)
docker build .
```

The UI has been visually checked at 1280×720 and 390×844, including login, dashboard, month calendar, expanded dream, insight affordance, and create-entry modal.
