// ─────────────────────────────────────────────────────────────────────────────
//  quality_scan.rs — Filter 3: 5-Pillar compliance quality check
//
//  Checks whether the note addresses all 5 NDIS compliance pillars.
//  Only runs if Filter 2 (safety scan) found ZERO red flags.
//
//  Missing 1+ pillars → ORANGE LIGHT
//  All 5 present      → GREEN LIGHT
// ─────────────────────────────────────────────────────────────────────────────

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

// ─────────────────────────────────────────────────────────────────────────────
//  Pillar definitions
// ─────────────────────────────────────────────────────────────────────────────

/// A single compliance pillar with its indicator phrases.
struct Pillar {
    name: &'static str,
    /// Phrases that suggest this pillar is addressed in the note.
    /// Checked case-insensitively as substring matches.
    indicators: &'static [&'static str],
    /// The prompt question to insert when this pillar is missing.
    missing_prompt: &'static str,
}

/// The 5 compliance pillars with their indicator keywords/phrases.
fn pillars() -> &'static [Pillar; 5] {
    static PILLARS: OnceLock<[Pillar; 5]> = OnceLock::new();
    PILLARS.get_or_init(|| [
        Pillar {
            name: "Goal Alignment",
            indicators: &[
                "goal",
                "plan",
                "objective",
                "working towards",
                "aligned with",
                "ndis goal",
                "support plan",
                "ndis plan",
                "care plan",
                "individual plan",
                "participant goal",
                "in line with",
                "as per",
                "consistent with",
                "linked to",
                "goal of",
                "target",
                "aim",
                "purpose of",
                "building independent",
                "developing skill",
                "skill development",
                "capacity building",
            ],
            missing_prompt:
                "[MISSING: Which NDIS goal did this activity support?]",
        },
        Pillar {
            name: "Participant Response",
            indicators: &[
                "responded",
                "engaged",
                "enjoyed",
                "refused",
                "appeared",
                "expressed",
                "reacted",
                "mood",
                "behaviour during",
                "behavior during",
                "demeanour",
                "demeanor",
                "participated",
                "reluctant",
                "enthusiastic",
                "willing",
                "unwilling",
                "cooperative",
                "uncooperative",
                "anxious",
                "calm",
                "happy",
                "upset",
                "distressed",
                "comfortable",
                "uncomfortable",
                "verbal feedback",
                "stated that",
                "said that",
                "told staff",
                "reported feeling",
                "feeling",
                "pride",
                "confident",
                "frustrated",
                "agitated",
                "settled",
                "positive",
                "negative",
                "independently",
                "with prompting",
                "with assistance",
                "chose",
                "preferred",
                "declined",
                "agreed",
                "consented",
            ],
            missing_prompt:
                "[MISSING: How did the participant respond to this activity?]",
        },
        Pillar {
            name: "Worker Actions",
            indicators: &[
                "assisted",
                "supported",
                "helped",
                "provided",
                "facilitated",
                "prompted",
                "encouraged",
                "administered",
                "transported",
                "accompanied",
                "supervised",
                "monitored",
                "guided",
                "demonstrated",
                "modelled",
                "redirected",
                "de-escalated",
                "intervened",
                "observed",
                "documented",
                "communicated",
                "liaised",
                "coordinated",
                "prepared",
                "cleaned",
                "cooked",
                "set up",
                "verbal prompt",
                "physical prompt",
                "visual prompt",
                "gestural prompt",
                "hand over hand",
                "worker provided",
                "staff provided",
                "support worker",
            ],
            missing_prompt:
                "[MISSING: What specific support did the worker provide?]",
        },
        Pillar {
            name: "Risk / Safety Observations",
            indicators: &[
                "risk",
                "safety",
                "hazard",
                "incident",
                "no concerns",
                "safe",
                "managed",
                "monitored",
                "no incidents",
                "no issues",
                "without incident",
                "safely",
                "secure",
                "precaution",
                "risk assessment",
                "safety check",
                "safety concern",
                "no safety concern",
                "no risk",
                "low risk",
                "high risk",
                "near miss",
                "fall",
                "injury",
                "medication",
                "allergies",
                "emergency",
                "first aid",
                "behaviour of concern",
                "behavior of concern",
                "trigger",
                "de-escalation",
                "restraint",
                "seclusion",
                "absconding",
                "self harm",
                "self-harm",
                "suicidal",
                "wellbeing",
                "welfare",
            ],
            missing_prompt:
                "[MISSING: Were there any risk or safety observations during this shift?]",
        },
        Pillar {
            name: "Outcomes / Progress",
            indicators: &[
                "outcome",
                "progress",
                "achieved",
                "completed",
                "improved",
                "maintained",
                "result",
                "successfully",
                "success",
                "milestone",
                "advancement",
                "regression",
                "declined",
                "no change",
                "stable",
                "demonstrated",
                "showed improvement",
                "compared to",
                "better than",
                "worse than",
                "same as",
                "on track",
                "behind schedule",
                "ahead of",
                "met goal",
                "did not meet",
                "partially achieved",
                "fully achieved",
                "confidence",
                "independence",
                "skill",
                "ability",
                "competence",
                "task completion",
                "within budget",
                "on time",
            ],
            missing_prompt:
                "[MISSING: What was the outcome or progress made during this shift?]",
        },
    ])
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public result types
// ─────────────────────────────────────────────────────────────────────────────

/// Information about a missing compliance pillar.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingPillar {
    pub pillar_name: String,
    pub prompt_question: String,
}

/// The full result of a quality scan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QualityScanResult {
    /// `true` if all 5 pillars are present → GREEN LIGHT.
    pub is_green: bool,
    /// List of pillars that were NOT detected in the note.
    pub missing_pillars: Vec<MissingPillar>,
    /// List of pillars that WERE detected (for informational purposes).
    pub present_pillars: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Scan logic
// ─────────────────────────────────────────────────────────────────────────────

/// Check whether the text addresses all 5 compliance pillars.
///
/// The text should already be PII-scrubbed (Filter 1 output).
/// This should only be called if Filter 2 (safety scan) returned no red flags.
pub fn quality_scan(text: &str) -> QualityScanResult {
    let text_lower = text.to_lowercase();
    let mut missing_pillars = Vec::new();
    let mut present_pillars = Vec::new();

    for pillar in pillars().iter() {
        let found = pillar
            .indicators
            .iter()
            .any(|indicator| text_lower.contains(indicator));

        if found {
            present_pillars.push(pillar.name.to_string());
        } else {
            missing_pillars.push(MissingPillar {
                pillar_name: pillar.name.to_string(),
                prompt_question: pillar.missing_prompt.to_string(),
            });
        }
    }

    let is_green = missing_pillars.is_empty();

    QualityScanResult {
        is_green,
        missing_pillars,
        present_pillars,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_green_all_pillars_present() {
        let text = "Supported [NAME] with her weekly grocery shopping as per her NDIS goal \
                    of building independent living skills. [NAME] chose items from her shopping \
                    list independently and responded positively, expressing pride in managing \
                    her budget. Worker provided verbal prompts only. No safety concerns observed. \
                    [NAME] successfully completed the shop within budget, demonstrating improved \
                    confidence compared to last week.";
        let result = quality_scan(text);
        assert!(result.is_green, "Should be GREEN — all 5 pillars present");
        assert!(result.missing_pillars.is_empty());
        assert_eq!(result.present_pillars.len(), 5);
    }

    #[test]
    fn test_orange_missing_pillars() {
        let text = "Took [NAME] to the shops.";
        let result = quality_scan(text);
        assert!(!result.is_green, "Should be ORANGE — missing pillars");
        assert!(!result.missing_pillars.is_empty());
        // "shops" doesn't match any pillar indicators, but "Took" might match
        // worker actions via... no, "took" is not in the list. Let's check.
        // Actually the note is very sparse — should miss most pillars.
        let missing_names: Vec<&str> = result
            .missing_pillars
            .iter()
            .map(|p| p.pillar_name.as_str())
            .collect();
        // Goal Alignment: no "goal", "plan", etc. → MISSING
        assert!(
            missing_names.contains(&"Goal Alignment"),
            "Goal Alignment should be missing"
        );
        // Participant Response: no "responded", "engaged", etc. → MISSING
        assert!(
            missing_names.contains(&"Participant Response"),
            "Participant Response should be missing"
        );
        // Outcomes: no "outcome", "progress", etc. → MISSING
        assert!(
            missing_names.contains(&"Outcomes / Progress"),
            "Outcomes should be missing"
        );
    }

    #[test]
    fn test_orange_prompt_questions() {
        let text = "Took [NAME] to the shops.";
        let result = quality_scan(text);
        for mp in &result.missing_pillars {
            assert!(
                mp.prompt_question.starts_with("[MISSING:"),
                "Prompt should start with [MISSING:"
            );
            assert!(
                mp.prompt_question.ends_with(']'),
                "Prompt should end with ]"
            );
        }
    }

    #[test]
    fn test_partial_pillars() {
        // Has worker actions ("assisted") and risk ("no concerns") but missing others
        let text = "Assisted [NAME] with morning routine. No concerns noted.";
        let result = quality_scan(text);
        assert!(!result.is_green, "Should be ORANGE — not all pillars");
        let present: Vec<&str> = result
            .present_pillars
            .iter()
            .map(|s| s.as_str())
            .collect();
        assert!(present.contains(&"Worker Actions"));
        assert!(present.contains(&"Risk / Safety Observations"));
    }

    #[test]
    fn test_case_insensitive_detection() {
        let text = "GOAL alignment was discussed. The participant RESPONDED well. \
                    Worker ASSISTED throughout. SAFETY was maintained. OUTCOME was positive.";
        let result = quality_scan(text);
        assert!(result.is_green, "Should detect pillars case-insensitively");
    }
}
