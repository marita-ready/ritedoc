# Standard Operating Procedure: CareMaster Integration with RiteDoc

This Standard Operating Procedure (SOP) details the click-by-click process for exporting progress notes from CareMaster, processing them through the RiteDoc compliance engine, and re-importing the audit-prepared drafts back into CareMaster.

## 1. Exporting Progress Notes from CareMaster

The first step is to extract the raw support worker progress notes from CareMaster in a format compatible with RiteDoc. CareMaster provides various reports that can be exported to Excel or CSV formats.

### 1.1 Accessing the Reports Section

1.  Log in to your CareMaster administrator account.
2.  Navigate to the main menu or dashboard.
3.  Locate and click on the **Reports** section or tab. This is typically where all data extraction tools are housed.

### 1.2 Selecting the Appropriate Report

1.  Within the Reports section, look for reports related to "Supports", "Case Notes", or "Progress Notes".
2.  Select the report that best captures the support worker notes you need to process. The "Supports Reports" section is a good starting point [1].
3.  Click on the specific report name to open its configuration page.

### 1.3 Filtering the Data

1.  On the report configuration page, use the available filters to narrow down the data.
2.  Apply a **Date Range** filter to select the specific time frame for the progress notes (e.g., "Last Week" or a custom date range).
3.  Use **Client** or **Support Worker** filters if you need to process notes for specific individuals.
4.  Ensure the report is configured to include the raw note content, client ID, and support worker ID.

### 1.4 Exporting to CSV/Excel

1.  Once the report is filtered correctly, locate the export options.
2.  CareMaster reports typically export in an Excel spreadsheet format by default [1].
3.  Click the **Export** or **Download** button.
4.  If prompted, select **CSV** or **Excel** as the export format.
5.  The file will be generated and downloaded to your local machine. Locate the downloaded file in your computer's "Downloads" folder.
6.  *Note: If the file downloads as an Excel (.xlsx) file, you may need to open it in Excel or Google Sheets and "Save As" a CSV (.csv) file before importing it into RiteDoc.*

## 2. Processing Notes in RiteDoc

With the raw data exported, you will now use RiteDoc to scrub PII and generate audit-prepared drafts.

### 2.1 Importing into RiteDoc

1.  Open the RiteDoc desktop application on your local machine.
2.  On the main dashboard, click the **Import CSV** button.
3.  In the file browser window that appears, navigate to your "Downloads" folder and select the CSV file exported from CareMaster.
4.  Click **Open** to load the file into RiteDoc.

### 2.2 Running the Compliance Engine

1.  Once the file is loaded, RiteDoc will display a summary of the imported notes.
2.  Click the **Process Notes** button to initiate the compliance engine.
3.  RiteDoc will automatically perform the following steps offline:
    *   **PII Scrubbing:** The Nanoclaw scrubber will identify and redact all personally identifiable information, replacing it with standardised tags (e.g., `[Participant]`, `[Support Worker]`).
    *   **AI Rewrite:** The local AI model will rewrite the raw notes into professional, audit-prepared drafts based on the active state cartridge.
    *   **Compliance Scoring:** The engine will evaluate each note against the 5-pillar rubric and assign an internal score.
    *   **Traffic Light Assignment:** Based on the score and identified red flags, each note will be assigned a traffic light indicator (GREEN, ORANGE, RED).

### 2.3 Reviewing the Output

1.  After processing is complete, RiteDoc will display the results in a clear, tabular format.
2.  Review the traffic light indicators:
    *   **GREEN:** The note is audit-ready and requires no further action.
    *   **ORANGE:** The note requires additional information or clarification. Review the bracketed flags (e.g., `[UPPERCASE FIELD — plain English explanation]`) and update the note accordingly.
    *   **RED:** A critical incident or severe compliance risk has been detected. These notes will float to the top of the list for immediate attention.
3.  Make any necessary manual edits directly within the RiteDoc interface.

### 2.4 Exporting the Processed Drafts

1.  Once you are satisfied with the processed notes, click the **Export Processed CSV** button.
2.  Choose a secure location on your local machine to save the new CSV file containing the audit-prepared drafts.

## 3. Re-importing into CareMaster

The final step is to update the original records in CareMaster with the processed, compliant notes.

### 3.1 Using the Import Function

1.  Return to your CareMaster administrator account.
2.  Navigate to the relevant data import section or settings menu. This might be located under an "Admin", "Settings", or "Data Management" tab.
3.  Locate the option to import or update support records or case notes.
4.  Follow the on-screen instructions to upload the processed CSV file generated by RiteDoc.
5.  Map the columns in the CSV file to the corresponding fields in CareMaster (e.g., mapping the "Processed Note" column to the "Case Note" field).
6.  Ensure you use a unique identifier (like the support ID or note ID) to match the records accurately and update existing entries rather than creating duplicates.
7.  Initiate the import process to update the records in bulk.

*Note: The exact menu path for the import function in CareMaster may vary depending on your specific account configuration and the version of the software. Please consult the CareMaster Help Center or your account manager if you cannot locate the tool.*

## References

[1] CareMaster Help Center. "What do the supports reports show?". https://support.caremaster.com.au/en-us/articles/what-do-the-supports-reports-show-S5ihzJKvdB
