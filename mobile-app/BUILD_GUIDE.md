# RiteDoc Mobile App — Build Guide

This guide covers everything needed to build, test, and submit the RiteDoc mobile app to the Apple App Store and Google Play Store using **Expo Application Services (EAS)**.

---

## Table of Contents

1. [Prerequisites and Accounts](#1-prerequisites-and-accounts)
2. [First-Time Setup](#2-first-time-setup)
3. [Development Builds](#3-development-builds)
4. [Preview / Internal Testing Builds](#4-preview--internal-testing-builds)
5. [Production Builds](#5-production-builds)
6. [Submitting to the App Store (iOS)](#6-submitting-to-the-app-store-ios)
7. [Submitting to Google Play (Android)](#7-submitting-to-google-play-android)
8. [Credentials Management](#8-credentials-management)
9. [Build Profiles Reference](#9-build-profiles-reference)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites and Accounts

### Required Accounts

| Account | Purpose | URL |
|---|---|---|
| **Expo / EAS** | Build infrastructure, credentials management | [expo.dev](https://expo.dev) |
| **Apple Developer Program** | iOS distribution, App Store submission | [developer.apple.com](https://developer.apple.com) — $99 USD/year |
| **Google Play Console** | Android distribution, Play Store submission | [play.google.com/console](https://play.google.com/console) — $25 USD one-time |

### Required Software

```bash
# Node.js 18+ and npm
node --version   # Should be 18.x or higher

# EAS CLI (install globally)
npm install -g eas-cli

# Verify installation
eas --version    # Should be 12.0.0 or higher
```

### App Identifiers

| Platform | Identifier |
|---|---|
| iOS Bundle ID | `com.readycompliant.ritedoc` |
| Android Package | `com.readycompliant.ritedoc` |
| App Name | RiteDoc |
| Version | 1.0.0 |

---

## 2. First-Time Setup

### Step 1 — Log in to EAS

```bash
cd mobile-app
eas login
# Enter your Expo account credentials
```

### Step 2 — Link the project to EAS

```bash
eas init
# This will generate a projectId and update app.json automatically.
# Replace "REPLACE_WITH_EAS_PROJECT_ID" in app.json with the generated ID.
```

### Step 3 — Install dependencies

```bash
npm install
```

### Step 4 — Set up credentials

EAS manages signing credentials automatically. Run the credentials wizard:

```bash
npm run update:credentials
# Or: eas credentials
```

For iOS, EAS can automatically create and manage:
- Distribution Certificate
- Provisioning Profiles (development, ad-hoc, App Store)

For Android, EAS will generate a keystore on first build and store it securely.

> **Important:** Never commit signing credentials, keystores, or `.p8`/`.p12` files to Git. EAS stores these securely in the cloud.

### Step 5 — Configure the submit profile in eas.json

Open `eas.json` and fill in the placeholders under `submit.production.ios`:

```json
"ios": {
  "appleId": "your@email.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDE12345"
}
```

- **appleId**: Your Apple Developer account email
- **ascAppId**: The numeric App Store Connect App ID (found in App Store Connect → App → App Information → Apple ID)
- **appleTeamId**: Your 10-character Apple Team ID (found at [developer.apple.com/account](https://developer.apple.com/account))

---

## 3. Development Builds

Development builds include the Expo Dev Client and are used for local development with hot reload.

### Android (APK — installs directly on device or emulator)

```bash
npm run build:dev:android
# Or: eas build --profile development --platform android
```

The APK is downloaded and installed directly. No Play Store account needed.

### iOS (Simulator build)

```bash
npm run build:dev:ios
# Or: eas build --profile development --platform ios
```

This produces a `.app` bundle for the iOS Simulator. To run it:

```bash
# After the build completes, EAS will provide a download URL.
# Download the .tar.gz, extract it, then drag the .app into the Simulator.
```

> **Note:** Simulator builds cannot run on physical iOS devices. For device testing, use the Preview profile.

---

## 4. Preview / Internal Testing Builds

Preview builds are release-mode builds distributed internally (no app store listing required). Use these for QA and stakeholder testing.

### Android (APK — share via link or QR code)

```bash
npm run build:preview:android
# Or: eas build --profile preview --platform android
```

EAS provides a shareable download link. Testers need to enable "Install from unknown sources" on Android.

### iOS (Ad-hoc / TestFlight)

```bash
npm run build:preview:ios
# Or: eas build --profile preview --platform ios
```

For iOS preview distribution, you have two options:

**Option A — Ad-hoc (up to 100 registered devices):**
Register tester device UDIDs via `eas device:create`, then rebuild.

**Option B — TestFlight (recommended for broader testing):**
Use the production profile and submit to TestFlight before releasing publicly.

---

## 5. Production Builds

Production builds are optimised, signed, and ready for store submission.

### Android (AAB — required for Play Store)

```bash
npm run build:production:android
# Or: eas build --profile production --platform android
```

Produces a `.aab` (Android App Bundle). The `autoIncrement: true` setting in `eas.json` automatically increments `versionCode` on each production build.

### iOS (IPA — required for App Store)

```bash
npm run build:production:ios
# Or: eas build --profile production --platform ios
```

Produces a signed `.ipa` file. The `autoIncrement: true` setting automatically increments `buildNumber` on each production build.

### Both Platforms at Once

```bash
npm run build:production:all
# Or: eas build --profile production --platform all
```

---

## 6. Submitting to the App Store (iOS)

### Prerequisites

1. Create the app in [App Store Connect](https://appstoreconnect.apple.com):
   - Go to **My Apps → +** → **New App**
   - Platform: iOS
   - Name: RiteDoc
   - Bundle ID: `com.readycompliant.ritedoc`
   - SKU: `ritedoc-ios`
2. Fill in `eas.json` submit profile with your `appleId`, `ascAppId`, and `appleTeamId`

### Submit via EAS

```bash
npm run submit:ios
# Or: eas submit --profile production --platform ios
```

EAS will upload the latest production build to App Store Connect automatically.

### App Store Listing Checklist

Before submitting for review, complete the following in App Store Connect:

- [ ] App name and subtitle
- [ ] Description (what the app does, who it's for)
- [ ] Keywords
- [ ] Support URL: `https://readycompliant.com`
- [ ] Privacy Policy URL: `https://readycompliant.com/privacy`
- [ ] Screenshots (required sizes: 6.7", 6.5", 5.5" iPhone; 12.9" iPad if applicable)
- [ ] App Preview video (optional but recommended)
- [ ] Age rating: 4+ (no objectionable content)
- [ ] Content rights declaration
- [ ] Encryption declaration: Set `ITSAppUsesNonExemptEncryption: false` in `app.json` (already done)
- [ ] Export compliance: No encryption beyond standard HTTPS

### Privacy Manifest (Required from May 2024)

The `privacyManifests` section in `app.json` is already configured with the required API usage reasons for:
- `NSUserDefaults` (used by AsyncStorage / SecureStore)
- File timestamps (used by expo-file-system)
- Disk space (used by the model file manager)

---

## 7. Submitting to Google Play (Android)

### Prerequisites

1. Create the app in [Google Play Console](https://play.google.com/console):
   - Go to **All apps → Create app**
   - App name: RiteDoc
   - Default language: English (Australia)
   - App or game: App
   - Free or paid: Free
2. Create a **Service Account** for automated submission:
   - Go to **Setup → API access** in Play Console
   - Link to a Google Cloud project
   - Create a service account with **Release Manager** role
   - Download the JSON key file
   - Save it as `google-play-service-account.json` in the `mobile-app/` directory
   - **Do not commit this file to Git** (it is in `.gitignore` and `.easignore`)

### Submit via EAS

```bash
npm run submit:android
# Or: eas submit --profile production --platform android
```

The first submission must be done manually via the Play Console (upload the `.aab` directly). Subsequent submissions can use EAS Submit.

### Google Play Listing Checklist

- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Screenshots (phone: min 2, tablet: optional)
- [ ] Feature graphic (1024×500)
- [ ] App icon (512×512)
- [ ] Content rating questionnaire
- [ ] Privacy policy URL: `https://readycompliant.com/privacy`
- [ ] Data safety form (declare: no data collected or shared)
- [ ] Target audience: 18+ (NDIS support workers)

---

## 8. Credentials Management

### iOS Credentials

EAS manages iOS credentials automatically. To view or update:

```bash
eas credentials --platform ios
```

EAS stores:
- **Distribution Certificate** — signs the app binary
- **Provisioning Profiles** — authorises the app to run on devices/App Store

### Android Credentials

EAS generates and stores the Android keystore on first build.

> **Critical:** The Android keystore is permanent. If you lose it, you cannot update the app on the Play Store. EAS stores it securely, but you should also download a backup:

```bash
eas credentials --platform android
# Select "Download keystore"
# Store the downloaded .jks file in a secure location (password manager, encrypted drive)
```

### Environment Variables / Secrets

Sensitive values (API keys, etc.) should be set as EAS secrets rather than committed to the repo:

```bash
eas secret:create --scope project --name API_URL --value "https://readycompliant-api.workers.dev"
eas secret:list
```

---

## 9. Build Profiles Reference

| Script | Profile | Platform | Output | Use Case |
|---|---|---|---|---|
| `build:dev:android` | development | Android | APK (debug) | Local dev with hot reload |
| `build:dev:ios` | development | iOS | .app (simulator) | Local dev on iOS Simulator |
| `build:preview:android` | preview | Android | APK (release) | Internal QA testing |
| `build:preview:ios` | preview | iOS | IPA (ad-hoc) | Internal QA on physical devices |
| `build:production:android` | production | Android | AAB | Google Play submission |
| `build:production:ios` | production | iOS | IPA | App Store submission |
| `build:production:all` | production | Both | AAB + IPA | Submit both at once |

---

## 10. Troubleshooting

### "llama.rn requires New Architecture"

`llama.rn` v0.12+ requires the React Native New Architecture (Fabric/JSI). Before building for production:

1. Enable New Architecture in `app.json`:
   ```json
   "android": { "newArchEnabled": true },
   "ios": { "newArchEnabled": true }
   ```
2. Ensure `llama.rn` is at a stable release (not RC) before App Store submission.

### "Model file not found" on device

The Gemma 2B GGUF model is **not bundled in the app binary** (it is 1.7 GB — far too large for App Store review). See `MODEL_SETUP.md` for the recommended model delivery strategy (on-demand download on first launch).

### "google-services.json not found" build error

For push notifications on Android, a `google-services.json` file from Firebase is required. If you are not using push notifications in the current release, remove `expo-notifications` from the plugins array in `app.json` to bypass this requirement.

### Build fails with "requireCommit" error

`eas.json` has `"requireCommit": true` — all changes must be committed before running a build. Run:

```bash
git add -A && git commit -m "chore: pre-build commit"
```

### Checking build status

```bash
eas build:list
eas build:view [BUILD_ID]
```

---

## Version Bump Workflow

When releasing a new version:

1. Update `version` in `app.json` (e.g., `"1.0.1"`)
2. The `autoIncrement: true` in `eas.json` handles `buildNumber` (iOS) and `versionCode` (Android) automatically
3. Commit the version bump: `git commit -m "chore: bump version to 1.0.1"`
4. Run the production build: `npm run build:production:all`
5. Submit: `npm run submit:ios && npm run submit:android`

---

*Last updated: April 2026 — RiteDoc v1.0.0*
