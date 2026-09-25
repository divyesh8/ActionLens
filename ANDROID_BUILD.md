# ActionLens Android builds

## Release identity

- Application name: `ActionLens`
- Android package: `app.actionlens.mobile`
- App version: `1.0.1`
- Android version code: `2`
- Expo SDK: `57`
- Installable APK profile: `apk`
- Google Play App Bundle profile: `production`

The package identifier is the existing intentional identifier shared with the iOS bundle configuration. Do not change it after distributing builds. Increment `expo.android.versionCode` for every Android release and update `expo.version` when the user-facing version changes. Never decrease either value.

## Current signed APK

- EAS build ID: `c0c3fbef-118f-48f4-83f3-53cecc2a2864`
- EAS build page: <https://expo.dev/accounts/divyesshh/projects/actionlens/builds/c0c3fbef-118f-48f4-83f3-53cecc2a2864>
- Local artifact: `release/ActionLens-v1.0.1.apk`
- File size: `110,538,349` bytes (`105.42 MiB`)
- File SHA-256: `E8CC8D0E6297A802ED8180ADC18FA9F2B8BD146E345794EF91D7A92A8F9327DA`
- Signing: EAS-managed Android keystore, one RSA-2048 signer, APK Signature Scheme v2
- Signing-certificate SHA-256: `6e2b089544399ff70222793cf635799d165e51b5d04ebd1698bbd4223ca25dfb`

The APK was cryptographically verified with Android Build Tools 36 `apksigner`. Its embedded manifest reports package `app.actionlens.mobile`, label `ActionLens`, version `1.0.1`, version code `2`, minimum SDK 24, and target SDK 36. The release bundle is embedded and does not require Expo Go or Metro.

The artifact is a universal APK containing `arm64-v8a`, `armeabi-v7a`, `x86`, and `x86_64`; most of its size is the four copies of React Native, Hermes, SQLite, and other native libraries. No website Tesseract/PDF.js OCR asset payload is present in the APK.

## Required production environment

The client requires these public EAS production-environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Only the public Supabase project URL and anonymous/publishable key belong in the application bundle. Never add service-role credentials, database passwords, private AI keys, or other server secrets to `EXPO_PUBLIC_*` variables or the APK. Android image/PDF OCR calls the authenticated `process-document` service; its provider credentials remain server-side in Supabase.

Configure the Supabase Auth redirect allow list for the app's existing `actionlens` scheme, including the password-reset callback. See `SETUP.md` for the current callback paths.

## Build an installable signed APK

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Authenticate the EAS CLI with the Expo account that owns the existing ActionLens project: `pnpm dlx eas-cli login`.
3. Confirm the project link and account before allowing EAS to initialize anything: `pnpm dlx eas-cli project:info`.
4. Confirm that both public variables exist in the EAS `production` environment: `pnpm dlx eas-cli env:list --environment production`.
5. Run the checks:

   ```sh
   pnpm dlx expo-doctor@latest
   pnpm typecheck
   pnpm lint
   pnpm test
   ```

6. Build the standalone release APK:

   ```sh
   pnpm dlx eas-cli build --platform android --profile apk
   ```

The `apk` profile uses `android.buildType: apk` and does not enable a development client, so the installed binary contains its production JavaScript bundle and does not require Expo Go or a Metro development server.

Use the Android keystore already associated with the ActionLens EAS project. If the project has never had Android credentials, allow EAS to generate and manage the first keystore. Never commit a `.jks`, `.keystore`, credential JSON file, or signing password.

## Download and install

Download the completed artifact into `release/` without changing its binary contents and name it:

```text
release/ActionLens-v1.0.1.apk
```

Install it on a USB-debugging-enabled device with:

```sh
adb install -r release/ActionLens-v1.0.1.apk
```

Alternatively, transfer the APK to the device and open it from Android's file manager. The `release/*.apk` path is ignored by Git.

## Future builds

For a later direct-install release, increment the version fields in `app.json`, update the artifact name, rerun the checks, and build with the `apk` profile.

For a future Google Play build, increment the version first and create an Android App Bundle with:

```sh
pnpm dlx eas-cli build --platform android --profile production
```

The `production` profile intentionally produces an `.aab`; keep the `apk` profile for physical-device installation and internal sharing.

## Verification limitations

The build environment used for this artifact did not have Android SDK/ADB device tooling or a connected physical Android device. Installation, launch, authentication, camera, picker, upload, reminder, persistence, and deletion flows therefore require physical-device smoke testing before wider distribution.

Version `1.0.1` changes Android ingestion to upload the in-memory `ArrayBuffer` using the supported Supabase React Native path and routes OCR/analysis through the authenticated server processor. Web ingestion continues to use local browser OCR. Production records confirm that the configured processor can take an uploaded PNG through `awaiting_verification`, but the exact `1.0.1` capture, upload, processor, review, and retry flows still require a final smoke test on the user's physical Android device.
