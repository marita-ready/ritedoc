# RiteDoc Mobile App

React Native / Expo mobile app for ReadyCompliant support workers.

## Activation Model

The app uses a **one-time online activation** model — identical to the desktop app's offline licence activation:

1. Support worker receives a `MAC-XXXX-XXXX-XXXX` access code from their agency administrator
2. On first launch, the app shows the **Code Entry Screen**
3. Worker enters the code — the app makes **one online call** to `POST /api/mobile/verify-code`
4. On success, an `activation_token` is saved to **Expo SecureStore** (encrypted local storage)
5. From that point, **the app works fully offline** — no further network calls needed for activation

## Code Format

Mobile access codes follow the format: `MAC-XXXX-XXXX-XXXX`

- `MAC` prefix identifies them as Mobile Access Codes
- Three 4-character alphanumeric segments (no ambiguous chars: no O, 0, I, 1)
- Example: `MAC-A3B7-K9MN-PQ2R`

## Project Structure

```
mobile-app/
├── src/
│   ├── App.tsx                    # Root component — activation gate
│   ├── screens/
│   │   ├── CodeEntryScreen.tsx    # Code entry + verification UI
│   │   └── HomeScreen.tsx         # Post-activation home (placeholder)
│   ├── services/
│   │   ├── api.ts                 # API client — verify-code endpoint
│   │   └── activation.ts          # SecureStore persistence layer
│   └── utils/
│       └── device.ts              # Device ID for audit trail
├── app.json                       # Expo config
├── package.json
└── tsconfig.json
```

## Setup

```bash
cd mobile-app
npm install
npx expo start
```

## Configuration

Update the API URL in `app.json` under `extra.apiUrl` or set the `EXPO_PUBLIC_API_URL` environment variable:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://readycompliant-api.workers.dev"
    }
  }
}
```

Or in `src/services/api.ts`:

```typescript
export const API_BASE_URL = 'https://readycompliant-api.workers.dev';
```

## API Endpoint

The app calls one endpoint:

```
POST /api/mobile/verify-code
Content-Type: application/json

{
  "code": "MAC-XXXX-XXXX-XXXX",
  "device_id": "android:abc123"   // optional, for audit trail
}
```

**Success response:**
```json
{
  "success": true,
  "activation_token": "64-char-hex-token",
  "agency_name": "Sunrise Care Agency",
  "message": "Access code verified. Your app is now activated."
}
```

**Error responses:**
- `404` — Invalid code
- `400` — Already used / expired / revoked
- `400` — Invalid request format

## Building for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android

# Or with EAS Build
npx eas build --platform all
```
