# RiteDoc Mobile App — On-Device AI Model Setup

This document explains how to set up the Gemma 2B model for on-device note rewriting in the RiteDoc mobile app.

## Overview

RiteDoc uses a **Gemma 2 2B Instruct** model running entirely on-device via [llama.rn](https://github.com/mybigday/llama.rn) (a React Native binding for llama.cpp). The model rewrites raw support worker notes into professional, NDIS-compliant progress notes — fully offline, with no cloud or server dependency.

| Property | Value |
|---|---|
| Model | Gemma 2 2B Instruct |
| Format | GGUF (llama.cpp native) |
| Quantization | Q4_K_M (4-bit) |
| File size | ~1.7 GB |
| Runtime | llama.rn (llama.cpp) |
| Acceleration | Metal (iOS), OpenCL (Android) |

## Step 1: Download the Model

Download the GGUF model file from HuggingFace:

**Recommended source:** [bartowski/gemma-2-2b-it-GGUF](https://huggingface.co/bartowski/gemma-2-2b-it-GGUF)

Direct download link:
```
https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf
```

The file should be named: `gemma-2-2b-it-Q4_K_M.gguf`

Alternative sources (same model, same format):
- [lmstudio-community/gemma-2-2b-it-GGUF](https://huggingface.co/lmstudio-community/gemma-2-2b-it-GGUF)
- [unsloth/gemma-2-it-GGUF](https://huggingface.co/unsloth/gemma-2-it-GGUF)

## Step 2: Place the Model File

The model file must be available in the app's document directory at runtime. There are two approaches depending on your deployment strategy:

### Option A: Bundle with the App (Recommended for Distribution)

For production builds, the model should be bundled as a native asset so it is available immediately after install.

**iOS (Xcode):**
1. Add the `.gguf` file to your Xcode project
2. Ensure it is included in the "Copy Bundle Resources" build phase
3. At app startup, copy it from the bundle to the documents directory:
   ```
   Documents/models/gemma-2-2b-it-Q4_K_M.gguf
   ```

**Android:**
1. Place the file in `android/app/src/main/assets/models/`
2. At app startup, copy it from assets to the app's files directory:
   ```
   /data/data/com.readycompliant.ritedoc/files/models/gemma-2-2b-it-Q4_K_M.gguf
   ```

> **Note:** Due to the 1.7 GB file size, bundling will significantly increase the app download size. Consider Option B for initial development or if you plan to implement on-demand download.

### Option B: Manual Placement for Development

For development and testing, you can push the model file directly to the device:

**iOS Simulator:**
```bash
# Find the app's Documents directory
xcrun simctl get_app_container booted com.readycompliant.ritedoc data

# Create models directory and copy file
mkdir -p <documents_path>/models/
cp gemma-2-2b-it-Q4_K_M.gguf <documents_path>/models/
```

**Android Emulator / Device:**
```bash
# Create the models directory
adb shell mkdir -p /data/data/com.readycompliant.ritedoc/files/models/

# Push the model file
adb push gemma-2-2b-it-Q4_K_M.gguf /data/data/com.readycompliant.ritedoc/files/models/
```

**Expo Development Build:**
```bash
# For Expo, the documents directory is accessible via expo-file-system
# The model should be placed at:
# iOS:  <App>/Documents/models/gemma-2-2b-it-Q4_K_M.gguf
# Android: <App>/files/models/gemma-2-2b-it-Q4_K_M.gguf
```

## Step 3: Install Dependencies

The app requires the following packages for on-device inference:

```bash
cd mobile-app
npm install llama.rn expo-file-system expo-clipboard
```

### Expo Configuration

The `llama.rn` Expo config plugin must be added to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "llama.rn",
        {
          "enableEntitlements": true,
          "entitlementsProfile": "production",
          "forceCxx20": true,
          "enableOpenCL": true
        }
      ]
    ]
  }
}
```

### New Architecture

`llama.rn` v0.10+ requires React Native's New Architecture. For Expo SDK 51+, enable it in `app.json`:

```json
{
  "expo": {
    "newArchEnabled": true
  }
}
```

Or use `expo-build-properties`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": { "newArchEnabled": true },
          "android": { "newArchEnabled": true }
        }
      ]
    ]
  }
}
```

### iOS Additional Setup

After installing, run:
```bash
npx pod-install
```

### Android Additional Setup

Add proguard rules if proguard is enabled (`android/app/proguard-rules.pro`):
```
# llama.rn
-keep class com.rnllama.** { *; }
```

## Step 4: Build the App

Since `llama.rn` includes native code, you must use a **development build** (not Expo Go):

```bash
# Create a development build
npx expo prebuild
npx expo run:ios    # or run:android

# Or use EAS Build
eas build --platform ios --profile development
eas build --platform android --profile development
```

## Architecture

```
WriteNoteScreen
  └── useRewriter (hook)
        └── modelManager (singleton)
              ├── llama.rn / initLlama()
              ├── context.completion() — inference
              └── config.ts — model params
                    └── prompts.ts — NDIS system prompt
```

### File Structure

```
src/services/llm/
├── index.ts          — Barrel exports
├── config.ts         — Model configuration constants
├── prompts.ts        — NDIS rewrite system & user prompts
├── modelManager.ts   — Singleton model lifecycle manager
└── modelFiles.ts     — File system utilities for model files

src/hooks/
└── useRewriter.ts    — React hook for components
```

### How It Works

1. User types raw notes in `WriteNoteScreen`
2. User taps "Rewrite Note"
3. `useRewriter` hook calls `modelManager.ensureLoaded()` (loads model on first use)
4. `modelManager.rewriteNote()` sends the raw text through the Gemma 2B model with an NDIS-specific system prompt
5. Tokens stream back in real-time via the `onToken` callback
6. The rewritten note is displayed for the user to copy/paste

### Model Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Context size | 2048 tokens | Sufficient for note input + output |
| GPU layers | 99 | Full GPU offload where available |
| Max predict | 1024 tokens | Headroom for longer notes |
| Temperature | 0.3 | Low for consistent, professional output |
| Top-p | 0.9 | Focused generation |
| Repeat penalty | 1.1 | Avoid repetitive phrasing |

## Important Notes

- The `.gguf` model file (~1.7 GB) is **NOT committed to Git** — it must be obtained separately
- The model runs entirely on-device — no internet connection is required after installation
- First model load takes 5–15 seconds depending on device; subsequent loads are faster
- GPU acceleration is automatic on supported devices (Metal on iOS, OpenCL on Android)
- The model is kept in memory after first load for fast subsequent rewrites
- Memory usage is approximately 1.5–2 GB when the model is loaded

## Troubleshooting

**"Model file not found" error:**
- Verify the file exists at the expected path (see Step 2)
- Check file permissions
- Ensure the filename matches exactly: `gemma-2-2b-it-Q4_K_M.gguf`

**Slow inference:**
- Ensure GPU acceleration is working (check `n_gpu_layers` in logs)
- On Android, OpenCL requires Qualcomm Adreno 700+ GPU
- Reduce `n_ctx` if memory is constrained

**App crashes on model load:**
- The device may not have enough RAM (need ~2 GB free)
- Try a smaller quantization (Q3_K_S) if available
- Check that New Architecture is enabled

**Build errors with llama.rn:**
- Ensure New Architecture is enabled in `app.json`
- Run `npx pod-install` after installing on iOS
- Check that the Expo config plugin is properly configured
