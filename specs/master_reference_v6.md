# RiteDoc Master Reference V6

This document serves as the single source of truth for the RiteDoc project, consolidating all architectural, operational, and compliance specifications. It supersedes all previous versions (including V5) and removes all obsolete references (e.g., Lite Mode, outdated tool integrations).

## 1. Product Overview

RiteDoc is an offline desktop application (Tauri 2.0 + Rust) designed for NDIS providers (specifically admin staff, team leaders, and managers). It processes raw support worker progress notes into audit-prepared drafts using a local AI pipeline, ensuring zero data transmission to the cloud.

## 2. Core Architecture

The application is built on a highly secure, offline-first architecture.

### 2.1 Technology Stack

*   **Frontend:** HTML/CSS/JS (via Tauri).
*   **Backend:** Rust (Tauri core).
*   **Local AI Inference:** Nanoclaw/llama.cpp running the Phi-4-mini Q4_K_M model.
*   **Database (Licensing/Support):** Supabase (Cloud-based, accessed only for telemetry and validation).

### 2.2 Adaptive Processing Pipeline

RiteDoc automatically detects the host machine's hardware capabilities on first run to determine the optimal processing mode.

*   **Standard Mode (2-Agent):** For machines without a dedicated GPU (e.g., 16GB RAM, i7 processor).
    *   Agent 1: Rewrite + Red Flag Scan
    *   Agent 2: Audit + Score
*   **Turbo Mode (3-Agent):** For machines with a dedicated GPU or higher specifications.
    *   Agent 1: Rewrite
    *   Agent 2: Red Flag Scan
    *   Agent 3: Audit + Score

*Note: "Lite Mode" has been permanently removed from the architecture.*

### 2.3 Data Handling and Security

*   **Zero Cloud Processing:** All PII scrubbing and AI inference occur locally.
*   **PII Scrubber (Nanoclaw):** A Rust-based module that redacts names, addresses, phones, and NDIS-specific context (e.g., kinship titles) before AI processing.
*   **48-Hour Auto-Delete:** All imported CSVs, processed drafts, and temporary files are permanently deleted from local storage 48 hours after processing.

## 3. Compliance Engine (The Cartridge System)

The intelligence of RiteDoc is driven by state-specific JSON cartridges that dictate the compliance rules.

### 3.1 Cartridge Components

*   `red_flags.json`: Keywords and phrases indicating critical incidents or severe compliance risks.
*   `rubric.json`: The 5-pillar scoring criteria.
*   `policies.json`: Plain-English explanations for bracketed flags.
*   `system_prompts.json`: Instructions for the local AI model.

### 3.2 The 5-Pillar Audit Rubric

Every note is evaluated against five core pillars. The internal scores (0-3) are *never* displayed to the user.

1.  **Goal Linkage:** Does the note clearly connect the support provided to the participant's NDIS goals?
2.  **Participant Voice:** Is the participant's choice, control, and feedback evident in the documentation?
3.  **Measurable Outcomes:** Are the results of the support quantifiable or clearly described?
4.  **Risk & Safety:** Are any incidents, hazards, or changes in the participant's condition documented appropriately?
5.  **Completeness:** Does the note contain all required administrative details (time, location, support worker)?

### 3.3 Traffic Light System

The user only sees the final traffic light indicator:

*   **GREEN:** Audit-ready.
*   **ORANGE:** Needs more info (contains bracketed flags like `[MISSING OUTCOME]`).
*   **RED:** Incident detected (floats to the top of the list).

## 4. Pricing and Business Model

RiteDoc operates on a per-seat SaaS model, billed monthly via Stripe.

*   **Founders:** $97/month (Early access).
*   **Standard:** $147/month (Retail).
*   **Agency/BIAB:** $67/seat wholesale (Business-in-a-Box partners).

## 5. Automated Support Stack

The support system is designed to resolve issues autonomously, requiring human intervention only once per novel problem.

1.  **Auto-Diagnosis:** Tauri backend checks internet, model status, RAM, disk, and licence key.
2.  **Self-Fix:** Tauri attempts silent resolution (e.g., clearing cache, downgrading to Standard Mode).
3.  **In-App Help (Dify Bot):** Guides users through manual fixes based on the `troubleshooting_matrix.md`.
4.  **Phone Support (Retell AI):** 24/7 automated voice agent for advanced troubleshooting and escalation.
5.  **Ticketing (Supabase):** Every interaction is logged. Unresolved tickets are escalated to humans, who update the matrix, closing the loop.

## 6. Dashboards

*   **ReadyCompliant Admin Dashboard:** Internal tool for managing all subscriptions, revenue, support tickets, and client data.
*   **BIAB Agency Dashboard:** White-label portal for agency partners to manage their wholesale seats, clients, and revenue.
