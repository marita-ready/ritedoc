# Retell AI and Twilio Integration Specification

This technical specification details the integration between Retell AI, Twilio, and the ReadyCompliant Supabase backend to facilitate the 24/7 automated phone support system for RiteDoc.

## 1. Architecture Overview

The support system relies on three primary components:

1.  **Twilio:** Provides the SIP trunking, phone numbers, and initial call routing.
2.  **Retell AI:** Hosts the conversational AI agent, manages the dialogue flow, and executes the troubleshooting matrix.
3.  **Supabase:** Serves as the central database for client accounts, licence keys, and support tickets.

## 2. Twilio Configuration

Twilio acts as the telephony gateway.

### 2.1 Phone Numbers

A dedicated Twilio phone number is provisioned for the RiteDoc support line. This number is published in the application and on the ReadyCompliant website.

### 2.2 SIP Trunking and Webhooks

When a call is received on the Twilio number, a webhook is triggered. This webhook points to the Retell AI endpoint configured for the RiteDoc agent.

The Twilio webhook payload includes the caller's phone number (`From`), which is crucial for the initial account lookup.

## 3. Retell AI Configuration

Retell AI manages the conversational logic and interacts with the backend.

### 3.1 Agent Setup

A specific agent is created within the Retell AI dashboard. This agent is configured with the `retell_call_script.md` to define its persona, greeting, and escalation paths.

### 3.2 Knowledge Base Integration

The `troubleshooting_matrix.md` is ingested into the Retell AI agent's knowledge base. This allows the agent to dynamically search for solutions based on the user's spoken symptoms.

### 3.3 Custom Functions (Function Calling)

The Retell AI agent is equipped with custom functions to interact with the Supabase backend during the call.

#### 3.3.1 `lookup_account(phone_number, licence_key)`

*   **Purpose:** Identifies the caller's account.
*   **Trigger:** Executed immediately after the greeting, using the Twilio `From` number or a spoken licence key.
*   **Action:** Queries the Supabase `clients` table. Returns the `client_id` and `business_name` if found.

#### 3.3.2 `create_ticket(client_id, issue_description)`

*   **Purpose:** Opens a new support ticket.
*   **Trigger:** Executed after the account lookup and initial issue description.
*   **Action:** Inserts a new row into the Supabase `support_tickets` table with the status "Open (Retell)". Returns the `ticket_id`.

#### 3.3.3 `update_ticket(ticket_id, action_taken, status)`

*   **Purpose:** Logs troubleshooting steps and updates the ticket status.
*   **Trigger:** Executed after each step in the troubleshooting matrix or upon escalation.
*   **Action:** Updates the `support_tickets` row. Statuses include "Resolved (Retell)" or "Escalated (Human Review Required)".

#### 3.3.4 `schedule_callback(ticket_id, phone_number, preferred_time)`

*   **Purpose:** Schedules a human callback for escalated issues.
*   **Trigger:** Executed during the escalation path.
*   **Action:** Inserts a task into the ReadyCompliant Admin Dashboard queue linked to the `ticket_id`.

## 4. Supabase Backend

Supabase stores all persistent data and provides the API endpoints for Retell AI's custom functions.

### 4.1 Database Schema

The relevant tables include:

*   `clients`: Stores `client_id`, `business_name`, `phone_number`, `licence_key`.
*   `support_tickets`: Stores `ticket_id`, `client_id`, `status`, `issue_description`, `interaction_log`, `created_at`, `updated_at`.

### 4.2 Edge Functions

Supabase Edge Functions (written in Deno/TypeScript) are deployed to handle the requests from Retell AI's custom functions securely. These functions validate the incoming requests and execute the necessary database queries.

## 5. Security and Data Handling

*   **Authentication:** All communication between Retell AI and Supabase Edge Functions is secured using API keys and JWTs.
*   **Data Minimisation:** The Retell AI agent only requests and processes data necessary for troubleshooting. It does not have access to participant data or progress notes.
*   **Call Transcripts:** Retell AI generates call transcripts. These are stored securely and linked to the Supabase ticket for human review during escalation.
