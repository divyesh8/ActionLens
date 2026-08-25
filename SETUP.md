# Local Setup

## Requirements

- Node.js compatible with Expo SDK 57
- pnpm
- Android Studio for a local Android emulator, or a physical development-build device
- macOS/Xcode or EAS Build for iOS binaries
- Supabase project and Supabase CLI for authentication, database, storage, and deletion functions

## Configure

1. Copy `.env.example` to `.env.local`.
2. Set the public Supabase project URL and anonymous/publishable key.
3. Apply migrations with `supabase db push` against a development project.
4. Do **not** add `OPENAI_API_KEY`, `OPENAI_MODEL`, or `OPENAI_OCR_MODEL`. OCR and analysis run locally in the website and do not use paid AI APIs.
5. Deploy only the account/storage maintenance functions:

   ```sh
   supabase functions deploy delete-document
   supabase functions deploy delete-account
   ```

6. In Supabase Auth, set the site/deep-link redirect to `actionlens://reset-password` for password reset and verification callbacks.
7. Keep the `documents` bucket private; the migration creates it and installs owner-folder policies.
8. Install packages with `pnpm install`.

`pnpm web`, `pnpm web:dev`, and `pnpm build:web` automatically copy the Tesseract OCR engine, English recognition data, and PDF.js worker into the website. These files are served by the same Vercel deployment; no model CDN or AI API is contacted while a document is read and analyzed.

If the repository is inside a Windows OneDrive folder and Metro reports that package files visible in Explorer do not exist, run `pnpm fix:onedrive` after installing. It materializes only reparse-point files inside `node_modules/.pnpm`; the issue does not affect source files.

## Run and verify

```sh
pnpm start
pnpm web
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm doctor
```

Remote push notifications require a development build on Android. Local notifications remain testable where supported.

`pnpm web` uses a production-mode local preview. `pnpm web:dev` enables Expo's web development overlay, but its Lightning CSS native module may be blocked by Windows Application Control on managed machines.

For the web preview, `metro.config.js` includes SQLite WASM support and local cross-origin isolation headers. Any non-EAS host must serve the same `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers.
