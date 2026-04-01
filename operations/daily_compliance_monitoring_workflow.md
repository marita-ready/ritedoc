# Daily Compliance Monitoring Workflow

This document outlines the standard operating procedure for the ReadyCompliant compliance team to monitor, review, approve, and deploy updates to the RiteDoc state-specific compliance cartridges. This ensures the local AI engine remains accurate and aligned with the latest NDIS regulations.

## 1. Detection and Monitoring

The compliance team is responsible for actively monitoring all relevant sources for changes to NDIS guidelines, state legislation, and industry best practices.

### 1.1 Primary Sources

*   **NDIS Quality and Safeguards Commission:** Daily review of official announcements, policy updates, and practice alerts published on the NDIS Commission website.
*   **State-Specific Legislation:** Monitoring relevant state government portals (e.g., Victorian Department of Families, Fairness and Housing) for changes affecting disability support services.
*   **Industry Bodies:** Reviewing updates from peak bodies such as National Disability Services (NDS) for interpretations of new rules and emerging compliance trends.
*   **Internal Feedback Loop:** Analysing escalated support tickets (via the ReadyCompliant Admin Dashboard) where clients have disputed a traffic light indicator or requested clarification on a specific rule.

### 1.2 Initial Assessment

When a potential change is detected, the compliance team performs an initial assessment to determine its impact on the RiteDoc 5-pillar rubric and the existing red flag keywords.

## 2. Review and Drafting

If a change is deemed necessary, the compliance team drafts the updates to the relevant state cartridge (JSON file).

### 2.1 Cartridge Modification

*   **Red Flags (`red_flags.json`):** Adding new keywords, phrases, or contextual rules that indicate a compliance risk under the new guidelines.
*   **Rubric (`rubric.json`):** Adjusting the scoring criteria within the 5 pillars (Goal Linkage, Participant Voice, Measurable Outcomes, Risk & Safety, Completeness) to reflect the updated standards.
*   **Policies (`policies.json`):** Updating the plain-English explanations and references that the AI engine uses to generate the bracketed flags (e.g., `[MISSING OUTCOME]`).
*   **System Prompts (`system_prompts.json`):** Refining the instructions given to the local AI model (Phi-4-mini Q4_K_M) to ensure it correctly interprets and applies the new rules during the rewrite phase.

### 2.2 Internal Peer Review

The drafted changes are submitted for internal peer review by another member of the compliance team to ensure accuracy, clarity, and consistency with the overall RiteDoc philosophy.

## 3. Testing and Validation

Before any update is pushed to clients, it must undergo rigorous testing to prevent false positives and ensure system stability.

### 3.1 Local Development Testing

The updated cartridge is loaded into a local development build of the RiteDoc application.

### 3.2 Stress Testing with Synthetic Data

The compliance team runs the updated engine against the `synthetic_dirty_notes.csv` dataset. This dataset contains a mix of realistic, non-compliant notes (including PII, poor grammar, and specific red flags) and compliant notes.

### 3.3 Outcome Analysis

The team analyses the output to verify that:

*   The new red flags are correctly identified and trigger a RED traffic light.
*   The updated rubric accurately scores the notes.
*   The changes have not inadvertently caused compliant notes to be flagged (false positives).
*   The PII scrubber (Nanoclaw) continues to function correctly alongside the new cartridge logic.

## 4. Approval and Deployment

Once testing is successful, the update is prepared for deployment to all active RiteDoc installations.

### 4.1 Final Approval

The Head of Compliance (Marita Frith) reviews the testing results and provides final approval for the cartridge update.

### 4.2 Versioning and Upload

1.  The version number of the JSON cartridge is incremented (e.g., from v1.2 to v1.3).
2.  The approved JSON file is securely uploaded to the designated Supabase storage bucket.
3.  The central database is updated to reflect the new active version for the specific state.

### 4.3 Automated Client Distribution

The deployment process is entirely automated and requires no action from the client.

1.  When a client launches the RiteDoc application, the Tauri backend performs its standard licence validation ping to Supabase.
2.  During this ping, the app checks its local cartridge version against the active version in the database.
3.  If a newer version is available, the app silently downloads the updated JSON file in the background.
4.  The new compliance rules are immediately applied to all subsequent processing sessions.

### 4.4 Communication (Optional)

For significant updates (e.g., a major overhaul of the NDIS pricing arrangements or a new state-wide policy), the operations team may send an automated email via Brevo to inform clients of the changes and how RiteDoc has adapted to handle them.
