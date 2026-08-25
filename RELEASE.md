# Release Readiness

ActionLens is not release-ready until the core loop is verified in production-like browsers with Supabase and the self-hosted local OCR assets.

## Required gates

- Type check, lint, unit, integration, and core-loop E2E pass.
- Android release build and iOS archive complete.
- Email verification and password-reset links open the installed app.
- Camera, photo, PDF, paste-text, offline restart, and slow-network paths pass.
- Two-account RLS and storage isolation tests pass.
- Local OCR accuracy, untrusted-text, and malformed-output tests pass.
- Notification timezone, cancellation, and completion behavior pass.
- Individual document deletion and account deletion are verified end-to-end.
- Accessibility audit passes with large text and screen reader.
- Privacy policy accurately describes browser-local processing and Supabase retention behavior.

## Build configuration

Use separate Supabase projects for development, preview, and production. The website requires only the public Supabase URL and anonymous/publishable key; no AI or OCR provider credentials are configured.
