# Release Readiness

ActionLens is not release-ready until the core loop is verified on real Android and iOS devices with production-like Supabase, OCR, and AI credentials.

## Required gates

- Type check, lint, unit, integration, and core-loop E2E pass.
- Android release build and iOS archive complete.
- Email verification and password-reset links open the installed app.
- Camera, photo, PDF, paste-text, offline restart, and slow-network paths pass.
- Two-account RLS and storage isolation tests pass.
- AI prompt-injection and malformed-output tests pass.
- Notification timezone, cancellation, and completion behavior pass.
- Individual document deletion and account deletion are verified end-to-end.
- Accessibility audit passes with large text and screen reader.
- Privacy policy accurately names processing providers and retention behavior.

## Build configuration

Use separate Supabase projects and provider credentials for development, preview, and production. EAS environment secrets hold only build-time public configuration; Edge Function secrets hold all privileged keys.
