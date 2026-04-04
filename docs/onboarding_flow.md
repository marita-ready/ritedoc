# RiteDoc Onboarding Flow

This document outlines the guided first-run experience for new users of the RiteDoc application. RiteDoc is an offline Windows desktop application built with Tauri 2.0, designed specifically for NDIS provider administration teams. The onboarding flow ensures that users' hardware meets the necessary requirements, validates their license, and provides a clear introduction to the core workflow.

## Overview of the First-Run Experience

When a user installs and opens RiteDoc for the first time, they are presented with a mandatory, sequential onboarding process. This process is designed to be seamless and informative, minimizing friction while ensuring the application is correctly configured for their specific environment and NDIS platform.

The onboarding flow consists of six primary steps, beginning with an automated hardware check and concluding with a guided walkthrough of the application's core functionality. Users cannot skip the initial configuration steps (Steps 1 through 4), as these are critical for the application's operation.

## Step 1: Hardware Check (Automatic and Silent)

Upon the initial launch, RiteDoc performs an automated, silent hardware diagnostic to ensure the host system meets the minimum requirements for running the local AI models. This check is handled by the built-in self-fix system.

The application verifies the following system specifications:
*   **Random Access Memory (RAM):** A minimum of 16GB is strictly required.
*   **Processor Capabilities:** Checks for necessary instruction sets.
*   **Disk Space:** Ensures sufficient storage for the application, models, and temporary processing files.
*   **Operating System Version:** Verifies compatibility with the Windows environment.

**Outcomes of the Hardware Check:**

*   **Below Minimum Requirements:** If the system fails to meet the minimum specifications (e.g., less than 16GB of RAM), the application halts the onboarding process. The user is presented with a clear, blocking message: "Your computer does not meet the minimum requirements for RiteDoc. 16GB RAM required." The application will not proceed further.
*   **Meets Minimum Requirements:** If the system passes the checks, the application automatically determines the optimal processing mode based on the available hardware.
    *   **Standard Mode:** Selected if no compatible Graphics Processing Unit (GPU) is detected. The application will rely on the CPU for processing.
    *   **Turbo Mode:** Selected if a compatible GPU is detected, allowing for accelerated processing.

Following the check, the user is shown a brief notification indicating which mode (Standard or Turbo) was selected and the reasoning behind the selection, ensuring transparency regarding the application's performance profile.

## Step 2: Activation

Once the hardware is verified, the user must activate their copy of RiteDoc. This step requires a one-time internet connection to validate the license against the central database.

1.  **Key Entry:** The user is prompted to enter their unique activation key, which they received via email following their purchase.
2.  **Validation:** The application securely transmits the key to the Supabase backend for verification.
3.  **Activation Success:** If the key is valid, the application activates and stores the license status locally. From this point forward, RiteDoc can operate entirely offline without requiring further internet connectivity for core functions.
4.  **Activation Failure:** If the key is invalid, expired, or cannot be verified, the user receives a clear error message along with contact information for customer support.

## Step 3: Welcome Screen

After successful activation, the user is greeted with the Welcome Screen. This screen provides a concise overview of RiteDoc's purpose and its primary workflow.

*   **Application Purpose:** A brief, plain-English paragraph explains that RiteDoc automates the review and formatting of NDIS support worker notes, ensuring compliance and saving administrative time.
*   **The 3-Step Workflow:** The core process is visually outlined:
    1.  **Export CSV:** Export notes from the chosen NDIS platform.
    2.  **Import into RiteDoc:** Load the CSV file into the application for processing.
    3.  **Review and Copy:** Review the processed drafts and copy them back to the NDIS platform.
*   **Traffic Light System:** The screen introduces the application's visual feedback system for note compliance:
    *   **Green:** The note is compliant and ready to use.
    *   **Orange:** The note requires minor review or adjustments.
    *   **Red:** The note has significant issues or missing information that must be addressed.

## Step 4: Platform Selection

RiteDoc supports integration with multiple NDIS platforms. In this step, the user configures the application to match their specific system.

*   **Platform Dropdown:** The user is asked, "Which platform do you use?" and presented with a dropdown menu containing the supported platforms:
    *   ShiftCare
    *   Brevity
    *   SupportAbility
    *   Lumary
    *   CareMaster
    *   Astalty
    *   Other
*   **Clipboard Configuration:** Selecting a platform configures RiteDoc's platform-aware clipboard. This ensures that when a user clicks a "copy" button within RiteDoc, the data is formatted correctly to match the specific fields and structure of their chosen NDIS platform.
*   **Future Adjustments:** The user is informed that this selection is not permanent and can be changed at any time via the application's Settings screen.

## Step 5: First Import Walkthrough

To ensure users are comfortable with the application, the onboarding flow concludes with a guided, interactive walkthrough of the import process.

*   **Guided Interaction:** The application highlights exactly where the user needs to click to initiate an import and explains what to expect at each stage.
*   **Sample Processing:** The user is guided to process a small sample file (typically the first 3 to 5 notes). This allows them to see the processing speed and the resulting output quickly, without waiting for a large batch to complete.
*   **Result Explanation:** Once the sample notes are processed, the walkthrough explains the results, reinforcing the meaning of the Green, Orange, and Red traffic light indicators introduced on the Welcome Screen.

## Step 6: Ready to Go

The final step confirms that the user has successfully completed the onboarding process and is ready to use RiteDoc.

*   **Confirmation:** A clear "You're all set!" message is displayed.
*   **Quick Reference:** The screen provides a quick reference card highlighting essential keyboard shortcuts and the functions of key buttons within the interface.
*   **Support Access:** A link to the in-app help documentation is provided for future reference.
*   **Completion Flag:** Upon reaching this screen, an "onboarding complete" flag is stored locally in the application's configuration. This ensures that the onboarding flow is not displayed on subsequent launches.

## Additional Considerations

### Skipping Onboarding

The onboarding process is mandatory. Users are not permitted to skip the initial configuration. At a minimum, Steps 1 through 4 (Hardware Check, Activation, Welcome Screen, and Platform Selection) must be completed before the user can access the main application interface.

### Subsequent Launches

Once the onboarding complete flag is set, subsequent launches of RiteDoc will bypass the onboarding flow entirely. The application will open directly to the main import screen, allowing users to begin their work immediately.

### Settings Screen

Users can manage their configuration post-onboarding via the Settings screen. This area allows them to:
*   Change their selected NDIS platform.
*   View their current activation status and license details.
*   Check for application updates.
