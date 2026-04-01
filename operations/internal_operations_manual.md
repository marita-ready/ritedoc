# ReadyCompliant Internal Operations Manual

This manual outlines the day-to-day operational procedures for the ReadyCompliant team managing the RiteDoc software. It covers support ticket management, cartridge updates, billing, client onboarding, and escalation protocols.

## 1. Support Ticket Review Process

The support ticket system is the primary feedback loop for improving RiteDoc's automated support stack.

### 1.1 Daily Triage

1.  **Access:** Log in to the ReadyCompliant Admin Dashboard and navigate to the "Support Tickets" view.
2.  **Filter:** Filter tickets by status, prioritising "Escalated (Human Review Required)" and "Open".
3.  **Review:** For each escalated ticket, review the entire interaction log, including the auto-diagnosis results, self-fix attempts, Dify bot conversation, and Retell AI call transcript.
4.  **Action:**
    *   If the issue is known but the automated system failed, identify the failure point (e.g., missing keyword in Dify, incorrect Retell script) and document it for fixing.
    *   If the issue is novel, proceed to the Escalation Procedure (Section 5).

### 1.2 Ticket Closure

1.  Once an issue is resolved with the client, the ticket status must be updated to "Resolved (Human)".
2.  Crucially, the solution must be documented in the `troubleshooting_matrix.md` before the ticket is officially closed. This ensures the automated systems can handle the issue in the future.

## 2. Cartridge Update Workflow

State-specific compliance cartridges (JSON files) are the brain of the RiteDoc compliance engine. They must be kept up-to-date with the latest NDIS regulations.

### 2.1 Triggering an Update

Updates are triggered by changes in NDIS Quality and Safeguards Commission guidelines, state-specific legislation, or internal improvements to the 5-pillar rubric.

### 2.2 Development and Testing

1.  **Drafting:** The compliance team drafts the updated JSON cartridge (e.g., adding new red flags or refining system prompts).
2.  **Testing:** The new cartridge is loaded into a local development build of RiteDoc.
3.  **Validation:** The cartridge is tested against the `synthetic_dirty_notes.csv` dataset to ensure it correctly identifies new red flags without increasing false positives.

### 2.3 Deployment

1.  **Approval:** The updated cartridge must be approved by the Head of Compliance (Marita Frith).
2.  **Upload:** The approved JSON file is uploaded to the secure Supabase storage bucket.
3.  **Versioning:** The cartridge version number is incremented in the database.
4.  **Distribution:** RiteDoc client applications automatically detect the new version during their next licence validation ping and download the update silently in the background.

## 3. Billing Management

Billing is handled automatically via Stripe, but exceptions require manual intervention.

### 3.1 Failed Payments

1.  **Monitoring:** The Admin Dashboard displays accounts with failed payments.
2.  **Automated Retry:** Stripe automatically retries the payment after two (2) business days.
3.  **Suspension:** If the second attempt fails, the Supabase database automatically updates the client's licence status to "Suspended". The RiteDoc app will block access upon the next validation ping.

### 3.2 Manual Intervention

1.  **Contact:** For suspended accounts, the operations team contacts the client via email (using Brevo) or phone to resolve the billing issue.
2.  **Reactivation:** Once payment is successfully processed in Stripe, the licence status in Supabase is manually updated to "Active", restoring access.

## 4. Client Onboarding Process

A smooth onboarding experience is critical for client retention.

### 4.1 Automated Provisioning

1.  **Signup:** The client signs up and completes payment via the ReadyCompliant website (Stripe checkout).
2.  **Licence Generation:** A unique licence key is automatically generated in Supabase.
3.  **Welcome Email:** Brevo automatically sends a welcome email containing the licence key, download link for the RiteDoc installer, and links to the relevant CRM SOPs.

### 4.2 Manual Follow-up (Optional)

For Agency/BIAB clients or large enterprise accounts, a manual follow-up call is scheduled within 48 hours of signup to ensure successful installation and answer any initial questions.

## 5. Escalation Procedures

When an issue cannot be resolved by the automated systems or frontline support, it must be escalated.

### 5.1 Technical Escalation (Tier 2)

*   **Trigger:** The issue involves a software bug, crash (identified via Sentry), or complex hardware incompatibility.
*   **Action:** The ticket is assigned to the development team. The developer investigates the issue, pushes a fix to the codebase, and prepares a new software release if necessary.

### 5.2 Compliance Escalation

*   **Trigger:** The client disputes a traffic light indicator (e.g., a note was marked RED but the client believes it should be GREEN) or requests clarification on a specific NDIS rule.
*   **Action:** The ticket is assigned to the compliance team. The team reviews the specific note (if the client chooses to share it securely, outside of RiteDoc) and the active cartridge logic. If the cartridge is flawed, an update is triggered (Section 2).

### 5.3 Executive Escalation

*   **Trigger:** The issue involves a significant billing dispute, a potential breach of the Terms of Service, or a high-risk client relationship issue.
*   **Action:** The ticket is immediately escalated to the Founder (Marita Frith) for personal review and resolution.
