# Business-in-a-Box (BIAB) Agency Dashboard Specification

This document details the technical specifications and functional requirements for the white-label Business-in-a-Box (BIAB) Agency Dashboard. This dashboard is designed specifically for agency partners who purchase RiteDoc seats at wholesale pricing and distribute them to their own clients.

## 1. Overview and Architecture

The BIAB Agency Dashboard is a secure, web-based portal accessible to authorised agency administrators. It provides a branded experience for managing their allocated RiteDoc seats and tracking their own revenue.

*   **Frontend:** Built using a modern JavaScript framework (e.g., React, Vue, or Svelte) for a responsive user experience.
*   **Backend/Database:** Integrates with the central Supabase instance, but with strict Row Level Security (RLS) policies to ensure an agency can only view and manage data associated with their specific `agency_id`.
*   **Authentication:** Requires secure login credentials provided by ReadyCompliant upon agency onboarding.

## 2. Core Modules

The dashboard is divided into several key modules to facilitate agency operations.

### 2.1 Seat Management

This module is the primary interface for agencies to distribute and manage their wholesale RiteDoc licences.

*   **Data Source:** Supabase `agency_seats` and `clients` tables (filtered by `agency_id`).
*   **Features:**
    *   **Seat Allocation:** Displays the total number of seats purchased by the agency, the number currently active, and the number available for distribution.
    *   **Key Generation:** Allows the agency admin to generate a new, unique licence key from their available pool to assign to a new client.
    *   **Client Assignment:** A form to link a generated key to a specific client's business name and contact email.
    *   **Key Revocation:** The ability to instantly revoke an active key (e.g., if a client cancels their service with the agency), returning the seat to the available pool.

### 2.2 Client List and Status

This module provides a CRM-like view of the agency's end-clients using RiteDoc.

*   **Data Source:** Supabase `clients` table (filtered by `agency_id`).
*   **Features:**
    *   **Client Overview:** A searchable, sortable table displaying all assigned clients (Business Name, Contact Name, Email).
    *   **Status Indicators:** Clear visual indicators for each client's licence status (Active, Suspended, Revoked).
    *   **Usage Metrics (Optional):** If enabled by ReadyCompliant, basic telemetry data (e.g., last active date) can be displayed to help the agency monitor client engagement.

### 2.3 Financial Overview and Revenue Tracking

This module allows the agency to track their profitability and manage their wholesale costs.

*   **Data Source:** Supabase `agency_billing` table and Stripe API (for the agency's own payments to ReadyCompliant).
*   **Features:**
    *   **Cost Per Seat:** Clearly displays the wholesale cost per seat ($67.00 AUD/month).
    *   **Total Monthly Cost:** Calculates the total monthly billing amount owed to ReadyCompliant based on the number of active seats.
    *   **Revenue Tracking (Optional):** A feature allowing the agency to input their retail price (e.g., $147.00 AUD/month) to automatically calculate their gross profit margin and total revenue generated from their RiteDoc client base.
    *   **Billing History:** A log of past invoices and payments made by the agency to ReadyCompliant.

## 3. Security and White-Labeling

The BIAB dashboard is designed to feel like an extension of the agency's own brand while maintaining strict data security.

*   **White-Labeling:** The dashboard interface can be customised with the agency's logo and primary brand colours.
*   **Data Isolation:** Supabase Row Level Security (RLS) ensures that an agency administrator can *never* access data, licence keys, or client information belonging to another agency or direct ReadyCompliant customers.
*   **No PII Access:** Similar to the ReadyCompliant Admin Dashboard, the BIAB dashboard *never* displays or has access to any NDIS participant data or progress notes processed by the end-clients. All processing remains strictly offline on the client's local machine.
