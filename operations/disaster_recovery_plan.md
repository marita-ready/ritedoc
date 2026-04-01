# RiteDoc Disaster Recovery Plan

This Disaster Recovery Plan (DRP) outlines the procedures and protocols for ReadyCompliant to ensure business continuity and data integrity in the event of critical system failures, outages, or personnel emergencies affecting the RiteDoc software and its supporting infrastructure.

## 1. System Architecture and Resilience

RiteDoc's core architecture is designed for high resilience. Because the application processes all data locally on the client's machine, a central server outage does not immediately halt the client's ability to process progress notes, provided their licence has been recently validated.

The critical dependencies are the licensing server (Supabase), the payment gateway (Stripe), and the automated support stack (Retell AI, Twilio, Dify).

## 2. Scenario 1: Supabase Outage (Licensing & Database)

Supabase hosts the central database containing client accounts, active licence keys, and support tickets.

### 2.1 Impact

*   New clients cannot sign up or receive licence keys.
*   Existing clients whose local licence cache has expired (typically 7 days) will be unable to launch RiteDoc.
*   The automated support stack (Retell, Dify) cannot create or update tickets.
*   The ReadyCompliant Admin Dashboard will be inaccessible.

### 2.2 Recovery Procedure

1.  **Detection:** Automated monitoring alerts the ReadyCompliant team to the Supabase outage.
2.  **Communication:** A status update is immediately posted to the ReadyCompliant website and emailed to all active clients via Brevo, acknowledging the issue and providing an estimated time to resolution (ETR).
3.  **Failover (If Applicable):** If Supabase provides a failover region, the DNS records are updated to point to the secondary database instance.
4.  **Manual Override (Emergency):** If the outage is prolonged (>24 hours), a temporary, hardcoded "emergency bypass" licence key can be distributed to critical clients via email, allowing them to bypass the online validation check temporarily. This key must be revoked immediately upon Supabase restoration.
5.  **Data Restoration:** Once Supabase is online, verify data integrity against the most recent automated backup (Supabase performs daily backups).

## 3. Scenario 2: Stripe Issues (Billing & Payments)

Stripe handles all subscription billing and payment processing.

### 3.1 Impact

*   New signups will fail at checkout.
*   Recurring monthly subscriptions will not be processed.
*   Accounts may be incorrectly suspended if renewal pings fail.

### 3.2 Recovery Procedure

1.  **Detection:** Stripe dashboard alerts or failed webhook notifications.
2.  **Communication:** Post a status update regarding payment processing delays.
3.  **Grace Period Extension:** Manually extend the grace period for all active subscriptions in the Supabase database by 7 days to prevent automated suspensions due to failed Stripe renewals.
4.  **Reconciliation:** Once Stripe is operational, manually trigger a reconciliation script to process any missed recurring payments and update the Supabase licence statuses accordingly.

## 4. Scenario 3: Data Corruption (Cartridge Updates)

A flawed or corrupted state compliance cartridge (JSON file) is pushed to clients, causing the RiteDoc compliance engine to crash or produce wildly inaccurate traffic light scores.

### 4.1 Impact

*   Clients experience application crashes during processing.
*   False RED flags are generated, causing unnecessary panic and manual review.
*   The automated support stack is overwhelmed with tickets.

### 4.2 Recovery Procedure

1.  **Detection:** A sudden spike in Sentry crash reports or Retell/Dify support tickets related to processing errors.
2.  **Rollback:** Immediately revert the active cartridge version in the Supabase storage bucket to the previous, stable version.
3.  **Forced Update:** The RiteDoc application is designed to check for cartridge updates on launch. The rollback will automatically propagate to clients the next time they open the app.
4.  **Communication:** Email clients advising them to restart RiteDoc to receive the corrected compliance rules.
5.  **Investigation:** The compliance team must review the corrupted JSON file, identify the syntax error or logical flaw, and implement stricter pre-deployment validation checks (e.g., automated JSON schema validation).

## 5. Scenario 4: Key Personnel Emergency (Marita Frith)

The Founder, Marita Frith, is incapacitated or unavailable for an extended period.

### 5.1 Impact

*   Strategic decision-making is halted.
*   Final approval for new compliance cartridges is delayed.
*   Executive escalations (billing disputes, high-risk client issues) cannot be resolved.

### 5.2 Recovery Procedure

1.  **Delegation of Authority:** A pre-designated "Second-in-Command" (2IC) or a trusted advisory board member assumes temporary operational control of ReadyCompliant.
2.  **Access Handover:** The 2IC must have secure, documented access to the primary password manager (e.g., 1Password) containing credentials for Supabase, Stripe, Brevo, Twilio, Retell AI, and the domain registrar.
3.  **Operational Continuity:** The 2IC follows the `internal_operations_manual.md` to manage daily tasks, approve routine cartridge updates (if qualified), and handle standard escalations.
4.  **Communication:** If the absence is prolonged, key stakeholders (major BIAB agencies, critical partners) are notified of the temporary change in leadership.

## 6. Scenario 5: Automated Support Stack Failure (Retell/Twilio)

The 24/7 phone support line goes down due to a Twilio outage or Retell AI API failure.

### 6.1 Impact

*   Clients calling the support number receive a busy signal or generic error message.
*   Tickets cannot be created via phone.

### 6.2 Recovery Procedure

1.  **Detection:** Twilio/Retell dashboard alerts or failed webhook notifications.
2.  **Failover Routing:** Log in to the Twilio console and immediately reroute the primary support number to a secondary, human-monitored voicemail system or a backup answering service.
3.  **Communication:** Update the "Help" section within the RiteDoc app (via a lightweight JSON configuration update) to direct users to email support (support@readycompliant.com.au) instead of the phone line.
4.  **Restoration:** Once the API is restored, revert the Twilio routing back to the Retell AI webhook.
