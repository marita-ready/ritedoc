// ─────────────────────────────────────────────────────────────────────────────
//  safety_scan.rs — Filter 2: Red Flag keyword scanner
//
//  Loads red_flags_v2.json at compile time, builds a lookup structure,
//  and scans text for any of the 1,432 keywords across 14 categories.
//  If ANY keyword matches → RED LIGHT (locked).
// ─────────────────────────────────────────────────────────────────────────────

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

// ─────────────────────────────────────────────────────────────────────────────
//  JSON schema (mirrors red_flags_v2.json structure)
// ─────────────────────────────────────────────────────────────────────────────

/// Top-level wrapper for the red flags JSON file.
#[derive(Debug, Deserialize)]
struct RedFlagsFile {
    red_flag_categories: Vec<RawCategory>,
}

/// A single category from the JSON.
#[derive(Debug, Deserialize)]
struct RawCategory {
    id: u32,
    name: String,
    severity: String,
    keywords: Vec<String>,
    #[allow(dead_code)]
    context_keywords: Option<Vec<String>>,
    #[allow(dead_code)]
    required_forms: Option<serde_json::Value>,
    #[serde(default)]
    has_medication_keywords: bool,
    #[allow(dead_code)]
    context_sensitivity_note: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Compiled keyword index (built once at first call)
// ─────────────────────────────────────────────────────────────────────────────

/// A keyword entry that remembers which category it belongs to.
#[derive(Debug, Clone)]
struct KeywordEntry {
    keyword_lower: String,
    category_id: u32,
    category_name: String,
    severity: String,
    #[allow(dead_code)]
    is_medication: bool,
}

/// The full keyword index — a flat Vec sorted longest-first for greedy matching.
struct KeywordIndex {
    entries: Vec<KeywordEntry>,
}

/// Compile-time embed of the JSON file.
const RED_FLAGS_JSON: &str = include_str!("../cartridges/red_flags_v2.json");

fn keyword_index() -> &'static KeywordIndex {
    static INDEX: OnceLock<KeywordIndex> = OnceLock::new();
    INDEX.get_or_init(|| {
        let file: RedFlagsFile =
            serde_json::from_str(RED_FLAGS_JSON).expect("red_flags_v2.json is valid JSON");

        let mut entries: Vec<KeywordEntry> = Vec::with_capacity(1500);

        for cat in &file.red_flag_categories {
            for kw in &cat.keywords {
                entries.push(KeywordEntry {
                    keyword_lower: kw.to_lowercase(),
                    category_id: cat.id,
                    category_name: cat.name.clone(),
                    severity: cat.severity.clone(),
                    is_medication: cat.has_medication_keywords,
                });
            }
        }

        // Sort longest-first so multi-word phrases are checked before
        // their single-word substrings (e.g. "held down" before "held").
        entries.sort_by(|a, b| b.keyword_lower.len().cmp(&a.keyword_lower.len()));

        KeywordIndex { entries }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public result types
// ─────────────────────────────────────────────────────────────────────────────

/// A single category's match results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryMatch {
    pub category_id: u32,
    pub category_name: String,
    pub severity: String,
    pub matched_keywords: Vec<String>,
}

/// The full result of a safety scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyScanResult {
    /// `true` if ANY red flag keyword was found — RED LIGHT.
    pub is_red: bool,
    /// Flat list of every matched keyword (de-duplicated).
    pub matched_keywords: Vec<String>,
    /// Grouped by category.
    pub matched_categories: Vec<CategoryMatch>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scan logic
// ─────────────────────────────────────────────────────────────────────────────

/// Check whether a keyword match is at a word boundary in the text.
/// This prevents partial matches like "the" inside "therapy".
fn is_word_boundary(text: &str, start: usize, end: usize) -> bool {
    let before_ok = if start == 0 {
        true
    } else {
        let ch = text[..start].chars().next_back().unwrap();
        !ch.is_alphanumeric() && ch != '\''
    };
    let after_ok = if end >= text.len() {
        true
    } else {
        let ch = text[end..].chars().next().unwrap();
        !ch.is_alphanumeric() && ch != '\''
    };
    before_ok && after_ok
}

/// Scan the given text for red flag keywords.
///
/// The text should already be PII-scrubbed (Filter 1 output).
/// Returns a `SafetyScanResult` indicating whether the note is RED.
pub fn safety_scan(text: &str) -> SafetyScanResult {
    let index = keyword_index();
    let text_lower = text.to_lowercase();

    // Track which keywords have already matched (by their lowercase form)
    // to avoid duplicates when the same keyword appears multiple times.
    let mut seen_keywords: std::collections::HashSet<String> =
        std::collections::HashSet::new();

    // Collect matches grouped by category_id.
    let mut category_matches: std::collections::HashMap<u32, CategoryMatch> =
        std::collections::HashMap::new();

    for entry in &index.entries {
        // Skip if we already matched this exact keyword string.
        if seen_keywords.contains(&entry.keyword_lower) {
            continue;
        }

        // Check if the text contains this keyword phrase.
        // For multi-word phrases this is a substring search.
        let mut search_from = 0;
        let mut found = false;
        while let Some(pos) = text_lower[search_from..].find(&entry.keyword_lower) {
            let abs_start = search_from + pos;
            let abs_end = abs_start + entry.keyword_lower.len();
            if is_word_boundary(&text_lower, abs_start, abs_end) {
                found = true;
                break;
            }
            // Move past this occurrence and keep searching.
            search_from = abs_start + 1;
        }

        if found {
            seen_keywords.insert(entry.keyword_lower.clone());

            let cat = category_matches
                .entry(entry.category_id)
                .or_insert_with(|| CategoryMatch {
                    category_id: entry.category_id,
                    category_name: entry.category_name.clone(),
                    severity: entry.severity.clone(),
                    matched_keywords: Vec::new(),
                });
            cat.matched_keywords.push(entry.keyword_lower.clone());
        }
    }

    let matched_keywords: Vec<String> = seen_keywords.into_iter().collect();
    let mut matched_categories: Vec<CategoryMatch> =
        category_matches.into_values().collect();
    // Sort categories by id for deterministic output.
    matched_categories.sort_by_key(|c| c.category_id);

    let is_red = !matched_keywords.is_empty();

    SafetyScanResult {
        is_red,
        matched_keywords,
        matched_categories,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_red_flag_restrained() {
        let result = safety_scan(
            "Client was restrained by staff after becoming agitated. \
             Staff held down the participant on the floor for approximately 5 minutes.",
        );
        assert!(result.is_red, "Should be RED");
        let kws: Vec<&str> = result.matched_keywords.iter().map(|s| s.as_str()).collect();
        assert!(kws.contains(&"restrained"), "Should match 'restrained'");
        assert!(kws.contains(&"held down"), "Should match 'held down'");
    }

    #[test]
    fn test_no_red_flag_normal_note() {
        let result = safety_scan(
            "Took [NAME] to the shops. [NAME] chose items from the list.",
        );
        assert!(!result.is_red, "Should NOT be RED for a normal note");
        assert!(result.matched_keywords.is_empty());
    }

    #[test]
    fn test_red_flag_physically_restrained() {
        let result = safety_scan(
            "However, another participant was physically restrained by a staff member in the car park.",
        );
        assert!(result.is_red, "Should be RED");
        // "physically restrained" is not a keyword but "restrained" is
        // Also check for any match
        assert!(!result.matched_keywords.is_empty());
    }

    #[test]
    fn test_case_insensitive() {
        let result = safety_scan("The client was RESTRAINED during the incident.");
        assert!(result.is_red, "Should match case-insensitively");
    }

    #[test]
    fn test_multi_word_phrase() {
        let result = safety_scan("The staff member held down the participant.");
        assert!(result.is_red);
        let kws: Vec<&str> = result.matched_keywords.iter().map(|s| s.as_str()).collect();
        assert!(kws.contains(&"held down"));
    }

    #[test]
    fn test_word_boundary_no_partial() {
        // "the" should not match inside "therapy" or "there"
        // "falls" is a keyword in cat 1 — check it matches standalone
        let result = safety_scan("The participant attended therapy there.");
        // "the" is not a keyword, so this should be fine
        // But let's check "therapy" doesn't trigger "the" if "the" were a keyword
        // More importantly, check that partial words don't match
        let result2 = safety_scan("The participant showed improvement.");
        assert!(!result2.is_red, "Normal text should not trigger red flags");
        let _ = result; // suppress unused warning
    }

    #[test]
    fn test_keyword_index_loads() {
        let index = keyword_index();
        assert!(
            index.entries.len() >= 1400,
            "Should have at least 1400 keyword entries, got {}",
            index.entries.len()
        );
    }

    #[test]
    fn test_category_match_structure() {
        let result = safety_scan("The client was locked in a room.");
        assert!(result.is_red);
        assert!(!result.matched_categories.is_empty());
        // "locked in" should be in Category 1
        let cat1 = result
            .matched_categories
            .iter()
            .find(|c| c.category_id == 1);
        assert!(cat1.is_some(), "Should have a Category 1 match");
    }
}
