# Security

## Controls implemented in the repository

- Supabase RLS on all user-owned tables.
- Private document storage with owner-path policies.
- SecureStore-backed native session persistence.
- Anonymous/public Supabase key only in the Expo bundle.
- Provider and service-role keys restricted to server-side environment secrets.
- Strict MIME/size validation before upload.
- Stable job ids and unique constraints for idempotency.
- Evidence-required, schema-validated AI extraction.
- Prompt-injection boundary that treats source text as untrusted data.
- Privacy-safe logging plus client- and database-enforced analytics contracts that reject document content.
- Consent for content improvement defaults to off.

## Threat model

### Cross-account access

RLS uses `auth.uid()` for reads and writes; storage checks the first object-path segment. Tests must create two users and prove user B cannot select, mutate, delete, or sign a URL for user A's content.

### Malicious documents

File type is checked by declared MIME type, extension, size, and provider-side inspection. Document text is delimited as untrusted content. Model output is parsed into a closed schema and rejected when malformed or unsupported by evidence.

### Secret disclosure

`EXPO_PUBLIC_*` values are considered public. AI keys, service-role credentials, and provider webhooks are Edge Function secrets and must never be committed, logged, or returned to the app.

### Abuse and cost exhaustion

The processing endpoint authenticates the user, applies per-user and per-job retry limits, enforces size/page limits, and rejects duplicate content for the same user before a new job is created.

### Data deletion

Deletion must cover database rows, storage objects, local cached copies, reminders, and tokens. Account deletion requires recent authentication when the provider supports it and returns a deletion receipt without sensitive content.

## Logging policy

Allowed: request id, user-scoped opaque id, stage, duration, provider status code, token count, estimated cost.

Forbidden: document text, OCR blocks, names found in documents, emails/addresses from source content, signed URLs, access/refresh tokens, provider keys.

## Release audit

- Run RLS cross-user tests.
- Inspect the production bundle for secrets.
- Verify storage bucket is private.
- Exercise expired-session and offline paths.
- Test malformed/oversized files and model output.
- Verify deletion removes objects and reminders.
- Configure Edge Function rate limits and provider budgets.
