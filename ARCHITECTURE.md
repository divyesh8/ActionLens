# ActionLens Architecture

## Product boundary

ActionLens converts an uploaded document into a user-verified action plan. The source document remains authoritative. AI output is never promoted to an obligation, reminder, or deadline until the user confirms it.

## System overview

```text
Expo app
  -> Supabase Auth (email/password, verified session)
  -> private Supabase Storage (originals and previews)
  -> Postgres + RLS (documents, evidence, plans, reminders, history)
  -> Edge Function: process-document
       -> OCR provider
       -> strict analysis provider
       -> Zod-compatible JSON validation
       -> awaiting_verification result
  -> Expo local notifications (MVP)
  -> SQLite offline cache + durable pending-import queue
```

Privileged provider keys and the Supabase service-role key exist only in Edge Function secrets. The mobile client receives only the Supabase URL and anonymous publishable key.

## Mobile architecture

The project uses Expo SDK 57, React Native, TypeScript, and Expo Router. Routes live under `src/app`; application code is grouped by feature under `src/features`.

```text
src/
  app/                    # routing and route-level composition only
  components/             # cross-feature UI components
  design-system/          # tokens and primitives
  features/
    auth/
    onboarding/
    capture/
    documents/
    analysis/
    verification/
    actions/
    reminders/
    search/
    timeline/
    settings/
  services/
    supabase/              # typed client and persistence
    ai/                    # provider contracts and schemas
    ocr/                   # provider contracts
    notifications/
    storage/
    analytics/
    logging/
  store/                   # small client-only Zustand state
  types/
  utils/
```

Rules:

- Route files remain small; business logic belongs in features/services.
- TanStack Query owns server state, retries, and invalidation.
- Zustand owns short-lived client state such as capture drafts and UI preferences.
- Secrets/tokens use Expo SecureStore on native. Authentication credentials are never put in AsyncStorage.
- Offline-readable records are persisted through a local cache without copying private document text into logs or analytics.
- Every imported file has a stable client-generated job id and a SHA-256 content hash when available.
- User-facing copy can be routed through the typed `src/i18n` catalog, which selects from the device locale and falls back to English. English is the only shipped catalog in the MVP.

## Trust boundary

Document content is untrusted data. It cannot change system instructions, select tools, or authorize operations. Only validated structured output is written. Each extracted item requires evidence (`source_text`, page, optional bounding geometry) and a confidence category.

## Processing state machine

```text
draft -> uploading -> uploaded -> queued -> ocr_processing -> ocr_complete
      -> ai_processing -> awaiting_verification -> verified
      -> failed (recoverable from the last persisted safe stage)
```

Transitions are checked in Postgres. Processing is keyed by a unique job key so retries do not duplicate extraction rows or obligations.

## Verification transaction

The app submits the complete edited verification payload to a database function. In one transaction it:

1. validates ownership and the document state;
2. writes the verified obligations, requirements, and actions;
3. attaches evidence references;
4. writes dependency edges that point only to earlier plan items, preventing cycles;
5. changes the document to `verified`;
6. appends activity history.

Reminder scheduling happens after the transaction and stores the returned platform identifier. A failed scheduling attempt does not roll back the verified plan and remains retryable.

## Failure strategy

- Mutations use bounded retry with idempotency keys.
- Upload and processing status is persisted so closing the app does not lose progress.
- Offline imports enter `waiting_for_connection` locally and sync once connectivity returns.
- Pending source files are copied into app-owned storage before queueing, then removed after a successful idempotent sync.
- No spinner is indefinite: all long-running views show the persisted stage and a retry/cancel path.
- User-safe errors are distinct from private diagnostic context.

## Analytics boundary

Product events use a closed, Zod-validated metadata contract and contain only coarse event names, outcomes, and counts. Document titles, OCR text, extracted people, contact data, storage paths, and signed URLs are excluded.

## Future extension points

OCR and document analysis are provider interfaces. Share extensions, inbound email, push delivery, semantic search, subscriptions, and additional user segments can be added without changing the core document/obligation model.
