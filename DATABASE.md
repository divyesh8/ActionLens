# Database

The executable schema is in `supabase/migrations/202608250001_initial_schema.sql`.

## Ownership model

Every private row either has `user_id` directly or is reachable through a document owned by the authenticated user. RLS is enabled on every user-data table. Client queries still filter by user for performance, but authorization is enforced in Postgres.

## Main entities

| Entity | Purpose |
| --- | --- |
| `profiles` | Account display data and onboarding state |
| `documents` | Source metadata, state machine, hash, and private storage path |
| `document_pages` | Per-page OCR text and dimensions |
| `document_extractions` | Versioned, schema-validated AI result awaiting verification |
| `obligations` | Verified top-level commitments and deadlines |
| `requirements` | Verified checklist entries and dependencies |
| `actions` | Executable steps, waiting state, and dependencies |
| `document_evidence` | Source text/page/bounds for extracted or verified items |
| `reminders` | Scheduling intent plus device/platform schedule id |
| `processing_jobs` | Durable idempotent processing state |
| `tags`, `document_tags` | Extensible user organization |
| `activity_history` | Human-readable lifecycle events without sensitive analytics payloads |
| `product_events` | Privacy-safe product funnel events with bounded metadata |
| `user_preferences` | Timezone, reminder defaults, and privacy consent |
| `notification_tokens` | Device tokens for future push delivery |

## Search

Postgres full-text search is generated from document title, organization, verified summary, and normalized extracted text. The search function also covers requirement/action text, tags, and deadline month names. Semantic search is intentionally excluded from the MVP.

## Storage

The `documents` bucket is private. Object names must start with the authenticated user's UUID (`<user_id>/<document_id>/...`). Storage RLS verifies the first path segment. Signed URLs are requested only when the user opens a source preview.

## Deletion

Document metadata cascades in Postgres. The client calls the secure delete-document function first to remove private storage objects and scheduled reminders, then deletes the row. Account deletion is performed by a privileged Edge Function after verifying the current session and removes storage objects before deleting the Auth user.
