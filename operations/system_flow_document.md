# RiteDoc Complete System Flow

This document maps the entire lifecycle of a RiteDoc client, from initial signup through daily usage, automated support, billing, and system updates. It details every trigger, tool, and automation involved in the ReadyCompliant ecosystem.

## 1. Client Acquisition and Onboarding

The journey begins when a prospective NDIS provider decides to purchase RiteDoc.

### 1.1 Signup and Payment (Stripe)

1.  **Trigger:** The user clicks "Subscribe" on the ReadyCompliant website.
2.  **Tool:** Stripe Checkout.
3.  **Action:** The user selects a tier (Founders, Standard, or Agency/BIAB), enters their business details, and provides payment information. Stripe processes the initial payment and sets up the recurring monthly subscription.

### 1.2 Account Provisioning (Supabase)

1.  **Trigger:** A successful payment webhook from Stripe.
2.  **Tool:** Supabase Edge Function.
3.  **Action:** The Edge Function receives the Stripe payload, creates a new record in the `clients` table, and generates a unique, cryptographically secure licence key. It links the Stripe Customer ID to the Supabase record.

### 1.3 Welcome and Delivery (Brevo)

1.  **Trigger:** The creation of the new client record in Supabase.
2.  **Tool:** Brevo (via API).
3.  **Action:** Brevo sends an automated welcome email containing the licence key, a download link for the RiteDoc installer (hosted securely), and links to the relevant CRM SOPs (e.g., `sop_shiftcare.md`).

## 2. Installation and First Run

The client downloads and installs the RiteDoc desktop application.

### 2.1 Hardware Detection (Tauri/Rust)

1.  **Trigger:** The user launches RiteDoc for the first time.
2.  **Tool:** Tauri backend (Rust).
3.  **Action:** The application silently profiles the host machine's hardware (RAM, CPU, GPU presence). Based on these metrics, it determines whether to operate in Standard Mode (2 agents) or Turbo Mode (3 agents).

### 2.2 Licence Validation (Supabase)

1.  **Trigger:** The user enters their licence key into the app.
2.  **Tool:** Tauri backend -> Supabase API.
3.  **Action:** The app pings Supabase to verify the key's validity and active subscription status. If valid, the app unlocks the main dashboard.

### 2.3 Initial Cartridge Download

1.  **Trigger:** Successful licence validation.
2.  **Tool:** Tauri backend -> Supabase Storage.
3.  **Action:** The app downloads the latest state-specific compliance cartridge (JSON file) containing the red flags, rubrics, and system prompts required for the local AI engine.

## 3. Daily Usage: Processing Notes

This is the core value proposition of RiteDoc.

### 3.1 Data Import

1.  **Trigger:** The user clicks "Import CSV" and selects a file exported from their CRM.
2.  **Tool:** Tauri frontend/backend.
3.  **Action:** The app parses the CSV, mapping the columns (e.g., Note Content, Client ID) based on the selected CRM profile.

### 3.2 PII Scrubbing (Nanoclaw)

1.  **Trigger:** The user clicks "Process Notes".
2.  **Tool:** Nanoclaw PII Scrubber (Rust).
3.  **Action:** The scrubber scans the raw notes, identifying and replacing all personally identifiable information (names, addresses, phones) with standardised tags (e.g., `[Participant]`). This occurs entirely offline in local memory.

### 3.3 AI Compliance Engine (llama.cpp)

1.  **Trigger:** Completion of the PII scrubbing phase.
2.  **Tool:** Local AI model (Phi-4-mini Q4_K_M via llama.cpp).
3.  **Action:** The scrubbed notes are passed to the AI agents (2 or 3, depending on the hardware mode). The agents rewrite the notes into audit-prepared drafts, apply the compliance rubric from the active cartridge, and assign an internal score.

### 3.4 Traffic Light Assignment and Review

1.  **Trigger:** Completion of the AI processing phase.
2.  **Tool:** Tauri frontend.
3.  **Action:** The app displays the processed drafts alongside their assigned traffic light indicators (GREEN, ORANGE, RED). The user reviews the output, addresses any bracketed flags (e.g., `[UPPERCASE FIELD]`), and makes manual edits if necessary.

### 3.5 Export and Auto-Delete

1.  **Trigger:** The user clicks "Export Processed CSV".
2.  **Tool:** Tauri backend.
3.  **Action:** The app generates a new CSV file containing the compliant drafts for re-import into the CRM.
4.  **Trigger (Delayed):** 48 hours after the processing session concludes.
5.  **Action:** The app permanently deletes all imported CSVs, processed drafts, and temporary files from local storage to ensure data security.

## 4. Automated Support Flow

When issues arise, the system attempts to resolve them autonomously.

### 4.1 Auto-Diagnosis and Self-Fix (Tauri)

1.  **Trigger:** An internal error (e.g., model load failure, low RAM) or a failed licence ping.
2.  **Tool:** Tauri backend.
3.  **Action:** The app diagnoses the issue, creates a silent support ticket in Supabase, and attempts a self-fix (e.g., clearing cache, downgrading to Standard Mode). If successful, the ticket is marked resolved.

### 4.2 In-App Help (Dify Bot)

1.  **Trigger:** A failed self-fix or manual invocation by the user clicking "Help".
2.  **Tool:** Embedded Dify Bot.
3.  **Action:** The bot uses the `troubleshooting_matrix.md` to guide the user through manual resolution steps. It updates the Supabase ticket with the conversation transcript.

### 4.3 Phone Support (Retell AI & Twilio)

1.  **Trigger:** The user calls the 24/7 support line.
2.  **Tool:** Twilio (routing) -> Retell AI (conversational agent).
3.  **Action:** The AI agent identifies the caller, retrieves the open Supabase ticket, and provides advanced troubleshooting based on the matrix. If unresolved, it escalates the ticket for human review and schedules a callback.

## 5. System Updates and Maintenance

Keeping the compliance engine current and the software stable.

### 5.1 Cartridge Updates

1.  **Trigger:** The ReadyCompliant compliance team approves a new JSON cartridge.
2.  **Tool:** Supabase Storage.
3.  **Action:** The new file is uploaded. Client apps detect the new version during their next licence ping and download it silently in the background.

### 5.2 Crash Reporting (Sentry)

1.  **Trigger:** An unhandled exception or application crash.
2.  **Tool:** Sentry SDK (Rust/Frontend).
3.  **Action:** Sentry captures the stack trace and basic telemetry (scrubbing all PII and local file paths) and sends it to the ReadyCompliant development team for analysis and bug fixing.

### 5.3 Billing Renewals (Stripe)

1.  **Trigger:** The monthly anniversary of the client's subscription.
2.  **Tool:** Stripe.
3.  **Action:** Stripe automatically charges the payment method on file. If successful, the subscription continues. If it fails, the retry and suspension protocols (detailed in the Internal Operations Manual) are initiated.
