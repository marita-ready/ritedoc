# RiteDoc Hardware Detection Specification

This technical specification details the automated hardware profiling system built into the RiteDoc Tauri backend (Rust). This system is responsible for determining the optimal processing mode (Standard vs. Turbo) on the client's machine to ensure stability and performance.

## 1. Purpose and Trigger

The hardware detection routine is designed to prevent the local AI model (Phi-4-mini Q4_K_M via llama.cpp) from crashing due to insufficient resources, particularly Out-Of-Memory (OOM) errors.

*   **Trigger:** The routine runs automatically on the first launch of the RiteDoc application and subsequently on every application startup before the compliance engine is initialised.
*   **Execution:** The profiling is performed silently in the background by the Rust backend.

## 2. Detection Metrics

The Rust backend utilises system-level APIs (e.g., via crates like `sysinfo`) to gather three primary metrics.

### 2.1 Total System RAM

The total physical memory installed on the host machine. This is the most critical metric for determining the number of AI agents that can run concurrently.

### 2.2 CPU Architecture and Cores

The processor type (e.g., x86_64, ARM64) and the number of logical cores available. This influences the thread allocation for the llama.cpp inference engine.

### 2.3 GPU Presence and VRAM (Optional but Preferred)

The system attempts to detect the presence of a dedicated Graphics Processing Unit (GPU) and its available Video RAM (VRAM). If a compatible GPU (e.g., NVIDIA CUDA, Apple Metal) is detected, inference can be significantly accelerated.

## 3. Processing Mode Selection Logic

Based on the gathered metrics, the system applies a strict threshold logic to select the appropriate processing mode.

### 3.1 Turbo Mode (3-Agent Pipeline)

Turbo Mode is the preferred state, offering the fastest processing times by running three distinct AI agents concurrently (Rewrite, Red Flag Scan, Audit + Score).

*   **Thresholds:**
    *   Total System RAM must be **greater than or equal to 32GB**.
    *   *OR*
    *   A dedicated GPU with **at least 8GB of VRAM** is detected.
*   **Action:** If these conditions are met, the system configures llama.cpp to load the model into VRAM (if available) or allocates sufficient system RAM for three concurrent inference contexts.

### 3.2 Standard Mode (2-Agent Pipeline)

Standard Mode is the fallback state, designed for typical office hardware (the "Aroha-spec"). It combines the Rewrite and Red Flag Scan tasks into a single agent to conserve memory.

*   **Thresholds:**
    *   Total System RAM is **between 16GB and 31GB**.
    *   *AND*
    *   No dedicated GPU (or a GPU with insufficient VRAM) is detected.
*   **Action:** The system configures llama.cpp to allocate memory for only two concurrent inference contexts.

### 3.3 Minimum Requirements Failure

If the host machine does not meet the minimum requirements for Standard Mode, the application cannot function reliably.

*   **Thresholds:**
    *   Total System RAM is **less than 16GB**.
*   **Action:** The hardware detection routine halts the startup process. The Tauri frontend displays a clear, plain-English error message explaining that the computer does not have enough memory to run the compliance engine. A support ticket is automatically generated in Supabase logging the hardware failure.

## 4. Dynamic Downgrading (Self-Fix)

The hardware detection is not static. The system continuously monitors available RAM during processing.

If the application is running in Turbo Mode and detects that available RAM has dropped dangerously low (e.g., due to the user opening other memory-intensive applications), the Tauri Self-Fix system will intervene.

1.  It will pause the current processing batch.
2.  It will automatically downgrade the configuration to Standard Mode (2 agents).
3.  It will notify the user via the frontend UI that the mode has been adjusted to maintain stability.
4.  It will resume processing the batch.
