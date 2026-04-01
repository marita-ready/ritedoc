# Nanoclaw PII Scrubber Rulebook

This document specifies the comprehensive logic and ruleset for the Nanoclaw PII Scrubber, a critical Rust-based component of the RiteDoc compliance pipeline. Its primary function is to identify and redact Personally Identifiable Information (PII) from raw progress notes before they are processed by the local AI engine.

## 1. Core Principles

The Nanoclaw scrubber operates on a "deny-by-default" principle for identified entities. It prioritises aggressive redaction over context preservation to ensure absolute data privacy.

*   **Offline Execution:** The scrubber runs entirely in local memory. No data is transmitted during the scrubbing process.
*   **Pre-Processing:** Scrubbing occurs *before* the note is passed to the llama.cpp inference engine.
*   **Deterministic Output:** The scrubber uses a combination of regex patterns, dictionary lookups, and contextual heuristics to produce consistent redactions.

## 2. Redaction Categories and Replacement Tags

The scrubber identifies specific categories of PII and replaces them with standardised, bracketed tags.

### 2.1 Participants

*   **Target:** The primary subject of the progress note.
*   **Identification:** Extracted from the CSV header (e.g., "Client Name", "Participant") and cross-referenced within the note text.
*   **Replacement Tag:** `[Participant]`
*   **Example:** "John had a good day." -> "`[Participant]` had a good day."

### 2.2 Support Workers

*   **Target:** The author of the note or other staff members mentioned.
*   **Identification:** Extracted from the CSV header (e.g., "Staff", "Employee Name", "Created By") and cross-referenced within the note text.
*   **Replacement Tag:** `[Support Worker]`
*   **Example:** "Sarah assisted with lunch." -> "`[Support Worker]` assisted with lunch."

### 2.3 Associates (Kinship and Relationships)

*   **Target:** Family members, friends, or informal supports mentioned in the note.
*   **Identification:** Dictionary lookup for kinship titles (e.g., "Aunty", "Uncle", "Nan", "Pop", "Mum", "Dad", "Brother", "Sister") followed by a capitalised word (assumed name).
*   **Replacement Tag:** `[Associate]`
*   **Example:** "Aunty Liz visited today." -> "`[Associate]` visited today."
*   **Contextual Rule:** If a kinship title is used without a name (e.g., "His mum called"), the title is retained, but any associated name is redacted.

### 2.4 Medical Professionals and Facilities

*   **Target:** Doctors, therapists, hospitals, or clinics.
*   **Identification:** Dictionary lookup for professional titles (e.g., "Dr.", "Dr", "Doctor", "Nurse", "Physio", "OT") followed by a capitalised word. Regex patterns for common facility suffixes (e.g., "Hospital", "Clinic", "Medical Centre").
*   **Replacement Tag:** `[Medical Professional]` or `[Facility]`
*   **Example:** "Appointment with Dr. Smith at the Royal Melbourne Hospital." -> "Appointment with `[Medical Professional]` at the `[Facility]`."

### 2.5 Locations (Victorian Context)

*   **Target:** Specific addresses, suburbs, or identifiable landmarks.
*   **Identification:** Regex patterns for street addresses (e.g., "123 Fake St"). Dictionary lookup against a comprehensive list of Victorian suburbs and major regional towns.
*   **Replacement Tag:** `[Location]`
*   **Example:** "Went for a walk in Fitzroy." -> "Went for a walk in `[Location]`."

### 2.6 Contact Information

*   **Target:** Phone numbers and email addresses.
*   **Identification:** Standard regex patterns for Australian phone numbers (mobile and landline) and email addresses.
*   **Replacement Tag:** `[Phone]` or `[Email]`
*   **Example:** "Call 0412 345 678 or email test@example.com." -> "Call `[Phone]` or email `[Email]`."

## 3. Edge Cases and Heuristics

The scrubber employs heuristics to handle complex or ambiguous text.

### 3.1 Ambiguous Capitalisation

If a word is capitalised mid-sentence but does not match a known dictionary or CSV header, the scrubber evaluates its context. If it follows a preposition (e.g., "went to [Word]") or a title, it is flagged for potential redaction.

### 3.2 Medication Names

Medication names (e.g., "Panadol", "Risperidone") are generally *not* redacted, as they are crucial for compliance context (e.g., documenting PRN administration). However, specific dosages linked to a person's name are carefully parsed to ensure the name is redacted while the medication context remains.

### 3.3 Slang and Abbreviations

The scrubber includes a dictionary of common NDIS and Australian slang/abbreviations to prevent over-redaction of non-PII terms (e.g., "NDIA", "LAC", "SIL", "SDA").

## 4. Implementation in Rust

The Nanoclaw scrubber is implemented as a high-performance Rust module.

*   **Regex Engine:** Utilises the `regex` crate for fast pattern matching.
*   **Aho-Corasick:** Employs the `aho-corasick` crate for efficient, simultaneous dictionary lookups (e.g., scanning for hundreds of Victorian suburbs in a single pass).
*   **Memory Safety:** Rust's ownership model ensures that the scrubbing process does not introduce memory leaks or vulnerabilities, critical for handling sensitive data locally.
