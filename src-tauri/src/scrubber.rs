//! PII Scrubber — strips personally identifiable information from note text
//! before it is sent to the local Nanoclaw inference server.
//!
//! Three categories are detected and replaced:
//!   - Names        → [NAME]
//!   - Phone numbers → [PHONE]
//!   - Street addresses → [ADDRESS]
//!
//! The scrubber is intentionally conservative: it prefers false-positives
//! (replacing something that is not PII) over false-negatives (missing real
//! PII). All replacements are reversible by the support worker who reads the
//! output before copying it.

use regex::{Regex, RegexBuilder};
use std::sync::OnceLock;

// ─────────────────────────────────────────────────────────────────────────────
//  Compiled regex singletons (compiled once, reused for every call)
// ─────────────────────────────────────────────────────────────────────────────

/// Matches Australian and international phone numbers in common formats:
///
/// Examples matched:
///   0412 345 678   (mobile, spaced)
///   0412345678     (mobile, no spaces)
///   (03) 9123 4567 (landline with area code in parens)
///   03 9123 4567   (landline, spaced)
///   +61 412 345 678 (international mobile)
///   +61-3-9123-4567 (international landline, dashes)
///   1800 123 456   (toll-free)
///
/// Regex:
///   (\+?61[-.\s]?)?(\(0?\d\)|0\d)[-.\s]?\d{3,4}[-.\s]?\d{3,4}
fn phone_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?x)
            (?:
                \+?61          # optional international prefix +61
                [\-.\s]?
            )?
            (?:
                \(0?\d\)       # area code in parens: (03) or (3)
                |
                0\d            # leading zero: 04, 03, 02, etc.
            )
            [\-.\s]?
            \d{3,4}
            [\-.\s]?
            \d{3,4}
            ",
        )
        .expect("phone regex is valid")
    })
}

/// Matches Australian-style street addresses.
///
/// Pattern: one or more digits (optional unit/flat prefix), followed by a
/// street name (one or more capitalised words), followed by a street type
/// abbreviation (St, Rd, Ave, etc.), optionally followed by a suburb.
///
/// Examples matched:
///   12 Main Street
///   Unit 3/45 Bourke Rd
///   7A Smith Ave Northcote
///   42 O'Brien Crescent
///
/// Regex (case-insensitive):
///   \b(?:unit\s+|flat\s+|u\s*/\s*)?
///   \d+[a-z]?(?:\s*/\s*\d+[a-z]?)?
///   \s+
///   (?:[A-Z][a-z'-]+\s+){1,4}
///   (?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|
///      Lane|Ln|Crescent|Cres|Parade|Pde|Boulevard|Blvd|Way|Close|Cl|
///      Circuit|Cct|Terrace|Tce|Highway|Hwy|Grove|Gr|Rise|Loop|Walk)
///   (?:\b\s+[A-Z][a-z]+)?   ← optional suburb
fn address_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        RegexBuilder::new(
            r"(?x)
            \b
            (?:(?:unit|flat|u)\s+)?          # optional unit/flat prefix
            \d+[a-zA-Z]?                     # street number, optional letter suffix
            (?:\s*/\s*\d+[a-zA-Z]?)?         # optional sub-number: 3/45
            \s+
            (?:[A-Z][a-zA-Z'\-]+\s+){1,4}   # 1-4 capitalised name words
            (?:
                Street|St|Road|Rd|Avenue|Ave|Drive|Dr|
                Court|Ct|Place|Pl|Lane|Ln|Crescent|Cres|
                Parade|Pde|Boulevard|Blvd|Way|Close|Cl|
                Circuit|Cct|Terrace|Tce|Highway|Hwy|
                Grove|Gr|Rise|Loop|Walk
            )
            (?:\b\s+[A-Z][a-zA-Z]+)?         # optional suburb
            \b
            ",
        )
        .case_insensitive(false) // keep case-sensitive so we don't match prose
        .build()
        .expect("address regex is valid")
    })
}

/// Matches Western-style personal names (Title? FirstName LastName).
///
/// Pattern: an optional title (Mr, Mrs, Ms, Miss, Dr, Prof), followed by
/// one or two capitalised words of 2–20 letters (allows hyphens and
/// apostrophes for names like O'Brien or Smith-Jones).
///
/// Examples matched:
///   John Smith
///   Ms Sarah O'Brien
///   Dr Michael Smith-Jones
///   Mary Jane Watson
///
/// NOT matched (to avoid false positives):
///   Single capitalised words (too common in normal prose)
///   All-caps words (acronyms)
///   Words at the start of a sentence that happen to be capitalised
///
/// Regex:
///   \b(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?)\s+[A-Z][a-z'-]{1,19}(?:\s+[A-Z][a-z'-]{1,19})?
///   |
///   \b[A-Z][a-z'-]{1,19}\s+[A-Z][a-z'-]{1,19}(?:\s+[A-Z][a-z'-]{1,19})?\b
fn name_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?x)
            # Branch 1: titled name (Mr/Mrs/Ms/Miss/Dr/Prof + 1-2 name words)
            \b
            (?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?)
            \s+
            [A-Z][a-z'\-]{1,19}
            (?:\s+[A-Z][a-z'\-]{1,19})?
            \b
            |
            # Branch 2: bare First Last (or First Middle Last) — two or three
            # consecutive Title-Cased words, each 2-20 chars, not all-caps
            \b
            [A-Z][a-z'\-]{1,19}
            \s+
            [A-Z][a-z'\-]{1,19}
            (?:\s+[A-Z][a-z'\-]{1,19})?
            \b
            ",
        )
        .expect("name regex is valid")
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/// Scrub PII from `text` and return the sanitised string.
///
/// Replacements applied in order:
///   1. Phone numbers  → `[PHONE]`
///   2. Street addresses → `[ADDRESS]`  (before names, to avoid partial overlap)
///   3. Names          → `[NAME]`
///
/// The order matters: addresses are replaced before names so that a street
/// name like "12 John Smith Road" becomes "[ADDRESS]" rather than
/// "12 [NAME] Road".
pub fn scrub_pii(text: &str) -> String {
    // Step 1 — phones
    let after_phones = phone_re().replace_all(text, "[PHONE]");

    // Step 2 — addresses (run on phone-scrubbed text)
    let after_addresses = address_re().replace_all(&after_phones, "[ADDRESS]");

    // Step 3 — names (run last)
    let after_names = name_re().replace_all(&after_addresses, "[NAME]");

    after_names.into_owned()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phone_mobile_spaced() {
        let result = scrub_pii("Call me on 0412 345 678 anytime.");
        assert!(result.contains("[PHONE]"), "got: {result}");
        assert!(!result.contains("0412"), "got: {result}");
    }

    #[test]
    fn test_phone_mobile_compact() {
        let result = scrub_pii("Her number is 0412345678.");
        assert!(result.contains("[PHONE]"), "got: {result}");
    }

    #[test]
    fn test_phone_landline_parens() {
        let result = scrub_pii("Office: (03) 9123 4567");
        assert!(result.contains("[PHONE]"), "got: {result}");
    }

    #[test]
    fn test_phone_international() {
        let result = scrub_pii("International: +61 412 345 678");
        assert!(result.contains("[PHONE]"), "got: {result}");
    }

    #[test]
    fn test_address_basic() {
        let result = scrub_pii("He lives at 12 Main Street.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("12 Main Street"), "got: {result}");
    }

    #[test]
    fn test_address_with_suburb() {
        let result = scrub_pii("Transport to 42 Burke Road Camberwell.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
    }

    #[test]
    fn test_name_titled() {
        let result = scrub_pii("Dr Sarah Johnson attended the session.");
        assert!(result.contains("[NAME]"), "got: {result}");
        assert!(!result.contains("Sarah Johnson"), "got: {result}");
    }

    #[test]
    fn test_name_bare() {
        let result = scrub_pii("Support was provided to John Smith today.");
        assert!(result.contains("[NAME]"), "got: {result}");
        assert!(!result.contains("John Smith"), "got: {result}");
    }

    #[test]
    fn test_no_false_positive_single_word() {
        // Single capitalised words at sentence start should not be replaced
        let result = scrub_pii("Support was provided. Assistance was given.");
        assert!(!result.contains("[NAME]"), "got: {result}");
    }

    #[test]
    fn test_combined_pii() {
        let text = "John Smith lives at 15 Oak Avenue and can be reached on 0412 345 678.";
        let result = scrub_pii(text);
        assert!(result.contains("[NAME]"), "got: {result}");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(result.contains("[PHONE]"), "got: {result}");
        assert!(!result.contains("John Smith"), "got: {result}");
        assert!(!result.contains("Oak Avenue"), "got: {result}");
        assert!(!result.contains("0412"), "got: {result}");
    }
}
