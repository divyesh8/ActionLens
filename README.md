# ActionLens

**Turn anything important into action.**

ActionLens is an Expo mobile app that securely imports documents, extracts evidence-backed obligations, asks the user to verify every finding, and persists a practical action plan with deadlines and reminders. The source document always remains authoritative; AI findings are drafts until the user confirms them.

## Architecture

The Expo SDK 57 client uses Expo Router, TypeScript, TanStack Query, Zustand, SecureStore, SQLite, and local notifications. Supabase provides email authentication, private Storage, PostgreSQL with RLS, transactional verification RPCs, and JWT-protected Edge Functions. The server-side OCR and analysis adapters call the OpenAI Responses API through strict Zod-derived schemas; privileged keys never enter the app bundle.

The core flow is:

```text
camera/photo/PDF/text -> private upload -> durable processing job
  -> OCR pages/evidence -> structured analysis -> user verification
  -> transactional plan -> reminders, next actions, history, and search
```

## Install and configure

```sh
pnpm install
```

Copy `.env.example` to `.env.local`, configure the public Supabase values, apply the migration, set the server-only Edge Function secrets, and deploy the three functions. The exact commands and Auth redirect configuration are in [SETUP.md](./SETUP.md).

## Run and test

```sh
pnpm start
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
```

Windows OneDrive users can run `pnpm fix:onedrive` if Metro sees package reparse points as missing files.

## Project documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system boundaries, state machine, offline behavior
- [DATABASE.md](./DATABASE.md) — entities, ownership, RLS, search, and deletion
- [AI_PIPELINE.md](./AI_PIPELINE.md) — OCR/analysis contracts and evidence rules
- [SECURITY.md](./SECURITY.md) — threat model and release audit
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) — verified code paths and open live gates
- [RELEASE.md](./RELEASE.md) — device, backend, privacy, and store-readiness gates

## Release status

Static checks, unit tests, and the production web export pass in this repository. A real Supabase migration/deployment, two-user RLS tests, device-level core-loop E2E, notification checks, accessibility audit, and Android/iOS release builds remain required before publishing; see the checklist for the authoritative status.
