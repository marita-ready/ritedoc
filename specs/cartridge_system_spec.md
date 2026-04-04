# RiteDoc Cartridge System Specification

## 1. Overview

RiteDoc is an offline Tauri 2.0 desktop application designed to rewrite NDIS support worker progress notes into audit-prepared drafts. To maintain a single, universal application engine while supporting diverse regional compliance requirements, RiteDoc employs a "Cartridge System." 

A cartridge is a lightweight collection of JSON files containing region-specific rules, keywords, red flags, rubrics, policies, and system prompts. By swapping the data cartridge, the application can instantly adapt to different regions or countries (e.g., Victoria NDIS, Queensland NDIS, UK, USA) without requiring changes to the core Rust backend or React frontend.

This specification details the architecture, loading mechanism, update process, and contents of the RiteDoc Cartridge System.

## 2. Folder Structure

The cartridge files are stored locally on the user's machine. During development, they reside in `src-tauri/cartridges/`. In production, they are downloaded and stored in the application's resource directory or app data directory.

The standard folder layout for a region (e.g., `VIC_NDIS`) contains the following files:

```text
cartridges/
├── policies.json
├── red_flags_v2.json
├── rubric_v2.json
└── system_prompts.json
```

### File Purposes

*   **`policies.json`**: Contains the overarching legislative and practice standards for the region. For the NDIS, this includes the NDIS Practice Standards, Code of Conduct, reporting timeframes, and specific documentation requirements (e.g., PACE system rules).
*   **`red_flags_v2.json`**: Defines critical incidents, compliance breaches, and safety concerns. It includes categories (e.g., Unauthorised Restrictive Practice), severity levels, and specific keywords that the AI agents scan for within the notes.
*   **`rubric_v2.json`**: Outlines the scoring system used to evaluate the quality and compliance of a progress note. It defines the core pillars (e.g., Goal Linkage, Participant Voice, Measurable Outcomes, Support Delivered, Risk & Safety), scoring criteria (0-3), and the rules for determining the final Traffic Light status (Green, Orange, Red).
*   **`system_prompts.json`**: Contains the exact instructions and personas for the AI agents (e.g., Standard Agent 1, Turbo Agent 1, Turbo Agent 2, Turbo Agent 3). This ensures the agents speak the correct regulatory language and follow the specific formatting rules for the region.

## 3. Startup Loading

When the RiteDoc application launches, the Tauri backend (Rust) initializes the application state and attempts to load the cartridge files.

1.  **Path Resolution**: The `load_cartridge` function in `commands.rs` searches for each required JSON file in the following order:
    *   `resource_dir/cartridges/<filename>` (Primary location for downloaded updates)
    *   `resource_dir/<filename>`
    *   `cartridges/<filename>` (Relative to the current working directory)
    *   `src-tauri/cartridges/<filename>` (Development fallback)
2.  **Parsing**: The first existing file found in the search path is read and parsed as JSON.
3.  **Fallback Mechanism**: 
    *   For `red_flags_v2.json` and `rubric_v2.json`, if the `_v2` file is not found, the system falls back to attempting to load `red_flags.json` and `rubric.json` respectively.
    *   For `policies.json` and `system_prompts.json`, if the files are not found, the system defaults to an empty JSON object (`{}`).
4.  **State Injection**: The successfully loaded JSON objects are combined into a `CartridgeSet` struct and stored in the global `AppState`, making them available to the processing pipeline.

## 4. Cartridge Contents

The contents of the cartridge dictate the behavior of the AI pipeline. The system prompts are explicitly part of the cartridge, not hardcoded into the application. This is a critical design choice, ensuring that the agents' behavior can be updated dynamically without requiring a new software release.

### 4.1. `system_prompts.json`

This file defines the agents used in both Standard (2-agent) and Turbo (3-agent) processing modes. Each agent definition includes its `id`, `name`, `role`, and the comprehensive `prompt` detailing its instructions, output format, and constraints.

### 4.2. `rubric_v2.json`

This file defines the 5-pillar audit scoring system. It includes:
*   **Scoring System**: Min score, max score, and pass threshold.
*   **Traffic Light Rules**: Logic for assigning GREEN, ORANGE, or RED status based on pillar scores and detected red flags.
*   **Pillars**: Detailed definitions for Goal Linkage, Participant Voice, Measurable Outcomes, Support Delivered, and Risk & Safety, including specific bracket flags to insert when information is missing.

### 4.3. `red_flags_v2.json`

This file lists the categories of critical incidents that the system must detect. Each category includes a description, severity level, and an extensive array of keywords and phrases (e.g., "physically guided", "held down", "chemical restraint") that trigger the flag.

### 4.4. `policies.json`

This file provides the broader context of the regulatory environment, detailing practice standards, reporting timeframes, and specific rules like the PACE system's funding periods and documentation requirements.

## 5. Update Mechanism

RiteDoc features a silent, automatic update mechanism for cartridges, ensuring users always have the latest compliance rules without manual intervention.

1.  **Background Check**: Upon startup, if the application is activated, a detached asynchronous task is spawned (`lib.rs`).
2.  **Version Query**: The app makes an anonymous GET request to the Supabase REST API to fetch the latest cartridge version number. This request uses only the public `anon_key` and sends no user-identifying information.
3.  **Comparison**: The remote version is compared against the local version stored in `app_data_dir/cartridge_version.json`.
4.  **Download and Verification**: If an update is available, the app downloads `checksums.json` and the individual cartridge files from Supabase public storage.
5.  **SHA-256 Checksum**: The SHA-256 hash of each downloaded file is computed and compared against the expected hash in `checksums.json`. If *any* file fails the checksum verification, the entire update is rejected and rolled back.
6.  **JSON Validation**: Each file is parsed to ensure it is valid JSON.
7.  **Installation**: If all files pass verification and validation, they are written to the `resource_dir/cartridges/` directory.
8.  **Persistence**: The local `cartridge_version.json` is updated with the new version number, a timestamp, and a human-readable date string.

## 6. Validation Rules

The system is designed to be resilient against corrupt or missing cartridge files.

*   **Missing Files**: If a required file (e.g., `red_flags_v2.json`) is missing from all search paths, the `load_cartridge` function returns an error. However, the `load_all_cartridges` function implements fallbacks. It will try older versions (`red_flags.json`) or default to empty JSON objects for non-critical files (`policies.json`, `system_prompts.json`). If the core files cannot be loaded, the note processing pipeline will fail gracefully and return an error to the frontend.
*   **Corrupt Files**: During the update process, files are strictly validated. They must pass the SHA-256 checksum and be valid JSON. If a file is corrupt, the update is aborted, and the application continues using the existing, known-good cartridge. If a local file becomes corrupt after installation, the JSON parser will fail during startup, triggering the same fallback or error handling as a missing file.

## 7. Size Estimates

Cartridges are designed to be extremely lightweight, ensuring fast downloads and minimal storage footprint.

Typical cartridge size (based on the `VIC_NDIS` cartridge):
*   `policies.json`: ~11 KB
*   `red_flags_v2.json`: ~78 KB
*   `rubric_v2.json`: ~11 KB
*   `system_prompts.json`: ~7.5 KB
*   **Total Estimated Size**: ~100 KB - 150 KB

## 8. BIAB Compatibility

The Cartridge System is fully compatible with the "Business in a Box" (BIAB) model. BIAB agencies receive the exact same cartridge as their region. The cartridge is considered a core functional component of the compliance engine, not a premium feature. All users, regardless of their subscription tier, benefit from the same up-to-date regulatory data and AI prompts.

## 9. Version Control

Version control is critical for managing updates and ensuring consistency.

*   **Internal Versioning**: Each JSON file contains internal `version` and `last_updated` fields (e.g., `"version": "2.0.0"`, `"last_updated": "2026-04-02"`).
*   **Global Versioning**: The overall cartridge version is tracked in the Supabase database and locally in `cartridge_version.json`. This global version dictates when the application should trigger a download of the new file set.

## 10. New Region Creation

Creating a new cartridge for a different region (e.g., Queensland, UK, USA) involves the following steps:

1.  **Data Gathering**: Collect the specific legislative standards, code of conduct, reporting timeframes, and critical incident definitions for the target region.
2.  **File Creation**: Create the four core JSON files (`policies.json`, `red_flags_v2.json`, `rubric_v2.json`, `system_prompts.json`) tailored to the new region's requirements.
3.  **Prompt Engineering**: Carefully craft the `system_prompts.json` to ensure the AI agents understand the specific terminology and formatting required by the new region's auditing bodies.
4.  **Testing**: Run a comprehensive test suite of raw notes through the pipeline using the new cartridge to verify that red flags are caught, scores are accurate, and the rewritten notes meet the regional standards.
5.  **Deployment**: Upload the new cartridge files and their corresponding `checksums.json` to a new version folder in the Supabase public storage bucket, and update the `cartridge_versions` table to trigger the automatic update for users in that region.
