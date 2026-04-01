# RiteDoc Automated Support Flow SOP

This Standard Operating Procedure (SOP) outlines the complete, four-step automated support flow for the RiteDoc application. The goal of this system is to ensure that every client issue requires human intervention only once, with unresolved issues feeding back into the knowledge base to improve future automated resolution.

## 1. Step 1: Auto-Diagnosis

The first line of defense is the RiteDoc application itself. Upon launch and during operation, the Tauri backend continuously monitors the system state.

### 1.1 Diagnostic Checks

The application automatically checks the following parameters:

*   **Internet Connectivity:** Required solely for licence validation and checking for cartridge updates.
*   **Model Status:** Verifies that the Nanoclaw/llama.cpp model (Phi-4-mini Q4_K_M) is correctly loaded into memory.
*   **RAM Availability:** Checks if sufficient RAM is available for the selected processing mode (Standard or Turbo).
*   **Disk Space:** Ensures adequate local storage is available for processing and temporary file creation.
*   **Licence Key Validity:** Confirms the active status of the client's subscription via a secure ping to the Supabase database.

### 1.2 Ticket Creation

If any of these checks fail, the application immediately generates a support ticket in the Supabase database. This ticket records the specific failure point, the timestamp, and the client's licence key.

## 2. Step 2: Tauri Self-Fix

Before alerting the user, the Tauri backend attempts to silently resolve the identified issue.

### 2.1 Automated Interventions

Depending on the diagnosis, the system may attempt the following self-fixes:

*   **Model Loading Failure:** The application will attempt to reload the model into memory. If the model file is corrupted, it will initiate a background re-download of the model file.
*   **Insufficient RAM:** The system will attempt to clear its own cache. If RAM remains insufficient, it will automatically downgrade the processing mode from Turbo to Standard (if applicable) and notify the user of the change.
*   **Disk Space Low:** The application will aggressively clear temporary files and enforce the 48-hour auto-delete policy immediately to free up space.

### 2.2 Resolution Logging

If the self-fix is successful, the Supabase ticket is updated with the resolution steps taken and marked as "Resolved (Auto)". The user experiences no interruption. If the self-fix fails, the system proceeds to Step 3.

## 3. Step 3: In-App Help (Dify Bot)

If the application cannot resolve the issue silently, it surfaces the problem to the user via the integrated Dify bot.

### 3.1 Guided Walkthrough

The Dify bot is pre-loaded with the comprehensive troubleshooting matrix. It initiates a conversation with the user, explaining the issue in plain English (e.g., "It looks like your computer is running low on memory, which is slowing down the compliance engine").

The bot then provides step-by-step instructions for the user to resolve the issue manually (e.g., "Please close any other large applications, like Google Chrome or Microsoft Word, and click 'Try Again'").

### 3.2 User Feedback and Ticket Update

After providing the instructions, the bot asks the user if the issue is resolved.

*   **If Resolved:** The user clicks "Resolved". The Supabase ticket is updated with the interaction log and marked as "Resolved (Dify)".
*   **If Unresolved:** The user clicks "Still having issues". The bot updates the ticket and provides the phone number for the Retell 24/7 support line, proceeding to Step 4.

## 4. Step 4: Phone Support (Retell AI)

For issues that persist beyond the in-app help, clients can call the 24/7 support line powered by Retell AI and Twilio.

### 4.1 Autonomous Troubleshooting

When the client calls, the Retell AI agent answers immediately. It asks for the client's licence key or registered phone number to locate the open Supabase ticket.

The AI agent reviews the ticket history (what failed in auto-diagnosis, what the self-fix attempted, and what the Dify bot suggested). It then guides the client through more advanced troubleshooting steps from the matrix, adapting its responses based on the client's feedback.

### 4.2 Escalation and Callback

If the Retell AI agent cannot resolve the issue after exhausting the troubleshooting matrix, it initiates the escalation protocol:

1.  It informs the client: "I've recorded all the steps we've tried. A member of our human support team will review this and contact you shortly."
2.  It schedules a callback task in the ReadyCompliant Admin Dashboard.
3.  It updates the Supabase ticket status to "Escalated (Human Review Required)".

## 5. The Escalation Loop

The core philosophy of the RiteDoc support stack is continuous improvement.

### 5.1 Human Intervention

When a ticket reaches the "Escalated" status, a human support agent reviews the entire interaction history. The agent contacts the client, resolves the novel issue, and documents the solution.

### 5.2 Knowledge Base Update

Crucially, the human agent does not simply close the ticket. They must update the central troubleshooting matrix with the new problem and its verified solution.

This updated matrix is then pushed to both the Dify bot and the Retell AI agent. Consequently, if another client encounters the same novel issue, the automated systems will be equipped to handle it without human intervention. Every issue only requires human intervention once.
