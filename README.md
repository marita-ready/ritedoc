# RiteDoc

**RiteDoc** is a desktop application for NDIS support workers that rewrites raw progress notes into professional, audit-ready documentation aligned to NDIS Practice Standards.

RiteDoc is a **stateless, pass-through tool** — it stores no client data, no participant information, and no notes. You paste your raw observations, select a service cartridge, click Rewrite, and copy the output. Nothing is saved.

---

## How It Works

1. **Paste** your raw progress notes into the Rewrite Note screen
2. **Select** the NDIS service cartridge that matches the support type
3. **Choose** Quick or Deep processing mode
4. **Click Rewrite** — RiteDoc sends the note to the local Nanoclaw server for processing
5. **Copy** the compliance-ready output

RiteDoc uses a local language model running entirely on your machine via **Nanoclaw** — a Dockerized [llama.cpp](https://github.com/ggerganov/llama.cpp) server running **Phi-4-mini Q4_K_M**. No data leaves your device. No internet connection is required after initial setup.

---

## Processing Modes

| Mode | Description | Best For |
|---|---|---|
| **Quick** | Single-pass rewrite using the cartridge's compliance rules | Straightforward notes, fast turnaround |
| **Deep** | 3-stage pipeline: compliance analysis, rewrite, quality review | Complex notes, thorough compliance checking |

---

## Service Cartridges

RiteDoc includes 8 pre-loaded NDIS service cartridges, each with compliance rules, required fields, format templates, and tone guidelines based on NDIS Practice Standards and Quality Indicators:

- Daily Living (SIL/SDA)
- Community Participation
- Therapeutic Supports
- Behaviour Support
- Early Childhood Intervention
- Support Coordination
- Respite / Short Term Accommodation
- Employment Support

Cartridges can be toggled active or inactive in Settings.

---

## Prerequisites

Before running RiteDoc, ensure you have the following installed:

### 1. Node.js (v18 or later)

Download from [nodejs.org](https://nodejs.org) or use a version manager like `nvm`.

### 2. Rust (stable toolchain)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 3. Tauri system dependencies

**macOS:**
```bash
xcode-select --install
```

**Ubuntu / Debian:**
```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

**Windows:** Install the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### 4. Docker Desktop

Download from [docker.com](https://www.docker.com/products/docker-desktop/). Docker is required to run the Nanoclaw local inference server.

### 5. pnpm

```bash
npm install -g pnpm
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/marita-ready/ritedoc.git
cd ritedoc
git checkout tauri-scaffold
pnpm install
```

### 2. Set up Nanoclaw (local rewriting server)

Nanoclaw is the Dockerized llama.cpp server that powers the rewriting pipeline. It runs the **Phi-4-mini Q4_K_M** model locally with zero internet access at runtime.

#### Step 2a — Download the model (one-time, ~2.5 GB)

Download the Phi-4-mini Q4_K_M GGUF file from Hugging Face:

```
https://huggingface.co/microsoft/Phi-4-mini-instruct-gguf
```

Download the file named: `Phi-4-mini-instruct-Q4_K_M.gguf`

Place it in the `nanoclaw/models/` directory and rename it:

```bash
mkdir -p nanoclaw/models
mv ~/Downloads/Phi-4-mini-instruct-Q4_K_M.gguf nanoclaw/models/phi-4-mini-q4_k_m.gguf
```

#### Step 2b — Build the Docker image (one-time, ~5 minutes)

```bash
cd nanoclaw
docker compose build
cd ..
```

This compiles llama.cpp from source inside the container. No internet access is needed after this step.

#### Step 2c — Start the server

```bash
cd nanoclaw
docker compose up -d
```

Verify it is running:

```bash
curl http://localhost:8080/health
# Expected: {"status":"ok"}
```

The server runs on `http://localhost:8080`. RiteDoc connects to this URL automatically.

---

## Development

Start the Nanoclaw server first (see above), then:

```bash
pnpm tauri dev
```

Frontend only (browser, no Tauri APIs):

```bash
pnpm dev
```

---

## Production Build

Build the application for the current platform:

```bash
pnpm tauri build
```

Output is in `src-tauri/target/release/bundle/`:

| Platform | Output |
|---|---|
| Windows | `msi/RiteDoc_1.0.0_x64_en-US.msi` and `nsis/RiteDoc_1.0.0_x64-setup.exe` |
| macOS | `dmg/RiteDoc_1.0.0_x64.dmg` |
| Linux | `deb/ritedoc_1.0.0_amd64.deb` and `appimage/ritedoc_1.0.0_amd64.AppImage` |

---

## Configuration

On first launch, RiteDoc runs an onboarding flow to collect your name, organisation, role, and activate your service cartridges. These preferences are stored in a local SQLite database:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/com.ritedoc.app/ritedoc.db` |
| Windows | `%APPDATA%\com.ritedoc.app\ritedoc.db` |
| Linux | `~/.local/share/com.ritedoc.app/ritedoc.db` |

The database contains **only app configuration** (cartridge settings, user preferences). No client data is stored.

### Rewriting Engine Settings

Change the server URL in **Settings > Rewriting Engine** inside RiteDoc:

| Setting | Default |
|---|---|
| Server URL | `http://localhost:8080` |

Only change this if you have moved the Nanoclaw container to a different port or host.

---

## Project Structure

```
ritedoc/
├── src/                            # React frontend
│   ├── App.tsx                     # Root component, onboarding gate, router
│   ├── components/
│   │   ├── Logo.tsx                # App icon component
│   │   └── MainLayout.tsx          # Sidebar + content layout
│   ├── pages/
│   │   ├── onboarding/
│   │   │   ├── Welcome.tsx         # Step 1: Welcome screen
│   │   │   ├── Setup.tsx           # Step 2: Name, org, role
│   │   │   └── CartridgeSelect.tsx # Step 3: Activate cartridges
│   │   └── main/
│   │       ├── Home.tsx            # Dashboard
│   │       ├── NewNote.tsx         # Rewrite Note tool
│   │       └── Settings.tsx        # User settings and cartridge management
│   ├── lib/
│   │   └── commands.ts             # TypeScript wrappers for Tauri commands
│   └── styles/
│       ├── layout.css              # Sidebar and layout styles
│       └── onboarding.css          # Onboarding screen styles
│
├── src-tauri/                      # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs                 # Entry point
│   │   ├── lib.rs                  # App setup, command registration, DB init
│   │   ├── db.rs                   # SQLite database module
│   │   ├── commands.rs             # Tauri commands (cartridges, settings)
│   │   ├── cartridges.rs           # 8 pre-loaded NDIS cartridge seed data
│   │   └── pipeline.rs             # 3-stage rewriting pipeline (Nanoclaw)
│   ├── Cargo.toml                  # Rust dependencies
│   ├── tauri.conf.json             # Tauri configuration
│   ├── capabilities/               # Tauri permission capabilities
│   └── icons/                      # App icons
│
├── nanoclaw/                       # Dockerized llama.cpp server
│   ├── Dockerfile                  # llama.cpp build + runtime image
│   ├── docker-compose.yml          # Service definition
│   ├── README.md                   # Nanoclaw setup guide
│   └── models/                     # Place phi-4-mini-q4_k_m.gguf here
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | [Tauri 2.0](https://tauri.app) |
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v7 |
| Rust backend | Rust (stable) |
| Local database | SQLite via `rusqlite` (bundled) |
| HTTP client | `reqwest` with `rustls-tls` |
| Inference server | [llama.cpp](https://github.com/ggerganov/llama.cpp) (Dockerized via Nanoclaw) |
| Language model | [Phi-4-mini](https://huggingface.co/microsoft/Phi-4-mini-instruct-gguf) Q4_K_M (local, offline) |

---

## Privacy

- **Zero client data stored** — notes are processed and discarded; nothing is saved
- **Fully local** — all processing happens on the local machine; no data leaves the device
- **No internet required** — the rewriting engine runs entirely offline after initial setup
- **No telemetry** — RiteDoc does not collect or transmit any usage data

---

## License

Proprietary — all rights reserved.
