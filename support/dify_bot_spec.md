# Dify Knowledge Bot Specification

This specification details the configuration, knowledge base integration, and conversational flow for the Dify bot embedded within the RiteDoc desktop application. The bot serves as the primary in-app support mechanism (Step 3 of the automated support flow).

## 1. Bot Overview

The Dify bot is an AI-powered assistant integrated directly into the RiteDoc Tauri frontend. Its primary function is to guide users through troubleshooting steps for common issues before escalating to phone support or human intervention.

*   **Persona:** Helpful, patient, clear, and concise. It uses plain English and avoids overly technical jargon unless necessary.
*   **Placement:** Accessible via a "Help" or "Support" icon consistently visible in the RiteDoc interface.
*   **Trigger:** Can be invoked manually by the user or automatically surfaced by the Tauri backend if a self-fix attempt fails.

## 2. Knowledge Base Integration

The bot's intelligence is derived from a structured knowledge base managed within the Dify platform.

### 2.1 Primary Source: Troubleshooting Matrix

The core of the bot's knowledge is the `troubleshooting_matrix.md`. This document is ingested into Dify as a structured dataset.

*   **Mapping:** The bot maps user queries (symptoms) to the corresponding categories and problems defined in the matrix.
*   **Retrieval:** When a match is found, the bot retrieves the specific "Dify Walkthrough Script" associated with that problem.

### 2.2 Secondary Sources: SOPs and Documentation

To provide comprehensive assistance, the bot also has access to:

*   Client SOPs (e.g., `sop_shiftcare.md`, `sop_brevity.md`) for guidance on exporting and importing CSV files.
*   The Acceptable Use Policy and Data Handling Policy to answer questions about privacy and security.

## 3. Conversational Flow

The bot follows a structured conversational flow to ensure efficient issue resolution and accurate ticket logging.

### 3.1 Initiation and Context Gathering

1.  **Greeting:** "Hi there! I'm the RiteDoc support assistant. How can I help you today?"
2.  **Context Injection (Automatic):** If the bot was triggered automatically by a failed self-fix (e.g., insufficient RAM), the Tauri backend injects this context into the initial prompt.
    *   *Example:* "I see RiteDoc is having trouble running in Turbo Mode due to low memory. I can help you fix that."
3.  **User Query (Manual):** If invoked manually, the bot waits for the user to describe the issue.

### 3.2 Diagnosis and Walkthrough

1.  **Symptom Matching:** The bot analyses the user's input or the injected context to identify the problem in the knowledge base.
2.  **Clarification (If needed):** If the issue is ambiguous, the bot asks clarifying questions (e.g., "Are you seeing an error message when you try to import the CSV, or is the app freezing?").
3.  **Step-by-Step Guidance:** Once the issue is identified, the bot presents the solution from the "Dify Walkthrough Script" one step at a time. It waits for the user to confirm they have completed a step before proceeding to the next.

### 3.3 Resolution Check and Ticket Update

After providing the complete solution, the bot must verify if the issue is resolved.

1.  **Prompt:** "Did those steps resolve the issue for you?"
2.  **User Response: "Yes"**
    *   The bot thanks the user.
    *   It triggers an API call to Supabase to update the associated support ticket status to "Resolved (Dify)".
3.  **User Response: "No" / "Still having issues"**
    *   The bot acknowledges the failure.
    *   It triggers the escalation protocol.

## 4. Escalation Triggers

If the bot cannot resolve the issue, it must seamlessly transition the user to the next tier of support.

### 4.1 Conditions for Escalation

*   The user explicitly states the provided solution did not work.
*   The user's query does not match any known issue in the knowledge base.
*   The user requests to speak with a human or call support.

### 4.2 Escalation Action

1.  **Ticket Update:** The bot updates the Supabase ticket with the entire conversation transcript and changes the status to "Escalated (Retell)".
2.  **Handoff Message:** "I'm sorry I couldn't resolve that for you. I've logged our conversation in your support ticket. For further assistance, please call our 24/7 automated support line at [Phone Number]. They have access to this ticket and can help you further."

## 5. Technical Integration (Tauri & Supabase)

*   **Embedding:** The Dify bot is embedded in the Tauri frontend using the Dify WebApp iframe or API integration.
*   **Authentication:** The bot authenticates with the Dify backend using a secure API key.
*   **Supabase API:** The bot uses custom tools/API calls configured within Dify to interact with the Supabase database (creating tickets, updating status, appending transcripts). The user's `client_id` or `licence_key` is passed securely from the Tauri backend to the bot to ensure tickets are linked correctly.
