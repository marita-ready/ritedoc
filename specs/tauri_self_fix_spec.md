# RiteDoc Tauri Self-Fix System Specification

This technical specification details the automated self-diagnosis and self-healing capabilities built into the RiteDoc Tauri backend (Rust). This system is the first line of defense in the automated support flow, designed to resolve common issues silently without user intervention.

## 1. System Architecture

The Self-Fix system operates as a background daemon within the Tauri application lifecycle. It continuously monitors key system health metrics and intercepts specific error states before they are surfaced to the user interface.

### 1.1 Core Components

*   **Health Monitor:** A Rust thread that periodically polls system resources (RAM, Disk) and application state (Model loaded, Network connectivity).
*   **Error Interceptor:** Hooks into the application's error handling pathways (e.g., catching a `ModelLoadError` from llama.cpp).
*   **Action Engine:** Executes predefined remediation scripts based on the diagnosed issue.
*   **Telemetry Logger:** Records all diagnoses and actions to the local application logs and syncs them to the Supabase `support_tickets` table.

## 2. Diagnostic Checks and Remediation

The system is programmed to handle specific, known failure modes.

### 2.1 Model Loading Failure

*   **Diagnosis:** The application attempts to initialise the local AI model (Phi-4-mini Q4_K_M) via llama.cpp, but the process fails or returns an invalid checksum.
*   **Self-Fix Action:**
    1.  The system identifies the model file as corrupted or missing.
    2.  It silently deletes the existing model file from the local application data directory.
    3.  It initiates a background download of a fresh, verified copy of the model from the secure ReadyCompliant server.
    4.  The UI displays a "Downloading Compliance Engine Updates..." message, masking the error as a routine update.
*   **Escalation:** If the download fails three consecutive times (e.g., due to persistent network issues), the system escalates to the Dify bot.

### 2.2 Insufficient RAM (Out-Of-Memory Risk)

*   **Diagnosis:** The Health Monitor detects that available system RAM has dropped below the safe threshold required for the current processing mode (Standard or Turbo) while a batch of notes is being processed.
*   **Self-Fix Action:**
    1.  The system pauses the current processing queue.
    2.  It forces a garbage collection cycle within the Rust backend to free up any unreferenced memory.
    3.  If the application is running in Turbo Mode (3 agents), it automatically downgrades the configuration to Standard Mode (2 agents) to reduce the memory footprint.
    4.  It resumes processing the queue.
    5.  The UI displays a non-intrusive notification: "Processing mode adjusted to maintain stability."
*   **Escalation:** If the system is already in Standard Mode and RAM remains critically low, it halts processing and escalates to the Dify bot, prompting the user to close other applications.

### 2.3 Low Disk Space

*   **Diagnosis:** The Health Monitor detects that the available space on the primary storage drive has fallen below the minimum required for processing temporary files and exporting CSVs (e.g., < 1GB).
*   **Self-Fix Action:**
    1.  The system immediately triggers the 48-hour auto-delete policy, regardless of the elapsed time, purging all previously processed drafts and temporary files from the local cache.
    2.  It clears any downloaded, outdated compliance cartridges.
*   **Escalation:** If clearing the cache does not free up sufficient space, the system halts processing and escalates to the Dify bot, instructing the user to free up disk space manually.

### 2.4 Licence Validation Failure (Network Issue)

*   **Diagnosis:** The application attempts its periodic ping to the Supabase database to validate the licence key, but the network request times out or fails.
*   **Self-Fix Action:**
    1.  The system assumes a transient network error rather than an invalid key.
    2.  It implements an exponential backoff retry strategy (e.g., retry after 5 seconds, then 15 seconds, then 30 seconds).
    3.  During this retry period, the application relies on the locally cached licence status (valid for up to 7 days offline).
*   **Escalation:** If the validation fails continuously for 7 days, the local cache expires, and the application locks, escalating to the Dify bot to prompt the user to check their internet connection.

## 3. Telemetry and Logging

Every action taken by the Self-Fix system is meticulously logged.

1.  **Local Logging:** Detailed technical logs are written to the local file system for debugging purposes (accessible via the "Export Diagnostic Logs" feature in the UI).
2.  **Supabase Sync:** When a self-fix is attempted, a silent support ticket is created in Supabase.
    *   If the fix is successful, the ticket is immediately marked as "Resolved (Auto)".
    *   If the fix fails and escalates to Dify, the ticket status is updated to "Open (Dify)", providing the bot with the full context of the failed automated attempts.
