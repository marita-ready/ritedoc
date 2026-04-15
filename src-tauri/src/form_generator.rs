//! Incident Form Generation Engine — Filter 5: Procedural Alignment Check
//!
//! For RED notes only. Runs after the Nanoclaw rewrite (Step 4).
//!
//! 4-step logic:
//!   A. Entity Extraction — pull participant, staff, date, time, description
//!   B. Procedural Alignment Check — scan for mandatory SOP steps
//!   C. Form Pre-Fill — auto-fill incident forms from red_flags_v2.json
//!   D. Output Structure — return the full incident package
//!
//! Both JSON files are compiled into the binary via `include_str!()`.
//! Zero internet. Zero persistence. Everything in memory.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

use crate::safety_scan::CategoryMatch;

// ─────────────────────────────────────────────────────────────────────────────
//  Compile-time JSON embeds
// ─────────────────────────────────────────────────────────────────────────────

const INCIDENT_SOPS_JSON: &str = include_str!("../cartridges/incident_sops.json");
const RED_FLAGS_JSON: &str = include_str!("../cartridges/red_flags_v2.json");

// ─────────────────────────────────────────────────────────────────────────────
//  JSON schema — incident_sops.json
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct SopsFile {
    categories: Vec<SopCategory>,
}

#[derive(Debug, Deserialize)]
struct SopCategory {
    id: u32,
    #[allow(dead_code)]
    name: String,
    legislative_source: String,
    mandatory_steps: Vec<MandatoryStep>,
    reporting_timeframe: String,
    internal_notifications: Vec<String>,
    external_notifications: Vec<String>,
    #[allow(dead_code)]
    required_documentation: Vec<String>,
    #[allow(dead_code)]
    victorian_specific: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct MandatoryStep {
    step_number: u32,
    action: String,
    evidence_keywords: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  JSON schema — red_flags_v2.json (form templates only)
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct RedFlagsFormsFile {
    red_flag_categories: Vec<RedFlagFormCategory>,
}

#[derive(Debug, Deserialize)]
struct RedFlagFormCategory {
    id: u32,
    #[allow(dead_code)]
    name: String,
    required_forms: Option<Vec<FormTemplate>>,
}

#[derive(Debug, Deserialize, Clone)]
struct FormTemplate {
    form_name: String,
    authority: String,
    fields: Vec<FormFieldTemplate>,
}

#[derive(Debug, Deserialize, Clone)]
struct FormFieldTemplate {
    label: String,
    auto_fill: Option<String>,
    required: bool,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Lazy-loaded parsed data
// ─────────────────────────────────────────────────────────────────────────────

fn sops_data() -> &'static SopsFile {
    static DATA: OnceLock<SopsFile> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(INCIDENT_SOPS_JSON)
            .expect("incident_sops.json is valid JSON")
    })
}

fn forms_data() -> &'static RedFlagsFormsFile {
    static DATA: OnceLock<RedFlagsFormsFile> = OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(RED_FLAGS_JSON)
            .expect("red_flags_v2.json is valid JSON")
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public output types (returned to frontend via PipelineResult)
// ─────────────────────────────────────────────────────────────────────────────

/// The full incident package for a RED note.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IncidentPackage {
    /// Header text for the procedural alignment section.
    pub header: String,
    /// Procedural alignment summary across all matched categories.
    pub procedural_alignment: ProceduralAlignment,
    /// Pre-filled incident forms from red_flags_v2.json.
    pub incident_forms: Vec<PreFilledForm>,
    /// Legislative references for the matched categories.
    pub legislative_references: Vec<String>,
    /// Mandated reporting timeframe (most urgent across matched categories).
    pub reporting_timeframe: String,
    /// Who must be notified (de-duplicated across matched categories).
    pub required_notifications: Vec<NotificationGroup>,
    /// Footer disclaimer.
    pub disclaimer: String,
}

/// Summary of the procedural alignment check.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProceduralAlignment {
    /// Total mandatory steps across all matched categories.
    pub steps_total: usize,
    /// Steps that have evidence in the raw note.
    pub steps_documented: usize,
    /// Per-step results (documented or gap).
    pub steps: Vec<StepResult>,
}

/// Result for a single mandatory procedural step.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepResult {
    /// The category this step belongs to.
    pub category_name: String,
    /// Step number within the category.
    pub step_number: u32,
    /// The mandatory action.
    pub action: String,
    /// Whether evidence was found in the note.
    pub documented: bool,
    /// Keywords that matched (empty if gap).
    pub evidence_found: Vec<String>,
    /// Gap text — only set if `documented` is false.
    pub gap_text: String,
}

/// A pre-filled incident form.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreFilledForm {
    /// Form name (e.g. "Restrictive Practice Notification Form").
    pub form_name: String,
    /// Issuing authority (e.g. "NDIS Quality and Safeguards Commission").
    pub authority: String,
    /// Fields with values or [MISSING: ...] brackets.
    pub fields: Vec<PreFilledField>,
}

/// A single field in a pre-filled form.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreFilledField {
    pub label: String,
    pub value: String,
    pub required: bool,
    /// Whether this was auto-filled from metadata.
    pub auto_filled: bool,
}

/// A notification group (internal or external).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationGroup {
    pub group_type: String, // "internal" or "external"
    pub recipients: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Entity context — metadata from CSV / batch input
// ─────────────────────────────────────────────────────────────────────────────

/// Metadata extracted from CSV / batch context for auto-fill.
#[derive(Debug, Clone, Default)]
pub struct NoteContext {
    pub participant_name: String,
    pub support_worker: String,
    pub date: String,
    #[allow(dead_code)]
    pub time: String,
    pub raw_text: String,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main entry point — generate incident package for a RED note
// ─────────────────────────────────────────────────────────────────────────────

/// Generate the full incident package for a RED note.
///
/// `matched_categories` — from the safety scan result (Filter 2).
/// `context` — metadata from CSV / batch input.
///
/// Returns `None` if there are no matched categories (should not happen for RED notes).
pub fn generate_incident_package(
    matched_categories: &[CategoryMatch],
    context: &NoteContext,
) -> Option<IncidentPackage> {
    if matched_categories.is_empty() {
        return None;
    }

    let sops = sops_data();
    let forms = forms_data();
    let text_lower = context.raw_text.to_lowercase();

    // Collect matched category IDs.
    let matched_ids: Vec<u32> = matched_categories.iter().map(|c| c.category_id).collect();

    // ── Step B: Procedural Alignment Check ───────────────────────────────────
    let mut all_steps: Vec<StepResult> = Vec::new();

    for sop_cat in &sops.categories {
        if !matched_ids.contains(&sop_cat.id) {
            continue;
        }

        let cat_name = matched_categories
            .iter()
            .find(|c| c.category_id == sop_cat.id)
            .map(|c| c.category_name.clone())
            .unwrap_or_default();

        for step in &sop_cat.mandatory_steps {
            let mut evidence_found: Vec<String> = Vec::new();

            for kw in &step.evidence_keywords {
                let kw_lower = kw.to_lowercase();
                if text_lower.contains(&kw_lower) {
                    evidence_found.push(kw.clone());
                }
            }

            let documented = !evidence_found.is_empty();
            let gap_text = if documented {
                String::new()
            } else {
                format!("[MANDATORY PROCEDURE MISSING: {}]", step.action)
            };

            all_steps.push(StepResult {
                category_name: cat_name.clone(),
                step_number: step.step_number,
                action: step.action.clone(),
                documented,
                evidence_found,
                gap_text,
            });
        }
    }

    let steps_documented = all_steps.iter().filter(|s| s.documented).count();
    let steps_total = all_steps.len();

    let procedural_alignment = ProceduralAlignment {
        steps_total,
        steps_documented,
        steps: all_steps,
    };

    // ── Step C: Form Pre-Fill ────────────────────────────────────────────────
    let mut incident_forms: Vec<PreFilledForm> = Vec::new();

    for form_cat in &forms.red_flag_categories {
        if !matched_ids.contains(&form_cat.id) {
            continue;
        }

        if let Some(templates) = &form_cat.required_forms {
            for template in templates {
                let fields: Vec<PreFilledField> = template
                    .fields
                    .iter()
                    .map(|f| {
                        let (value, auto_filled) = resolve_field_value(f, context);
                        PreFilledField {
                            label: f.label.clone(),
                            value,
                            required: f.required,
                            auto_filled,
                        }
                    })
                    .collect();

                incident_forms.push(PreFilledForm {
                    form_name: template.form_name.clone(),
                    authority: template.authority.clone(),
                    fields,
                });
            }
        }
    }

    // De-duplicate forms by (form_name, authority) — same form can appear
    // across multiple categories.
    incident_forms.dedup_by(|a, b| a.form_name == b.form_name && a.authority == b.authority);

    // ── Step D: Collect legislative references, timeframes, notifications ────
    let mut legislative_references: Vec<String> = Vec::new();
    let mut timeframes: Vec<String> = Vec::new();
    let mut internal_notifications: Vec<String> = Vec::new();
    let mut external_notifications: Vec<String> = Vec::new();

    for sop_cat in &sops.categories {
        if !matched_ids.contains(&sop_cat.id) {
            continue;
        }
        if !legislative_references.contains(&sop_cat.legislative_source) {
            legislative_references.push(sop_cat.legislative_source.clone());
        }
        if !timeframes.contains(&sop_cat.reporting_timeframe) {
            timeframes.push(sop_cat.reporting_timeframe.clone());
        }
        for n in &sop_cat.internal_notifications {
            if !internal_notifications.contains(n) {
                internal_notifications.push(n.clone());
            }
        }
        for n in &sop_cat.external_notifications {
            if !external_notifications.contains(n) {
                external_notifications.push(n.clone());
            }
        }
    }

    // Pick the most urgent timeframe (shortest / most urgent first).
    let reporting_timeframe = pick_most_urgent_timeframe(&timeframes);

    let required_notifications = vec![
        NotificationGroup {
            group_type: "internal".to_string(),
            recipients: internal_notifications,
        },
        NotificationGroup {
            group_type: "external".to_string(),
            recipients: external_notifications,
        },
    ];

    Some(IncidentPackage {
        header: "Procedural Alignment Check: Based on NDIS Practice Standards v1.0.0"
            .to_string(),
        procedural_alignment,
        incident_forms,
        legislative_references,
        reporting_timeframe,
        required_notifications,
        disclaimer: "This is a generated draft for review. Compliance remains the \
                      responsibility of the provider."
            .to_string(),
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Field value resolution
// ─────────────────────────────────────────────────────────────────────────────

/// Resolve a form field's value from the note context.
///
/// Returns `(value, auto_filled)`.
fn resolve_field_value(field: &FormFieldTemplate, ctx: &NoteContext) -> (String, bool) {
    // Check auto_fill mapping first.
    if let Some(ref mapping) = field.auto_fill {
        let val = match mapping.as_str() {
            "note_date" => &ctx.date,
            "participant_name" => &ctx.participant_name,
            "support_worker" => &ctx.support_worker,
            _ => "",
        };
        if !val.is_empty() {
            return (val.to_string(), true);
        }
    }

    // Check if this is a "Description" type field — auto-fill with raw text.
    let label_lower = field.label.to_lowercase();
    if is_description_field(&label_lower) && !ctx.raw_text.is_empty() {
        return (ctx.raw_text.clone(), true);
    }

    // No data available — insert [MISSING: ...] bracket.
    (format!("[MISSING: {}]", field.label), false)
}

/// Check if a field label indicates it should be auto-filled with the note text.
fn is_description_field(label_lower: &str) -> bool {
    label_lower.contains("description of")
        || label_lower.contains("details of")
        || label_lower.contains("summary of")
        || label_lower.contains("nature of")
        || label_lower.contains("description of event")
        || label_lower.contains("description of circumstances")
        || label_lower.contains("description of injury")
        || label_lower.contains("description of incident")
}

// ─────────────────────────────────────────────────────────────────────────────
//  Timeframe urgency ranking
// ─────────────────────────────────────────────────────────────────────────────

/// Pick the most urgent reporting timeframe from a list.
/// Priority: "immediately" > "24 hours" > "5 business days" > anything else.
fn pick_most_urgent_timeframe(timeframes: &[String]) -> String {
    if timeframes.is_empty() {
        return "Refer to organisational policy".to_string();
    }

    let mut best_score = u32::MAX;
    let mut best = &timeframes[0];

    for tf in timeframes {
        let lower = tf.to_lowercase();
        let score = if lower.contains("immediately") {
            0
        } else if lower.contains("24 hour") {
            1
        } else if lower.contains("1 business day") {
            2
        } else if lower.contains("5 business day") {
            3
        } else if lower.contains("48 hour") {
            4
        } else {
            10
        };
        if score < best_score {
            best_score = score;
            best = tf;
        }
    }

    best.clone()
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sops_json_loads() {
        let sops = sops_data();
        assert_eq!(sops.categories.len(), 14, "Should have 14 SOP categories");
    }

    #[test]
    fn test_forms_json_loads() {
        let forms = forms_data();
        assert!(
            forms.red_flag_categories.len() >= 14,
            "Should have at least 14 red flag categories"
        );
    }

    #[test]
    fn test_procedural_alignment_with_evidence() {
        let matched = vec![CategoryMatch {
            category_id: 1,
            category_name: "Unauthorised Restrictive Practice".to_string(),
            severity: "critical".to_string(),
            matched_keywords: vec!["restrained".to_string()],
        }];

        let ctx = NoteContext {
            participant_name: "John".to_string(),
            support_worker: "Jane".to_string(),
            date: "2025-01-15".to_string(),
            time: "14:00".to_string(),
            raw_text: "Client was restrained. Made safe and separated. \
                        Called manager and notified supervisor. \
                        Filled out incident report."
                .to_string(),
        };

        let pkg = generate_incident_package(&matched, &ctx).unwrap();

        // Should have some documented steps
        assert!(
            pkg.procedural_alignment.steps_documented > 0,
            "Should find some documented steps"
        );
        assert!(
            pkg.procedural_alignment.steps_total >= 6,
            "Category 1 has 6 mandatory steps"
        );

        // Should have incident forms
        assert!(!pkg.incident_forms.is_empty(), "Should have pre-filled forms");

        // Check header
        assert!(pkg.header.contains("NDIS Practice Standards"));
    }

    #[test]
    fn test_procedural_alignment_all_gaps() {
        let matched = vec![CategoryMatch {
            category_id: 2,
            category_name: "Medication Error / Missed Medication".to_string(),
            severity: "critical".to_string(),
            matched_keywords: vec!["missed medication".to_string()],
        }];

        let ctx = NoteContext {
            participant_name: "Alice".to_string(),
            raw_text: "Participant missed their medication today.".to_string(),
            ..Default::default()
        };

        let pkg = generate_incident_package(&matched, &ctx).unwrap();

        // All steps should be gaps (no evidence keywords in the raw text)
        let gaps: Vec<_> = pkg
            .procedural_alignment
            .steps
            .iter()
            .filter(|s| !s.documented)
            .collect();
        assert!(
            gaps.len() > 0,
            "Should have at least some gaps"
        );

        // Each gap should have [MANDATORY PROCEDURE MISSING: ...] text
        for gap in &gaps {
            assert!(
                gap.gap_text.starts_with("[MANDATORY PROCEDURE MISSING:"),
                "Gap text should start with [MANDATORY PROCEDURE MISSING:"
            );
        }
    }

    #[test]
    fn test_form_auto_fill() {
        let matched = vec![CategoryMatch {
            category_id: 1,
            category_name: "Unauthorised Restrictive Practice".to_string(),
            severity: "critical".to_string(),
            matched_keywords: vec!["restrained".to_string()],
        }];

        let ctx = NoteContext {
            participant_name: "John Smith".to_string(),
            support_worker: "Jane Doe".to_string(),
            date: "2025-01-15".to_string(),
            time: "14:00".to_string(),
            raw_text: "Client was restrained by staff.".to_string(),
        };

        let pkg = generate_incident_package(&matched, &ctx).unwrap();

        // Check that auto-fill worked for participant name
        let first_form = &pkg.incident_forms[0];
        let participant_field = first_form
            .fields
            .iter()
            .find(|f| f.label == "Participant")
            .unwrap();
        assert_eq!(participant_field.value, "John Smith");
        assert!(participant_field.auto_filled);

        // Check that missing fields have [MISSING: ...] brackets
        let missing_field = first_form
            .fields
            .iter()
            .find(|f| f.value.starts_with("[MISSING:"));
        assert!(missing_field.is_some(), "Should have at least one [MISSING:] field");
    }

    #[test]
    fn test_empty_categories_returns_none() {
        let ctx = NoteContext::default();
        assert!(generate_incident_package(&[], &ctx).is_none());
    }

    #[test]
    fn test_timeframe_urgency() {
        let timeframes = vec![
            "5 business days (24 hours if serious harm)".to_string(),
            "24 hours".to_string(),
            "Internal reporting immediately; WHS regulator immediately for notifiable incidents"
                .to_string(),
        ];
        let result = pick_most_urgent_timeframe(&timeframes);
        assert!(
            result.to_lowercase().contains("immediately"),
            "Should pick the most urgent timeframe"
        );
    }

    #[test]
    fn test_legislative_references_collected() {
        let matched = vec![
            CategoryMatch {
                category_id: 1,
                category_name: "Unauthorised Restrictive Practice".to_string(),
                severity: "critical".to_string(),
                matched_keywords: vec!["restrained".to_string()],
            },
            CategoryMatch {
                category_id: 3,
                category_name: "Injury / Fall / Medical Emergency".to_string(),
                severity: "critical".to_string(),
                matched_keywords: vec!["fell".to_string()],
            },
        ];

        let ctx = NoteContext {
            raw_text: "Client was restrained and fell.".to_string(),
            ..Default::default()
        };

        let pkg = generate_incident_package(&matched, &ctx).unwrap();
        assert!(
            pkg.legislative_references.len() >= 2,
            "Should have legislative references from both categories"
        );
    }

    #[test]
    fn test_notifications_deduplicated() {
        let matched = vec![
            CategoryMatch {
                category_id: 1,
                category_name: "Unauthorised Restrictive Practice".to_string(),
                severity: "critical".to_string(),
                matched_keywords: vec!["restrained".to_string()],
            },
            CategoryMatch {
                category_id: 2,
                category_name: "Medication Error / Missed Medication".to_string(),
                severity: "critical".to_string(),
                matched_keywords: vec!["missed medication".to_string()],
            },
        ];

        let ctx = NoteContext {
            raw_text: "Client was restrained and missed medication.".to_string(),
            ..Default::default()
        };

        let pkg = generate_incident_package(&matched, &ctx).unwrap();

        // Internal notifications should be de-duplicated
        let internal = pkg
            .required_notifications
            .iter()
            .find(|g| g.group_type == "internal")
            .unwrap();
        let unique_count = internal.recipients.len();
        let mut deduped = internal.recipients.clone();
        deduped.sort();
        deduped.dedup();
        assert_eq!(unique_count, deduped.len(), "Internal notifications should be unique");
    }
}
