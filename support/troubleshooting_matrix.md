# RiteDoc Troubleshooting Matrix

This document serves as the central knowledge base for all automated support systems (Tauri Self-Fix, Dify Bot, and Retell AI). It categorises every known client issue, its symptoms, and the step-by-step resolution path.

## 1. Installation Issues

### 1.1 Antivirus Blocking Installation

*   **Symptoms:** Windows Defender or third-party antivirus flags the RiteDoc installer as suspicious or blocks the installation process.
*   **Auto-Diagnosis Check:** N/A (Occurs before the app is installed).
*   **Self-Fix Attempt:** N/A.
*   **Dify Walkthrough Script:** "It looks like your antivirus software might be blocking the installation. This is common for new software. Please open your antivirus settings and add an exception or 'allow' rule for the RiteDoc installer file. If you're using Windows Defender, click 'More info' and then 'Run anyway'."
*   **Retell Phone Script:** "I understand your antivirus is blocking the installation. This happens because our software is new. Can you tell me which antivirus program you are using? [Wait for response]. Okay, please open [Antivirus Name] and look for a setting called 'Exceptions' or 'Allowed Threats'. Add the RiteDoc installer to that list and try running it again."

## 2. Licence Key Problems

### 2.1 Invalid or Expired Key

*   **Symptoms:** The app displays an "Invalid Licence Key" error on startup or during processing.
*   **Auto-Diagnosis Check:** The Tauri backend pings the Supabase database with the entered key and receives a 'false' or 'expired' response.
*   **Self-Fix Attempt:** The app automatically retries the validation ping once after 5 seconds to rule out a transient network error.
*   **Dify Walkthrough Script:** "The licence key you entered appears to be invalid or expired. Please double-check the key in your welcome email and ensure there are no extra spaces before or after it. If you recently renewed, it may take a few minutes to update."
*   **Retell Phone Script:** "I see you're having trouble with your licence key. Could you please read the key to me slowly, character by character? [Wait for response]. Thank you. Let me check that against our database. It appears that key is [invalid/expired]. Let's get that sorted out for you."

## 3. Processing Speed

### 3.1 Extremely Slow Processing (Standard Mode)

*   **Symptoms:** Processing a small batch of notes takes significantly longer than expected (e.g., >5 minutes for 10 notes).
*   **Auto-Diagnosis Check:** The app monitors the time taken per note. If it exceeds the threshold for the detected hardware, it flags a performance issue.
*   **Self-Fix Attempt:** The app attempts to clear its internal cache and restart the local AI model (llama.cpp) silently.
*   **Dify Walkthrough Script:** "RiteDoc is running slower than usual. This often happens if your computer is running low on memory. Please close any other large applications, like web browsers with many tabs open, or video editing software, and try processing the notes again."
*   **Retell Phone Script:** "I understand the compliance engine is running slowly. Our system indicates your computer might be low on available memory. Could you please close any other programs you have open, especially web browsers, and let me know if the speed improves?"

## 4. CSV Import Errors

### 4.1 Incorrect File Format or Missing Columns

*   **Symptoms:** The app fails to import the CSV file, displaying an error about missing required columns (e.g., "Note Content" or "Client ID").
*   **Auto-Diagnosis Check:** The app parses the CSV headers upon import. If the required headers for the selected CRM (ShiftCare, Brevity, etc.) are missing, it throws an error.
*   **Self-Fix Attempt:** The app attempts to auto-map columns based on common variations (e.g., mapping "Progress Note" to "Note Content").
*   **Dify Walkthrough Script:** "The file you imported doesn't seem to have the correct columns. Please ensure you exported the file exactly as described in the SOP for your CRM (e.g., ShiftCare Events Report). The file must contain the raw note content."
*   **Retell Phone Script:** "It sounds like the CSV file might be missing some required information. Which CRM did you export the notes from? [Wait for response]. Okay, for [CRM Name], please make sure you are exporting the [Specific Report Name] and that it includes the actual text of the progress notes."

## 5. Update Issues

### 5.1 Cartridge Update Failure

*   **Symptoms:** The app fails to download or apply the latest state compliance cartridge.
*   **Auto-Diagnosis Check:** The app checks the local cartridge version against the latest version on the server. If the download fails or the JSON is malformed, it flags an error.
*   **Self-Fix Attempt:** The app automatically retries the download up to three times. If it fails, it reverts to the previously installed, working cartridge.
*   **Dify Walkthrough Script:** "RiteDoc was unable to download the latest compliance updates. This is usually due to a temporary internet connection issue. We've reverted to your previous settings so you can keep working. Please check your internet connection and restart the app later to try updating again."
*   **Retell Phone Script:** "I see the app had trouble downloading the latest compliance rules. Don't worry, it has automatically switched back to the previous version so you can continue working. This is usually a temporary internet hiccup. Could you try restarting your router or checking your connection?"

## 6. Hardware Limitations

### 6.1 Insufficient RAM for Turbo Mode

*   **Symptoms:** The app crashes or freezes when attempting to run in Turbo Mode (3 agents) on a machine with borderline specifications.
*   **Auto-Diagnosis Check:** The app checks available RAM before initiating Turbo Mode. If it falls below the required threshold (e.g., 16GB dedicated), it flags a hardware limitation.
*   **Self-Fix Attempt:** The app automatically downgrades the processing mode to Standard Mode (2 agents) and notifies the user.
*   **Dify Walkthrough Script:** "Your computer doesn't have quite enough available memory to run RiteDoc in Turbo Mode right now. We've automatically switched you to Standard Mode so you can continue processing notes. It might be slightly slower, but it will still work perfectly."
*   **Retell Phone Script:** "Our system detected that your computer is running low on memory, so it automatically switched RiteDoc to Standard Mode to prevent it from crashing. This just means it uses two AI agents instead of three. It will still process your notes accurately, just a bit slower."

## 7. Model Loading Errors

### 7.1 Corrupted Model File

*   **Symptoms:** The app fails to start the compliance engine, displaying a "Model Load Error".
*   **Auto-Diagnosis Check:** The app verifies the checksum of the local Phi-4-mini Q4_K_M model file against the expected value. If they don't match, the file is corrupted.
*   **Self-Fix Attempt:** The app deletes the corrupted model file and initiates a background re-download of the correct file from the server.
*   **Dify Walkthrough Script:** "It looks like the core compliance engine file was corrupted. RiteDoc is automatically re-downloading a fresh copy in the background. This might take a few minutes depending on your internet speed. Please leave the app open until it finishes."
*   **Retell Phone Script:** "I see there's an issue loading the compliance engine. The good news is that RiteDoc has already detected this and is downloading a fresh copy of the necessary files. Depending on your internet connection, this might take 5 to 10 minutes. Could you leave the app open and let me know when the download completes?"
