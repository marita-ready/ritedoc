# ReadyCompliant Admin Dashboard Specification

This document details the technical specifications and functional requirements for the internal ReadyCompliant Admin Dashboard. This dashboard is the central hub for managing the RiteDoc business, providing visibility into subscriptions, revenue, support tickets, and client data.

## 1. Overview and Architecture

The Admin Dashboard is a secure, web-based application accessible only to authorised ReadyCompliant personnel.

*   **Frontend:** Built using a modern JavaScript framework (e.g., React, Vue, or Svelte) for a responsive user experience.
*   **Backend/Database:** Directly integrates with the central Supabase instance, which acts as the single source of truth for all client and operational data.
*   **Authentication:** Requires strong, multi-factor authentication (MFA) for all ReadyCompliant staff accessing the dashboard.

## 2. Core Modules

The dashboard is divided into several key modules to facilitate different operational tasks.

### 2.1 Subscription Management

This module provides a comprehensive view of all RiteDoc licences.

*   **Data Source:** Supabase `clients` and `subscriptions` tables.
*   **Features:**
    *   **List View:** A searchable, sortable table displaying all clients (Business Name, Contact Name, Email, Phone).
    *   **Status Indicators:** Clear visual indicators for licence status (Active, Suspended, Cancelled, Trial).
    *   **Tier Tracking:** Displays the subscription tier for each client (Founders, Standard, Agency/BIAB).
    *   **Seat Count:** Shows the number of active seats allocated to each licence key.
    *   **Manual Actions:** Ability for admins to manually revoke a key, extend a trial, or trigger a password reset email (via Brevo integration).

### 2.2 Revenue Tracking (Stripe Integration)

This module aggregates financial data to provide a real-time overview of business performance.

*   **Data Source:** Stripe API (via webhooks synced to Supabase).
*   **Features:**
    *   **MRR Dashboard:** Displays Monthly Recurring Revenue (MRR), broken down by subscription tier.
    *   **Churn Rate:** Calculates and displays the customer churn rate over specific periods (e.g., 30 days, 90 days).
    *   **Failed Payments:** A dedicated alert section highlighting accounts with recently failed Stripe charges, enabling proactive outreach before automated suspension occurs.
    *   **Transaction History:** A log of recent successful and failed transactions linked to specific client accounts.

### 2.3 Support Ticket System

This module is the interface for managing the automated support flow and handling escalations.

*   **Data Source:** Supabase `support_tickets` table.
*   **Features:**
    *   **Ticket Queue:** A Kanban-style board or list view categorising tickets by status: "Open (Auto)", "Resolved (Auto/Dify)", "Escalated (Retell)", "Escalated (Human Review Required)".
    *   **Interaction Logs:** Clicking a ticket reveals the full history: auto-diagnosis results, self-fix attempts, Dify bot transcripts, and Retell AI call summaries.
    *   **Assignment:** Ability to assign escalated tickets to specific team members (e.g., Development, Compliance).
    *   **Resolution Logging:** A mandatory field for staff to document the final solution before closing a ticket, ensuring the `troubleshooting_matrix.md` can be updated.

### 2.4 Client Contact Information

A simplified CRM view for managing client relationships.

*   **Data Source:** Supabase `clients` table.
*   **Features:**
    *   **Detailed Profiles:** Clicking a client name opens a profile containing their full contact details, subscription history, and a log of all associated support tickets.
    *   **Communication Log:** A space to record manual interactions (phone calls, emails) outside of the automated support system.

## 3. Security and Access Control

Given the sensitive nature of the operational data, strict security measures are enforced.

*   **Role-Based Access Control (RBAC):** Different access levels for staff (e.g., "Support Agent" can view tickets but not revenue; "Admin" has full access).
*   **Audit Logging:** Every action taken within the dashboard (e.g., revoking a key, changing a subscription tier) is logged with the user's ID and a timestamp for accountability.
*   **No PII Access:** The dashboard *never* displays or has access to any NDIS participant data or progress notes, as this data never leaves the client's local machine.
