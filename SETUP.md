# Local Setup

## Requirements

- Node.js compatible with Expo SDK 57
- pnpm
- Android Studio for a local Android emulator, or a physical development-build device
- macOS/Xcode or EAS Build for iOS binaries
- Supabase project and Supabase CLI for database/Edge Function work

## Configure

1. Copy `.env.example` to `.env.local`.
2. Set the public Supabase project URL and anonymous/publishable key.
3. Apply migrations with `supabase db push` against a development project.
4. Configure Edge Function secrets separately; never put them in the Expo environment file:

   ```sh
   supabase secrets set OPENAI_API_KEY=... OPENAI_MODEL=... OPENAI_OCR_MODEL=...
   ```

   Both configured models must support the Responses API and strict structured output. The OCR model must also accept images and PDF file inputs.

5. Deploy the functions:

   ```sh
   supabase functions deploy process-document
   supabase functions deploy delete-document
   supabase functions deploy delete-account
   ```

6. In Supabase Auth, set the site/deep-link redirect to `actionlens://reset-password` for password reset and verification callbacks.
7. Keep the `documents` bucket private; the migration creates it and installs owner-folder policies.
8. Install packages with `pnpm install`.

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
