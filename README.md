# ActionLens

**Turn anything important into action.**

ActionLens is an Expo app that securely imports documents, extracts evidence-backed obligations, asks the user to verify every finding, and persists a practical action plan with deadlines and reminders. The source document always remains authoritative; locally extracted findings are drafts until the user confirms them.

## Architecture

The Expo SDK 57 client uses Expo Router, TypeScript, TanStack Query, Zustand, SecureStore, SQLite, and local notifications. On the website, self-hosted Tesseract.js and PDF.js read documents in the browser; a deterministic local analyzer produces schema-validated findings without an AI/model API key. Supabase provides email authentication, private Storage, PostgreSQL with RLS, transactional verification RPCs, and JWT-protected deletion functions.

The core flow is:

```text
camera/photo/PDF/text -> browser-local OCR and analysis -> private sync
  -> OCR pages/evidence -> structured draft -> user verification
  -> transactional plan -> reminders, next actions, history, and search
```

## Install and configure

```sh
pnpm install
```

Copy `.env.example` to `.env.local`, configure the two public Supabase values, apply the migrations, and deploy the two deletion functions. No OpenAI/model/OCR API key is needed. The exact commands and Auth redirect configuration are in [SETUP.md](./SETUP.md).

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
