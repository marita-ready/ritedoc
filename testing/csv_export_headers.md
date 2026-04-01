# RiteDoc CSV Export Headers Reference

This document details the exact CSV export column headers for the CRM platforms supported by RiteDoc. This information is critical for the pipeline testing and the automated column mapping during the import process.

## 1. ShiftCare

Based on the "Events Report" (Details view) export.

*   **Expected Headers:**
    *   `Date`
    *   `Time`
    *   `Client`
    *   `Staff`
    *   `Category` (e.g., Progress Note, Incident)
    *   `Details` (This column contains the raw note content)
*   *Note: Verification required for the exact casing and presence of additional metadata columns in the latest ShiftCare export format.*

## 2. Brevity

Based on the standard "Data Export" function for Progress Notes/Activities.

*   **Expected Headers:**
    *   `Note ID`
    *   `Date`
    *   `Client Name`
    *   `Employee Name`
    *   `Service Type`
    *   `Progress Note` (This column contains the raw note content)
*   *Note: Verification required for the exact headers, as Brevity allows customisable list views which may alter the exported columns.*

## 3. Lumary

Based on a custom Salesforce report export (Details Only, Comma Delimited).

*   **Expected Headers:**
    *   `Case Note: ID`
    *   `Client: Full Name`
    *   `Created By: Full Name`
    *   `Date/Time Created`
    *   `Subject`
    *   `Case Note Content` (This column contains the raw note content)
*   *Note: Because Lumary relies on Salesforce reporting, the exact headers depend entirely on how the user configures the report. The RiteDoc import mapper must be flexible enough to handle variations like "Description" or "Notes" instead of "Case Note Content".*

## 4. Astalty

Based on the "Support Notes Report" export.

*   **Expected Headers:**
    *   `Created by`
    *   `Created at`
    *   `Participants`
    *   `Content` (This column contains the raw note content)
*   *Note: The "Completed Shifts Export" contains different headers (e.g., `Support Worker`, `Rostered Start Time`, `Clock In Time`). The RiteDoc mapper must distinguish between these two export types.*

## 5. SupportAbility

Based on the "Activity Report" CSV export.

*   **Expected Headers:**
    *   `Activity ID`
    *   `From`
    *   `To`
    *   `Activity Hours`
    *   `Activity Total NDIS Allocated Hrs`
    *   `Site`
    *   `Service`
    *   `Activity`
    *   `Program`
    *   `Location`
    *   `Clients`
    *   `Staff`
    *   `Activity Signed Off`
    *   `Activity Sign Off Date & Time`
    *   `Activity Sign Off Completed By`
    *   `Activity Notes` (This column contains the raw note content - *Verification required, as the documentation does not explicitly list the notes column in the standard Activity Report export, though it is implied for progress note extraction.*)

## 6. CareMaster

Based on the "Supports Reports" Excel/CSV export.

*   **Expected Headers:**
    *   `Support ID`
    *   `Date`
    *   `Client`
    *   `Support Worker`
    *   `Service`
    *   `Case Note` (This column contains the raw note content)
*   *Note: Verification required for the exact headers in the latest CareMaster export format.*
