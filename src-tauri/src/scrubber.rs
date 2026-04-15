//! PII Scrubber — strips personally identifiable information from note text
//! before it is sent to the local Nanoclaw inference server.
//!
//! Five categories are detected and replaced under a unified [ADDRESS] tag:
//!   - Phone numbers     → [PHONE]
//!   - Street addresses  → [ADDRESS]
//!   - Suburb/town names → [ADDRESS]  (16,220 ABS localities compiled into binary)
//!   - State names       → [ADDRESS]
//!   - Postcodes         → [ADDRESS]
//!   - Personal names    → [NAME]
//!
//! A robust whitelist prevents common English words that happen to be suburb
//! names (e.g. "Sale", "Orange", "Young") from being false-positive scrubbed.
//!
//! The locality list is loaded at compile time via `include_str!()` — zero
//! internet access required at runtime.

use regex::{Regex, RegexBuilder};
use std::collections::HashSet;
use std::sync::OnceLock;

// ─────────────────────────────────────────────────────────────────────────────
//  Locality list — compiled into the binary at build time
// ─────────────────────────────────────────────────────────────────────────────

/// 16,220 Australian suburbs/towns/localities from the ABS dataset.
/// One locality per line, title-cased.
const LOCALITIES_RAW: &str = include_str!("localities.txt");

/// Returns a `HashSet` of all locality names (lowercased) for O(1) lookup.
fn localities() -> &'static HashSet<String> {
    static SET: OnceLock<HashSet<String>> = OnceLock::new();
    SET.get_or_init(|| {
        let mut set = HashSet::with_capacity(17_000);
        for line in LOCALITIES_RAW.lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                set.insert(trimmed.to_lowercase());
            }
        }
        // Also add Australian state names and abbreviations
        for state in &[
            "vic", "victoria",
            "nsw", "new south wales",
            "qld", "queensland",
            "sa", "south australia",
            "wa", "western australia",
            "tas", "tasmania",
            "nt", "northern territory",
            "act", "australian capital territory",
        ] {
            set.insert(state.to_string());
        }
        set
    })
}

/// Returns a `HashSet` of common English words that are also suburb names.
/// These are EXCLUDED from locality matching to avoid false positives.
///
/// The whitelist is intentionally broad — it is better to miss a suburb name
/// than to scrub a common English word from a support note.
fn whitelist() -> &'static HashSet<&'static str> {
    static SET: OnceLock<HashSet<&'static str>> = OnceLock::new();
    SET.get_or_init(|| {
        let words: &[&str] = &[
            // ── Common English words that are Australian suburbs ──
            // (identified by cross-referencing ABS locality list against
            //  top-3000 English words + NDIS vocabulary)

            // Common nouns / verbs / adjectives
            "abbey", "field", "forest", "hall", "lock", "orange", "page",
            "plenty", "prospect", "research", "sale", "senior", "short",
            "speed", "success", "university", "wall",

            // Colours
            "amber", "bright", "emerald", "grey", "ruby",

            // First names (very common in English, would cause massive
            // false positives in NDIS notes mentioning people)
            "abbey", "albert", "alice", "amber", "anthony", "archer",
            "ashley", "barry", "barton", "bell", "berry", "bolton",
            "bower", "brandon", "brenda", "bright", "bruce", "burton",
            "butler", "carlton", "caroline", "charlotte", "clifton",
            "collins", "cook", "dale", "darwin", "dean", "don", "douglas",
            "eden", "elizabeth", "eureka", "fisher", "fletcher", "foster",
            "fox", "franklin", "gordon", "grey", "hamilton", "hampton",
            "hardy", "harvey", "haven", "hayes", "howard", "hunter",
            "julia", "katherine", "keith", "kelly", "kelvin", "kingston",
            "laura", "lawson", "leslie", "lloyd", "logan", "martin",
            "maxwell", "megan", "miller", "mitchell", "moore", "morgan",
            "murray", "nathan", "nelson", "newton", "norman", "officer",
            "palmer", "patrick", "preston", "price", "reid", "rhodes",
            "richmond", "ross", "russell", "ryan", "sharon", "shaw",
            "sheldon", "shirley", "spencer", "stanley", "stuart", "sutton",
            "taylor", "turner", "virginia", "wallace", "ward", "warren",
            "watson", "wilson", "windsor", "wright", "young",

            // Additional common English words that are also suburbs
            // (discovered by manual review of the single-word locality list)
            "alma", "alpha", "alpine", "avon", "baker", "banana",
            "bath", "bishop", "bluff", "brook", "cape", "castle",
            "chester", "clay", "clover", "clyde", "cole", "coral",
            "cotton", "crystal", "diamond", "dover", "eagle", "faith",
            "flora", "glen", "golden", "grace", "granite", "heath",
            "hill", "hope", "iris", "ivy", "jade", "jasper", "jean",
            "jersey", "kent", "lake", "lane", "lily", "lincoln",
            "lodge", "mason", "mercer", "miles", "noble", "norton",
            "olive", "oscar", "park", "pearl", "perry", "porter",
            "ray", "reed", "river", "robin", "rocky", "rosa", "rose",
            "ross", "sandy", "scott", "spring", "sterling", "stone",
            "summer", "temple", "troy", "vale", "violet", "wade",
            "walker", "wells", "wesley", "wheeler", "winter", "wood",

            // NDIS-specific vocabulary that overlaps with suburb names
            "city", "community", "camp", "home", "hay",
            "moss", "bell", "berry", "cook", "dale",

            // Days / months that are also suburb names
            "may", "june",

            // Directional words (common in prose, also suburb prefixes)
            "north", "south", "east", "west",

            // State abbreviations (2-3 letter) — these are handled
            // separately by the state regex, but also whitelisted here
            // to prevent the locality lookup from matching them in prose
            // when they appear as standalone words
            "sa", "wa", "nt", "act",
        ];
        words.iter().copied().collect()
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Compiled regex singletons (compiled once, reused for every call)
// ─────────────────────────────────────────────────────────────────────────────

/// Matches Australian and international phone numbers in common formats.
///
/// Two branches:
///   Branch A: 10-digit mobile  — 04XX[sep]XXX[sep]XXX
///   Branch B: landline / other — (0X)[sep]XXXX[sep]XXXX or 0X[sep]XXXX[sep]XXXX
fn phone_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?x)
            (?:
                # Branch A1: international mobile +61[sep]4XX[sep]XXX[sep]XXX
                \+?61[\-\.\s]?
                [45]\d{2}             # 4XX or 5XX (no leading 0)
                [\-\.\s]?\d{3}       # sep + 3 digits
                [\-\.\s]?\d{3}       # sep + 3 digits
            |
                # Branch A2: domestic mobile 04XX[sep]XXX[sep]XXX
                0[45]\d{2}           # 04XX or 05XX
                [\-\.\s]?\d{3}       # sep + 3 digits
                [\-\.\s]?\d{3}       # sep + 3 digits
            |
                # Branch B: landline / 1800 / other
                (?:\+?61[\-\.\s]?)?
                (?:\(0?\d\)|0[23789]|1[38]00)
                [\-\.\s]?\d{3,4}
                [\-\.\s]?\d{3,4}
            )
            ",
        )
        .expect("phone regex is valid")
    })
}

/// Matches Australian-style street addresses.
///
/// Pattern: optional unit/flat prefix, street number, 1-4 capitalised words,
/// street type suffix, optional trailing suburb.
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
        .case_insensitive(false)
        .build()
        .expect("address regex is valid")
    })
}

/// Matches Australian postcodes: 4-digit numbers starting with 2–8.
fn postcode_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(r"\b[2-8]\d{3}\b").expect("postcode regex is valid")
    })
}

/// Matches Australian state names and abbreviations as standalone words.
///
/// Case-insensitive for abbreviations (VIC, Vic, vic all match).
/// Full names require title case (e.g. "Victoria" not "victoria").
fn state_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?x)
            \b
            (?:
                # Abbreviations (case-insensitive via [Vv][Ii][Cc] etc.)
                [Vv][Ii][Cc]
                | [Nn][Ss][Ww]
                | [Qq][Ll][Dd]
                | [Tt][Aa][Ss]
                | [Aa][Cc][Tt]
                # Full names (title-cased)
                | Victoria
                | Queensland
                | Tasmania
                # Multi-word states handled separately below
            )
            \b
            ",
        )
        .expect("state regex is valid")
    })
}

/// Matches multi-word state names: "New South Wales", "South Australia",
/// "Western Australia", "Northern Territory", "Australian Capital Territory".
fn state_multiword_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| {
        Regex::new(
            r"(?x)
            \b
            (?:
                New\s+South\s+Wales
                | South\s+Australia
                | Western\s+Australia
                | Northern\s+Territory
                | Australian\s+Capital\s+Territory
            )
            \b
            ",
        )
        .expect("state multiword regex is valid")
    })
}

/// Matches Western-style personal names (Title? FirstName LastName).
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
            # Branch 2: bare First Last (or First Middle Last)
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
//  Locality word-boundary matching
// ─────────────────────────────────────────────────────────────────────────────

/// Scan `text` for any word or multi-word sequence that matches a known
/// Australian locality (from the ABS list) and is NOT on the whitelist.
///
/// Returns the text with all matched localities replaced by `[ADDRESS]`.
///
/// Strategy:
///   1. Try matching multi-word localities first (longest match wins).
///      We check 3-word, then 2-word sequences.
///   2. Then check single words.
///   3. Only match words that start with an uppercase letter (title-cased)
///      to avoid matching lowercase occurrences in prose.
///   4. Skip any word on the whitelist.
fn scrub_localities(text: &str) -> String {
    let locs = localities();
    let wl = whitelist();

    // Split text into tokens while preserving whitespace and punctuation.
    // We use a simple approach: iterate character by character, building
    // "word" tokens (alphanumeric + apostrophe + hyphen) and "separator"
    // tokens (everything else).
    let mut tokens: Vec<(String, bool)> = Vec::new(); // (text, is_word)
    let mut current = String::new();
    let mut in_word = false;

    for ch in text.chars() {
        let is_word_char = ch.is_alphanumeric() || ch == '\'' || ch == '-';
        if is_word_char == in_word {
            current.push(ch);
        } else {
            if !current.is_empty() {
                tokens.push((current.clone(), in_word));
                current.clear();
            }
            current.push(ch);
            in_word = is_word_char;
        }
    }
    if !current.is_empty() {
        tokens.push((current, in_word));
    }

    // Collect indices of word tokens
    let word_indices: Vec<usize> = tokens
        .iter()
        .enumerate()
        .filter(|(_, (_, is_w))| *is_w)
        .map(|(i, _)| i)
        .collect();

    // Track which tokens have been replaced
    let mut replaced: Vec<bool> = vec![false; tokens.len()];

    // Try 3-word locality matches first
    for window in word_indices.windows(3) {
        let (i0, i1, i2) = (window[0], window[1], window[2]);
        if replaced[i0] || replaced[i1] || replaced[i2] {
            continue;
        }
        let w0 = &tokens[i0].0;
        let w1 = &tokens[i1].0;
        let w2 = &tokens[i2].0;
        // Must start with uppercase
        if !w0.starts_with(|c: char| c.is_uppercase()) {
            continue;
        }
        let combined = format!("{} {} {}", w0, w1, w2);
        let combined_lower = combined.to_lowercase();
        if locs.contains(&combined_lower) && !wl.contains(combined_lower.as_str()) {
            // Replace all three word tokens and the separators between them
            for idx in i0..=i2 {
                replaced[idx] = true;
            }
            tokens[i0].0 = "[ADDRESS]".to_string();
            for idx in (i0 + 1)..=i2 {
                tokens[idx].0 = String::new();
            }
        }
    }

    // Try 2-word locality matches
    for window in word_indices.windows(2) {
        let (i0, i1) = (window[0], window[1]);
        if replaced[i0] || replaced[i1] {
            continue;
        }
        let w0 = &tokens[i0].0;
        let w1 = &tokens[i1].0;
        if !w0.starts_with(|c: char| c.is_uppercase()) {
            continue;
        }
        let combined = format!("{} {}", w0, w1);
        let combined_lower = combined.to_lowercase();
        if locs.contains(&combined_lower) && !wl.contains(combined_lower.as_str()) {
            for idx in i0..=i1 {
                replaced[idx] = true;
            }
            tokens[i0].0 = "[ADDRESS]".to_string();
            for idx in (i0 + 1)..=i1 {
                tokens[idx].0 = String::new();
            }
        }
    }

    // Try single-word locality matches
    for &idx in &word_indices {
        if replaced[idx] {
            continue;
        }
        let word = &tokens[idx].0;
        // Must start with uppercase letter (title-cased)
        if !word.starts_with(|c: char| c.is_uppercase()) {
            continue;
        }
        let word_lower = word.to_lowercase();
        // Skip if on the whitelist
        if wl.contains(word_lower.as_str()) {
            continue;
        }
        // Skip very short words (1-2 chars) — too many false positives
        if word.len() <= 2 {
            continue;
        }
        if locs.contains(&word_lower) {
            tokens[idx].0 = "[ADDRESS]".to_string();
            replaced[idx] = true;
        }
    }

    // Rebuild the text
    tokens.iter().map(|(t, _)| t.as_str()).collect()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/// Scrub PII from `text` and return the sanitised string.
///
/// Replacements applied in order:
///   1. Phone numbers         → `[PHONE]`
///   2. Street addresses      → `[ADDRESS]`  (regex-based, catches "12 Main St")
///   3. Multi-word state names → `[ADDRESS]`  (e.g. "New South Wales")
///   4. Single-word state names/abbrevs → `[ADDRESS]` (e.g. "VIC", "Victoria")
///   5. Suburb/town names     → `[ADDRESS]`  (16,220 ABS localities, HashSet lookup)
///   6. Postcodes             → `[ADDRESS]`  (4-digit, 2xxx–8xxx)
///   7. Personal names        → `[NAME]`
pub fn scrub_pii(text: &str) -> String {
    // Step 1 — phones
    let result = phone_re().replace_all(text, "[PHONE]");

    // Step 2 — street addresses (regex-based, before locality lookup)
    let result = address_re().replace_all(&result, "[ADDRESS]");

    // Step 3 — multi-word state names (before single-word to avoid partial matches)
    let result = state_multiword_re().replace_all(&result, "[ADDRESS]");

    // Step 4 — single-word state names and abbreviations
    let result = state_re().replace_all(&result, "[ADDRESS]");

    // Step 5 — suburb/town names (ABS locality HashSet lookup)
    let result = scrub_localities(&result);

    // Step 6 — postcodes (after localities, so "Mornington 3931" → "[ADDRESS] [ADDRESS]")
    let result = postcode_re().replace_all(&result, "[ADDRESS]");

    // Step 7 — personal names (last, to avoid scrubbing suburb names as names)
    let result = name_re().replace_all(&result, "[NAME]");

    result.into_owned()
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
        let result = scrub_pii("Support was provided. Assistance was given.");
        assert!(!result.contains("[NAME]"), "got: {result}");
    }

    #[test]
    fn test_locality_mornington() {
        let result = scrub_pii("She lives in Mornington.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("Mornington"), "got: {result}");
    }

    #[test]
    fn test_locality_frankston() {
        let result = scrub_pii("She works at Frankston.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("Frankston"), "got: {result}");
    }

    #[test]
    fn test_locality_sydney() {
        let result = scrub_pii("The client moved from Sydney.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("Sydney"), "got: {result}");
    }

    #[test]
    fn test_state_abbreviation() {
        let result = scrub_pii("She lives in VIC.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("VIC"), "got: {result}");
    }

    #[test]
    fn test_state_full_name() {
        let result = scrub_pii("Moved to New South Wales last year.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("New South Wales"), "got: {result}");
    }

    #[test]
    fn test_postcode_now_address() {
        let result = scrub_pii("Postcode is 3931.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("3931"), "got: {result}");
        // Should NOT contain [POSTCODE] — postcodes are now [ADDRESS]
        assert!(!result.contains("[POSTCODE]"), "got: {result}");
    }

    #[test]
    fn test_whitelist_not_scrubbed() {
        // "Sale" is a suburb but also a common English word — should NOT be scrubbed
        let result = scrub_pii("The sale was completed yesterday.");
        assert!(!result.contains("[ADDRESS]"), "got: {result}");
    }

    #[test]
    fn test_whitelist_young_not_scrubbed() {
        let result = scrub_pii("The young participant was engaged.");
        assert!(!result.contains("[ADDRESS]"), "got: {result}");
    }

    #[test]
    fn test_whitelist_orange_not_scrubbed() {
        let result = scrub_pii("She had an orange for lunch.");
        // "orange" is lowercase, so it won't match anyway (title-case required)
        assert!(!result.contains("[ADDRESS]"), "got: {result}");
    }

    #[test]
    fn test_whitelist_capitalised_still_skipped() {
        // Even when capitalised, whitelisted words should not be scrubbed
        let result = scrub_pii("Orange juice was served.");
        assert!(!result.contains("[ADDRESS]"), "got: {result}");
    }

    #[test]
    fn test_combined_sentence_1() {
        let text = "Sarah Johnson called from 0412 345 678. She lives in Mornington 3931 and works at 12 Main Street Frankston.";
        let result = scrub_pii(text);
        assert!(result.contains("[NAME]"), "missing [NAME]: {result}");
        assert!(result.contains("[PHONE]"), "missing [PHONE]: {result}");
        assert!(!result.contains("Sarah Johnson"), "leaked name: {result}");
        assert!(!result.contains("0412"), "leaked phone: {result}");
        assert!(!result.contains("Mornington"), "leaked Mornington: {result}");
        assert!(!result.contains("3931"), "leaked postcode: {result}");
        assert!(!result.contains("Main Street"), "leaked street: {result}");
        assert!(!result.contains("Frankston"), "leaked Frankston: {result}");
    }

    #[test]
    fn test_combined_sentence_2() {
        let text = "The client moved from Sydney NSW to Melbourne VIC last month.";
        let result = scrub_pii(text);
        assert!(!result.contains("Sydney"), "leaked Sydney: {result}");
        assert!(!result.contains("NSW"), "leaked NSW: {result}");
        assert!(!result.contains("Melbourne"), "leaked Melbourne: {result}");
        assert!(!result.contains("VIC"), "leaked VIC: {result}");
    }

    #[test]
    fn test_multi_word_locality() {
        let result = scrub_pii("She moved to Acacia Ridge last week.");
        assert!(result.contains("[ADDRESS]"), "got: {result}");
        assert!(!result.contains("Acacia Ridge"), "got: {result}");
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
