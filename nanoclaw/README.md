# Nanoclaw — Local LLM Server for RiteDoc

Nanoclaw is the local inference backend for RiteDoc. It runs the **Phi-4-mini Q4_K_M** model inside a Docker container using [llama.cpp](https://github.com/ggerganov/llama.cpp)'s built-in HTTP server.

Once running, it exposes a local HTTP endpoint at `http://localhost:8080` that RiteDoc's rewriting pipeline calls directly. **No internet connection is required at runtime.**

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- ~3 GB free RAM for the model
- ~2.5 GB disk space for the model file

---

## Setup (One-Time)

### Step 1 — Download the model

Download the Phi-4-mini Q4_K_M GGUF file from Hugging Face:

```
https://huggingface.co/microsoft/Phi-4-mini-instruct-gguf
```

Download the file named: `Phi-4-mini-instruct-Q4_K_M.gguf`

Place it in the `models/` directory inside this folder, renamed to:

```
nanoclaw/models/phi-4-mini-q4_k_m.gguf
```

The `models/` directory is excluded from git (see `.gitignore`).

### Step 2 — Build the Docker image

```bash
cd nanoclaw
docker compose build
```

This compiles llama.cpp from source. It takes a few minutes the first time. No internet access is needed after this step.

### Step 3 — Start the server

```bash
docker compose up -d
```

### Step 4 — Verify it is running

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{"status":"ok"}
```

---

## Usage

Once running, Nanoclaw serves the llama.cpp OpenAI-compatible HTTP API at:

```
http://localhost:8080
```

RiteDoc is pre-configured to use this URL. No additional configuration is needed.

To change the URL, go to **Settings > Rewriting Engine** in RiteDoc.

---

## Stopping the Server

```bash
docker compose down
```

---

## Configuration

Environment variables (set in `docker-compose.yml`):

| Variable | Default | Description |
|---|---|---|
| `MODEL_PATH` | `/models/phi-4-mini-q4_k_m.gguf` | Path to the GGUF model inside the container |
| `HOST` | `0.0.0.0` | Bind address |
| `PORT` | `8080` | HTTP port |
| `CTX_SIZE` | `4096` | Context window size (tokens) |
| `THREADS` | `4` | CPU threads for inference |
| `BATCH_SIZE` | `512` | Prompt batch size |

To use more CPU threads (for faster inference on higher-spec machines), edit `THREADS` in `docker-compose.yml`.

---

## Directory Structure

```
nanoclaw/
├── Dockerfile          # llama.cpp build + runtime image
├── docker-compose.yml  # Service definition
├── README.md           # This file
└── models/             # Place phi-4-mini-q4_k_m.gguf here (not in git)
```

---

## About the Model

**Phi-4-mini** is a compact, high-quality language model from Microsoft. The Q4_K_M quantisation provides a good balance of quality and performance on CPU hardware.

- Parameters: ~3.8B
- Quantisation: Q4_K_M (~2.5 GB)
- Context: 4096 tokens (sufficient for NDIS progress notes)
- Hardware: Runs on CPU; no GPU required
