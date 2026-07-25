# Recall project structure

Recall is organised around product areas rather than file type alone. Route-level
files describe screens, feature folders own focused UI, and infrastructure stays
behind small service or repository boundaries.

## Frontend

```text
client/src/
  App.tsx                    Router boundary only
  app/RecallApp.tsx          Authentication, shared state, routes, and modals
  pages/                     Route-level screens
    LoginPage.tsx
    JournalPage.tsx
    PatternsPage.tsx
  features/                  Product-area components
    calendar/DreamCalendar.tsx
    editor/EntryModal.tsx
    insights/InsightPanel.tsx
    journal/DreamRow.tsx
  components/layout/         Reusable application chrome
  domain/dreams.ts           Dream types, mood metadata, and normalisation
  services/                  Firebase and HTTP API adapters
  styles/getStyle.ts         Shared Tailwind class-list helper
  utils/richText.ts          Rich-text conversion and sanitisation
  index.css                  Tailwind directives and app-wide visual system
```

`App.tsx` intentionally contains only `HashRouter` and the application root.
Hash routing gives Journal and Patterns real, linkable routes while allowing the
same static React build to work on Cloud Run without additional server-side
rewrite rules.

Placement rules:

- Add a navigable screen to `pages/` and register its route in `RecallApp.tsx`.
- Add UI used by one product area to that folder under `features/`.
- Add truly reusable visual chrome to `components/`.
- Put network and Firebase calls in `services/`, never directly in a page.
- Put shared business types and normalisation in `domain/`.
- Keep page-specific Tailwind class maps beside their page or feature.

## Backend

```text
flask-server/
  main.py                    WSGI and local-development entry point
  app/
    __init__.py              Application factory, CORS, blueprints, static app
    config.py                Environment-backed settings
    auth.py                  Firebase bearer-token verification
    access.py                Verified-email access tiers and allowlist lookup
    security/
      encryption.py          KMS-wrapped AES-GCM keys and payload encryption
      records.py             Sensitive-field maps and legacy-read helpers
    firebase.py              Firestore client initialisation
    time.py                  Shared date/time helpers
    routes/
      system.py              Health and React fallback
      dreams.py              Dream CRUD HTTP endpoints
      insights.py            Insight HTTP endpoint
    services/
      insight_service.py     Retrieve → reflect → persist orchestration
      memory.py              Theme taxonomy and episode-memory lifecycle
      title_service.py       Daily title budget and persistence-safe fallback
    dreams/repository.py     Firestore dream persistence
    insights/
      ai.py                  OpenAI structured generation and embeddings
      titles.py              Cost-bounded title generation and local fallback
      prompts.py             Reflection prompt and response schema
  scripts/
    set_unlimited_insights.py  Manage the private unlimited tier
    migrate_encrypt_firestore.py  Encrypt legacy plaintext records
  tests/
    test_access.py           Pure access-claim and identifier tests
    test_encryption.py       Ciphertext, scope binding, and blind-index tests
    test_titles.py           Title bounds, fallback, and API request contract
```

The app factory keeps imports testable and avoids configuring Flask, Firebase,
and routes inside the process entry point. HTTP concerns belong in `routes`,
workflow decisions in `services`, storage operations in repositories, and model
contracts in `insights`.

Placement rules:

- Add an endpoint to the appropriate blueprint in `routes/`.
- Keep route handlers thin: validation, service call, response.
- Put multi-step use cases and quota/idempotency decisions in `services/`.
- Put Firestore query details in a repository.
- Keep model prompts, schemas, and provider calls isolated in `insights/`.
- Register any new blueprint in `app/__init__.py`.

## Verification

From the repository root:

```bash
cd client
CI=true npm test -- --runInBand
npm run build

cd ../flask-server
PYTHONPYCACHEPREFIX=/tmp/recall-pycache \
  python3 -m py_compile main.py $(find app -name '*.py' -type f)
```

After structural changes, also walk both `#/journal` and `#/patterns` at desktop
and mobile widths, including create, edit, expand, insight, and cross-dream
connection navigation.
