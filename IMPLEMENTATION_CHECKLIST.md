# ActionLens Implementation Checklist

This checklist records verified repository state. A checked item means its code path or static contract has been tested; it does not imply production credentials are configured.

## Phase 0 — Foundation

- [x] Repository audited (initial repository was empty)
- [x] Expo SDK 57 TypeScript scaffold created
- [x] Versioned Expo SDK documentation reviewed
- [x] Architecture and trust boundaries documented
- [x] Environment variable contract documented
- [x] Feature architecture implemented
- [x] Design system implemented
- [x] Error boundary and privacy-safe logging implemented
- [x] Type check, lint, and unit-test commands passing

## Phase 1 — Authentication

- [x] SecureStore-backed Supabase client
- [x] Sign up and email verification state
- [x] Sign in, sign out, and session persistence
- [x] Password reset/deep link handling
- [x] Protected navigation waits for session resolution
- [x] Auth loading and recoverable error states
- [x] Authentication validation tests

## Phase 2 — Database and security

- [x] Normalized initial schema written
- [x] RLS and private storage policies written
- [x] Idempotency and ownership constraints written
- [x] Secure document/account deletion functions written and JWT-protected
- [ ] Migration applied to a configured Supabase project
- [ ] Two-user RLS integration tests passing
- [ ] Secure document/account deletion functions deployed and verified end to end

## Phase 3 — Core navigation and UI

- [x] Three-screen onboarding
- [x] Attention-first home
- [x] Vault, timeline, capture, settings navigation
- [x] Accessible empty/error/loading states
- [x] Clearly labeled, account-isolated fictional first-run sample

## Phase 4 — Document ingestion

- [x] Camera and photo picker
- [x] PDF/file picker
- [x] Paste text
- [x] Validation, byte progress, cancel, retry, and secure upload
- [x] Content hashing and duplicate detection

## Phase 5 — OCR

- [x] Replaceable OCR contract
- [x] Server-side OCR adapter in Edge Function
- [x] Page/block evidence persistence

## Phase 6 — AI engine

- [x] Strict shared extraction schema
- [x] Server-side provider adapter and prompt boundary
- [x] One bounded schema-regeneration retry and recoverable errors
- [x] Confidence/conflict handling

## Phase 7 — Verification

- [x] Confirm/edit/remove/add/uncertain flows
- [x] Source quote/page viewer and signed original-file access
- [x] Atomic verification persistence

## Phase 8 — Action plans

- [x] Requirements/actions/deadlines and acyclic dependencies
- [x] Dependency-aware next-action engine
- [x] Waiting-on workflow and activity history

## Phase 9 — Reminders

- [x] Permission handling
- [x] User-configurable default reminder lead time
- [x] Timezone-aware scheduling and explicit cancellation
- [x] Completion/archive/delete cancellation
- [ ] Automatic rescheduling after a timezone preference change

## Phase 10 — Search and vault

- [x] Keyword/full-text search across metadata, OCR, plans, tags, and deadlines
- [x] Rename/archive/delete/tag
- [x] Large-list virtualization

## Phase 11 — Offline and sync

- [x] Processed result cache
- [x] Waiting-for-connection queue and reconnect coordinator
- [ ] Reconnect idempotency tests

## Phase 12 — Polish

- [x] Haptic primary interactions
- [x] Typed English copy catalog and device-locale fallback boundary
- [ ] Extract remaining feature copy and add translated catalogs
- [ ] Reduced-motion audit
- [ ] Screen reader and dynamic-type audit
- [ ] Performance pass

## Phase 13 — Testing

- [x] Unit suite (auth validation, schemas/statuses, dates, timeline, reminders, and next-action dependencies)
- [ ] Integration suite
- [ ] Core-loop E2E suite
- [ ] Security audit

## Phase 14 — Release readiness

- [ ] Android development/release builds
- [ ] iOS build configuration
- [ ] Privacy and store metadata
- [x] Production web export
- [x] Production environment runbook
