# Security

## Controls implemented in the repository

- Supabase RLS on all user-owned tables.
- Private document storage with owner-path policies.
- SecureStore-backed native session persistence.
- Anonymous/public Supabase key only in the Expo bundle.
- No AI/model/OCR API key is required or present in the client.
- Strict MIME/size validation before upload.
- Stable job ids and unique constraints for idempotency.
- Evidence-required, schema-validated local extraction.
- Deterministic analysis boundary that treats source text as untrusted data.
- Privacy-safe logging plus client- and database-enforced analytics contracts that reject document content.
- Consent for content improvement defaults to off.

## Threat model

### Cross-account access

RLS uses `auth.uid()` for reads and writes; storage checks the first object-path segment. Tests must create two users and prove user B cannot select, mutate, delete, or sign a URL for user A's content.

### Malicious documents

File type is checked by declared MIME type, extension, and size. Document text is treated as untrusted data. Local analysis output is parsed into a closed schema and rejected when malformed or unsupported by evidence.

### Secret disclosure

`EXPO_PUBLIC_*` values are considered public. Only the Supabase project URL and anonymous/publishable key belong in the website bundle. Supabase service-role credentials must never be committed, logged, or returned to the app.

### Abuse and cost exhaustion

Local processing enforces size, page, and canvas-memory limits, while the authenticated database rejects duplicate content for the same user before a new job is created. There is no paid model endpoint to exhaust.

### Data deletion

Deletion must cover database rows, storage objects, local cached copies, reminders, and tokens. Account deletion requires recent authentication when the provider supports it and returns a deletion receipt without sensitive content.

## Logging policy

Allowed: request id, user-scoped opaque id, local stage, and duration.

Forbidden: document text, OCR blocks, names found in documents, emails/addresses from source content, signed URLs, access/refresh tokens, and private credentials.

## Release audit

- Run RLS cross-user tests.
- Inspect the production bundle for secrets.
- Verify storage bucket is private.
- Exercise expired-session and offline paths.
- Test malformed/oversized files and local schema output.
- Verify deletion removes objects and reminders.
- Verify the production site serves OCR/PDF workers from `/local-ocr` and makes no model-provider requests.
