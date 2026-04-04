# RiteDoc Goal Review Panel Specification

This technical specification details the Goal Review Panel feature for the RiteDoc Tauri desktop application. This feature is designed to ensure that participant goals remain current, thereby maintaining the accuracy of the AI agents when linking progress notes to these goals.

## 1. Purpose

The primary purpose of the Goal Review Panel is to ensure participant goals stay current so the AI agents can accurately link notes to goals. By prompting support workers or administrators to review and update goals periodically, the system guarantees that the generated audit-prepared drafts are based on the most relevant and up-to-date participant information.

## 2. Trigger Mechanism

The Goal Review Panel is triggered automatically based on the time elapsed since the last goal review for a given participant.

*   **Condition:** The panel appears if it has been over 90 days since the last goal review for a participant included in the current batch.
*   **Configurability:** The 90-day threshold is configurable within the application settings, allowing organisations to align the prompt with their specific compliance requirements.

## 3. Display and User Interface

The Goal Review Panel is integrated into the batch results screen, designed to be distinct from the primary note processing results.

*   **Location:** The panel is displayed at the bottom of the batch results screen.
*   **Visual Distinction:** The section is visually separated from the traffic light results (Green/Orange/Red) and utilizes purple-coloured cards to draw attention to the required administrative action.
*   **Header Message:** The section includes the following instructional text:
    > "The following participants have goals that haven't been reviewed in over 90 days. To maintain documentation accuracy, please confirm or update each participant's goals before submitting your next batch."

## 4. Card Content and Actions

Each flagged participant is represented by a distinct purple card within the panel.

### 4.1 Card Information

Each card displays the following key information:
*   **Participant Name:** The full name of the participant whose goals require review.
*   **Last Goal Review Date:** The specific date when the goals were last confirmed or updated.
*   **Days Since Review:** A calculated integer representing the number of days elapsed since the last review date.

### 4.2 Interactive Elements

Each card provides two primary action buttons for the user to resolve the flag:

1.  **"No Changes" Button:**
    *   **Function:** Confirms that the participant's current goals are still accurate and relevant.
    *   **Action:** Clicking this button resets the 90-day timer for the participant without altering the goal content.
2.  **"Update" Button:**
    *   **Function:** Allows the user to input new or revised goals for the participant.
    *   **Action:** Clicking this button opens a text box where the updated goals can be entered. This interface includes a "Submit" button to save the new information.

## 5. Blocking Behaviour

To enforce compliance and ensure data accuracy, the Goal Review Panel implements a strict blocking mechanism on subsequent workflows.

*   **Restriction:** The next batch intake process will NOT start until all flagged participants in the current panel have been actioned.
*   **Resolution:** An action is defined as either confirming "No Changes" or successfully submitting an "Update" for every purple card displayed.

## 6. Defer Mechanism

Recognizing that administrators may not always have immediate access to updated goal information, a deferral option is provided to prevent workflow bottlenecks.

*   **Input:** If the updated goals are not currently available, the user can type "N/A" or "Deferred" into the update text box.
*   **Action:** Submitting this specific text logs the deferral action and satisfies the blocking requirement for that participant.
*   **Consequence:** This allows the next batch to proceed. However, the system will display a warning indicating that goal accuracy for the deferred participant may be affected in subsequent processing until a proper update is provided.

## 7. Data Storage and Integration

The Goal Review Panel is deeply integrated with the application's local storage and the AI processing pipeline.

### 7.1 Data Storage

*   **Local Persistence:** When goals are updated (or confirmed via "No Changes"), the changes trigger an immediate update in the participant's saved data profile within the RiteDoc app's local storage.
*   **Timestamps:** The system updates the `last_goal_review_date` field in the local database to the current date upon any successful action.

### 7.2 Integration with the Agent Pipeline

*   **Immediate Application:** Once goals are updated and saved, the new goal data is immediately available to the local AI model (Phi-4-mini Q4_K_M).
*   **Subsequent Processing:** The AI agents will utilize these newly updated goals for the very next batch of notes processed, ensuring that the linking and auditing functions are based on the most current participant objectives.
