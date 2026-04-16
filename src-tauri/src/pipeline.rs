//! # RiteDoc Rewriting Pipeline
//!
//! Full 6-step pipeline for rewriting NDIS progress notes:
//!   Step 1: PII scrubbing (scrubber.rs)
//!   Step 2: Safety scan — red flag keywords (safety_scan.rs)
//!   Step 3: Quality scan — 5-pillar compliance check (quality_scan.rs)
//!   Step 4: Rewrite — Quick (single-pass) or Deep (3-agent pipeline)
//!   Step 5: Traffic light classification (RED / ORANGE / GREEN)
//!   Step 6: Incident form generation for RED notes (form_generator.rs)
//!
//! The rewriting engine is a native llama.cpp integration via the
//! `llama-cpp-2` Rust bindings. No Docker, no HTTP, no containers.

use crate::engine::{self, EngineState};
use crate::quality_scan::{self, QualityScanResult};
use crate::safety_scan;
use crate::scrubber;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

// ─────────────────────────────────────────────────────────────────────────────
//  Public types
// ─────────────────────────────────────────────────────────────────────────────

/// Cartridge configuration parsed from the cartridge's config_json.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartridgeConfig {
    pub service_type: String,
    pub compliance_rules: Vec<String>,
    pub required_fields: Vec<String>,
    pub format_template: String,
    pub tone_guidelines: Vec<String>,
    pub prohibited_terms: Vec<String>,
    pub example_output: String,
}

impl CartridgeConfig {
    pub fn from_json(json: &str) -> Self {
        serde_json::from_str(json).unwrap_or_else(|_| Self {
            service_type: String::new(),
            compliance_rules: vec![],
            required_fields: vec![],
            format_template: String::new(),
            tone_guidelines: vec![],
            prohibited_terms: vec![],
            example_output: String::new(),
        })
    }

    pub fn rules_list(&self) -> String {
        self.compliance_rules
            .iter()
            .enumerate()
            .map(|(i, r)| format!("{}. {}", i + 1, r))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn fields_list(&self) -> String {
        self.required_fields
            .iter()
            .map(|f| format!("- {}", f))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn tone_list(&self) -> String {
        self.tone_guidelines
            .iter()
            .map(|t| format!("- {}", t))
            .collect::<Vec<_>>()
            .join("\n")
    }

    pub fn prohibited_list(&self) -> String {
        self.prohibited_terms
            .iter()
            .map(|p| format!("- {}", p))
            .collect::<Vec<_>>()
            .join("\n")
    }
}

/// The full pipeline result returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineResult {
    pub final_text: String,
    pub mode: String,
    pub traffic_light: String,
    pub red_flag_keywords: Vec<String>,
    pub red_flag_categories: Vec<safety_scan::CategoryMatch>,
    pub missing_pillars: Vec<quality_scan::MissingPillar>,
    pub present_pillars: Vec<String>,
    pub compliance_analysis: String,
    pub draft_text: String,
    pub review_notes: String,
    /// Incident package — only present for RED notes (Filter 5 output).
    pub incident_package: Option<crate::form_generator::IncidentPackage>,
}

/// Traffic light classification
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TrafficLight {
    Red,
    Orange,
    Green,
}

impl TrafficLight {
    pub fn as_str(&self) -> &str {
        match self {
            TrafficLight::Red => "red",
            TrafficLight::Orange => "orange",
            TrafficLight::Green => "green",
        }
    }
}

/// Input for batch processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchNoteInput {
    pub id: String,
    pub raw_text: String,
    pub participant_name: Option<String>,
    pub support_worker: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
}

/// Result for a single note in a batch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchNoteResult {
    pub id: String,
    pub result: PipelineResult,
}

/// Progress event emitted during batch processing
#[derive(Debug, Clone, Serialize)]
pub struct BatchProgress {
    pub current: usize,
    pub total: usize,
    pub current_note_status: String,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main pipeline entry point
// ─────────────────────────────────────────────────────────────────────────────

/// Process a single note through the full 6-step pipeline.
///
/// This is the main entry point for both Quick and Deep modes.
/// The `engine` parameter provides direct access to the native inference engine.
pub async fn process_note(
    raw_text: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
    mode: &str,
    note_context: Option<&crate::form_generator::NoteContext>,
) -> Result<PipelineResult, String> {
    // ── Step 1: PII Scrubbing ─────────────────────────────────────────────────
    let scrubbed = scrubber::scrub_pii(raw_text);
    log::info!(
        "[pipeline] PII scrubbed: {} chars → {} chars",
        raw_text.len(),
        scrubbed.len()
    );

    // ── Step 2: Safety Scan (red flag keywords) ───────────────────────────────
    let safety = safety_scan::safety_scan(&scrubbed);
    log::info!(
        "[pipeline] Safety scan: is_red={}, keywords={:?}",
        safety.is_red,
        safety.matched_keywords
    );

    // ── Step 3: Quality Scan (5-pillar compliance check) ──────────────────────
    let quality = quality_scan::quality_scan(&scrubbed);
    log::info!(
        "[pipeline] Quality scan: is_green={}, present={}, missing={}",
        quality.is_green,
        quality.present_pillars.len(),
        quality.missing_pillars.len()
    );

    // ── Step 4: Rewrite (Quick or Deep mode) ──────────────────────────────────
    // Clone the engine Arc so we can move it into spawn_blocking
    let engine_clone = engine.clone();
    let rewrite_result = match mode {
        "quick" => {
            let scrubbed_owned = scrubbed.clone();
            let config_owned = config.clone();
            let quality_owned = quality.clone();
            tokio::task::spawn_blocking(move || {
                quick_rewrite_inner(&scrubbed_owned, &config_owned, &engine_clone, &quality_owned)
            })
            .await
            .map_err(|e| format!("Rewrite task failed: {}", e))??
        }
        _ => {
            let scrubbed_owned = scrubbed.clone();
            let config_owned = config.clone();
            let quality_owned = quality.clone();
            tokio::task::spawn_blocking(move || {
                deep_rewrite_inner(&scrubbed_owned, &config_owned, &engine_clone, &quality_owned)
            })
            .await
            .map_err(|e| format!("Rewrite task failed: {}", e))??
        }
    };

    // ── Step 5: Traffic Light Classification ──────────────────────────────────
    // RED is locked — overrides everything. Then ORANGE if missing pillars.
    let traffic_light = if safety.is_red {
        TrafficLight::Red
    } else if !quality.is_green {
        TrafficLight::Orange
    } else {
        TrafficLight::Green
    };

    log::info!("[pipeline] Traffic light: {}", traffic_light.as_str());

    // ── Step 6: Incident Form Generation (RED notes only) ───────────────────
    // Filter 5: Procedural Alignment Check + form pre-fill.
    // Only runs for RED notes. Uses incident_sops.json (compiled into binary)
    // and required_forms from red_flags_v2.json.
    let incident_package = if traffic_light == TrafficLight::Red {
        let ctx = note_context.cloned().unwrap_or_else(|| {
            crate::form_generator::NoteContext {
                raw_text: raw_text.to_string(),
                ..Default::default()
            }
        });
        let pkg = crate::form_generator::generate_incident_package(
            &safety.matched_categories,
            &ctx,
        );
        if let Some(ref p) = pkg {
            log::info!(
                "[pipeline] Incident package generated: {}/{} steps documented, {} forms",
                p.procedural_alignment.steps_documented,
                p.procedural_alignment.steps_total,
                p.incident_forms.len()
            );
        }
        pkg
    } else {
        None
    };

    Ok(PipelineResult {
        final_text: rewrite_result.0,
        mode: mode.to_string(),
        traffic_light: traffic_light.as_str().to_string(),
        red_flag_keywords: safety.matched_keywords,
        red_flag_categories: safety.matched_categories,
        missing_pillars: quality.missing_pillars,
        present_pillars: quality.present_pillars,
        compliance_analysis: rewrite_result.1,
        draft_text: rewrite_result.2,
        review_notes: rewrite_result.3,
        incident_package,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Batch processing — non-blocking, per-note independent
//
//  Each note is processed independently. A red flag on one note does NOT
//  halt or delay processing of other notes.
//  After each note, a "batch-progress" Tauri event is emitted.
// ─────────────────────────────────────────────────────────────────────────────

/// Process a batch of notes independently.
/// Each note goes through all 4 pipeline steps regardless of traffic light colour.
/// Emits a `batch-progress` Tauri event after each note.
pub async fn process_batch(
    notes: Vec<BatchNoteInput>,
    config: &CartridgeConfig,
    engine: &EngineState,
    mode: &str,
    app_handle: &AppHandle,
) -> Vec<BatchNoteResult> {
    let total = notes.len();
    let mut results = Vec::with_capacity(total);

    for (index, note) in notes.into_iter().enumerate() {
        let current = index + 1;

        // Build note context for incident form auto-fill (Step 6).
        let note_ctx = crate::form_generator::NoteContext {
            participant_name: note.participant_name.clone().unwrap_or_default(),
            support_worker: note.support_worker.clone().unwrap_or_default(),
            date: note.date.clone().unwrap_or_default(),
            time: note.time.clone().unwrap_or_default(),
            raw_text: note.raw_text.clone(),
        };

        // Process this note — errors are captured per-note, not propagated.
        let result = match process_note(&note.raw_text, config, engine, mode, Some(&note_ctx)).await {
            Ok(r) => r,
            Err(e) => {
                // On error, return a RED result with the error message as final_text.
                // This ensures the batch continues regardless.
                log::error!("[batch] Note {} failed: {}", note.id, e);
                PipelineResult {
                    final_text: format!("[Processing error: {}]", e),
                    mode: mode.to_string(),
                    traffic_light: "red".to_string(),
                    red_flag_keywords: vec![],
                    red_flag_categories: vec![],
                    missing_pillars: vec![],
                    present_pillars: vec![],
                    compliance_analysis: String::new(),
                    draft_text: String::new(),
                    review_notes: String::new(),
                    incident_package: None,
                }
            }
        };

        // Emit progress event to the frontend.
        let progress = BatchProgress {
            current,
            total,
            current_note_status: result.traffic_light.clone(),
        };
        if let Err(e) = app_handle.emit("batch-progress", &progress) {
            log::warn!("[batch] Failed to emit batch-progress event: {}", e);
        }

        log::info!(
            "[batch] Processed note {}/{} (id={}, status={})",
            current,
            total,
            note.id,
            result.traffic_light
        );

        results.push(BatchNoteResult {
            id: note.id,
            result,
        });
    }

    results
}

// ─────────────────────────────────────────────────────────────────────────────
//  Quick Mode rewrite (single-pass)
//  Returns (final_text, compliance_analysis, draft_text, review_notes)
// ─────────────────────────────────────────────────────────────────────────────

fn quick_rewrite_inner(
    scrubbed: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
    quality: &QualityScanResult,
) -> Result<(String, String, String, String), String> {
    let missing_prompt = build_missing_pillars_prompt(quality);

    let system = format!(
        r#"RULE 0 — NO HALLUCINATION (OVERRIDES ALL OTHER RULES):
You are strictly prohibited from fabricating, guessing, or assuming any information not present in the raw note. If information is missing, insert an orange bracket: [MISSING: specific question]. Never fill in blanks to make a note look complete. Every word in the output must trace back to the human worker's input.

OBJECTIVE:
Transform raw, worker-centric NDIS support notes into "Gold Standard" outcome-based documentation that survives a 2026 NDIS Quality and Safeguards Commission audit. Move from "What the worker did" (Activity) to "What the participant achieved" (Outcome).

RULE 1 — THE SUBJECT SHIFT:
• NEVER start with "I," "Staff," or "The worker."
• ALWAYS start with "The participant," "[Name]," or "The individual."
• Example: Change "I drove him to the shops" to "The participant accessed the community via staff transport to complete weekly grocery shopping."

RULE 2 — USE EVIDENCE VERBS:
Replace passive verbs (helped, assisted, took) with Capacity Building Verbs:
• Chose / Decided / Selected (Proves Choice & Control)
• Practiced / Developed / Navigated (Proves Skill Building)
• Led / Initiated / Directed (Proves Independence)
• Communicated / Expressed (Proves Decision Making)

RULE 3 — ACTIVITY-TO-OUTCOME FRAMEWORK:
Every rewritten note must follow this formula:
[Participant Action] + [Support Provided] + [Outcome/Goal Link]
If the raw note does not contain a goal link or outcome, do NOT invent one. Insert: [MISSING: Which NDIS goal did this activity support?] or [MISSING: What outcome or progress did the participant demonstrate?]

RULE 4 — 2026 NUDGE (REFLECTIVE RISK):
If the raw note mentions a problem or risk, show the Safety-over-Compliance shift:
• Instead of just "Risk assessment followed," write: "Worker applied the environmental risk assessment by [Specific Action from note] to ensure participant safety during the activity."
• If the specific action is not in the note, insert: [MISSING: What specific action did the worker take to manage this risk?]

RULE 5 — TONE & STYLE:
• No Fluff: Do not use words like "lovely," "happy," or "nice" unless they describe a specific measurable outcome.
• Audit-Ready: Use professional terminology (e.g., Restrictive Practice, Dignity of Risk, Community Access, Informed Choice).

RULE 6 — FINAL VERIFICATION (before outputting):
1. Is there a clear link to a goal or independence? If not, insert [MISSING: ...] bracket.
2. Is the participant the "hero" of the sentence? If not, restructure.

MANDATORY ORANGE BRACKETS:
For each of the 5 Pillars, if the raw note does not contain the information:
- [MISSING: Which NDIS goal did this activity support?] (Goal Alignment)
- [MISSING: How did the participant respond to this activity?] (Participant Response)
- [MISSING: What specific support actions were provided?] (Worker Actions)
- [MISSING: Were there any risk or safety observations?] (Risk/Safety)
- [MISSING: What outcome or progress was achieved?] (Outcomes/Progress)

COMPLIANCE RULES FOR THIS SERVICE TYPE ({service_type}):
{rules}

REQUIRED FIELDS (must be present in the output):
{fields}

OUTPUT FORMAT:
{template}

TONE AND LANGUAGE GUIDELINES:
{tone}

PROHIBITED TERMS (do not use these):
{prohibited}

EXAMPLE OF A CORRECTLY FORMATTED NOTE:
{example}

MISSING PILLAR PLACEHOLDERS TO INCLUDE:
{missing_prompt}

INSTRUCTIONS:
- Rewrite the note to meet all compliance rules and NDIS Gold Standard transformation rules above
- Ensure all required fields are addressed
- Follow the output format exactly
- Apply the tone guidelines throughout
- Do not use any prohibited terms
- Insert [MISSING: ...] brackets for any information not present in the original
- Output ONLY the rewritten note — no commentary, no explanations, no preamble"#,
        service_type = config.service_type,
        rules = config.rules_list(),
        fields = config.fields_list(),
        template = if config.format_template.is_empty() {
            "Use a clear, structured format with appropriate headings.".to_string()
        } else {
            config.format_template.clone()
        },
        tone = config.tone_list(),
        prohibited = config.prohibited_list(),
        example = if config.example_output.is_empty() {
            "No example provided.".to_string()
        } else {
            config.example_output.clone()
        },
        missing_prompt = missing_prompt,
    );

    let user_prompt = format!(
        "Please rewrite the following raw progress note into an audit-ready format:\n\n---\n{}\n---\n\nRewritten note:",
        scrubbed
    );

    let final_text = engine::infer(engine, &system, &user_prompt)?;
    Ok((final_text, String::new(), String::new(), String::new()))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Deep Mode rewrite (3-agent pipeline)
//  Returns (final_text, compliance_analysis, draft_text, review_notes)
// ─────────────────────────────────────────────────────────────────────────────

fn deep_rewrite_inner(
    scrubbed: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
    quality: &QualityScanResult,
) -> Result<(String, String, String, String), String> {
    let missing_prompt = build_missing_pillars_prompt(quality);

    // Agent 1: Compliance Checker
    let compliance_analysis =
        agent_compliance_checker(scrubbed, config, engine)?;

    // Agent 2: Rewriter
    let draft_text =
        agent_rewriter(scrubbed, &compliance_analysis, config, engine, &missing_prompt)?;

    // Agent 3: Quality Reviewer
    let (final_text, review_notes) =
        agent_quality_reviewer(&draft_text, config, engine)?;

    Ok((final_text, compliance_analysis, draft_text, review_notes))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Missing pillars prompt builder
// ─────────────────────────────────────────────────────────────────────────────

/// Build the [MISSING: ...] placeholder instructions from the quality scan result.
fn build_missing_pillars_prompt(quality: &QualityScanResult) -> String {
    if quality.missing_pillars.is_empty() {
        return "All 5 compliance pillars are present in this note. No placeholders needed.".to_string();
    }
    let lines: Vec<String> = quality
        .missing_pillars
        .iter()
        .map(|p| format!("- {} → insert: {}", p.pillar_name, p.prompt_question))
        .collect();
    format!(
        "The following compliance pillars are MISSING from this note. \
         Insert the corresponding [MISSING: ...] placeholder at the appropriate \
         location in the rewritten note:\n{}",
        lines.join("\n")
    )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agent 1 — Compliance Checker
// ─────────────────────────────────────────────────────────────────────────────

fn agent_compliance_checker(
    raw_text: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
) -> Result<String, String> {
    let system = format!(
        r#"You are an NDIS compliance analysis agent specialising in {service_type} supports.

Your role is to review raw progress notes and identify compliance issues against the NDIS Practice Standards and Quality Indicators.

COMPLIANCE RULES FOR THIS SERVICE TYPE ({service_type}):
{rules}

REQUIRED FIELDS (must be present in a compliant note):
{fields}

PROHIBITED TERMS (flag any of these if present):
{prohibited}

Your task:
- Identify what required information is missing from the note
- Flag any language that is non-compliant, subjective, or prohibited
- Note structural issues (missing sections, unclear outcomes, no goal linkage)
- Identify what needs to be restructured for NDIS Practice Standards alignment

Output a structured analysis with EXACTLY these headings:
MISSING INFORMATION:
[List each missing required field or information gap]

NON-COMPLIANT LANGUAGE:
[Quote specific phrases and explain why they are non-compliant]

STRUCTURAL ISSUES:
[List structural problems]

RECOMMENDATIONS:
[Specific, actionable steps for the rewriter to address]

Be specific and actionable. Do not rewrite the note — only analyse it."#,
        service_type = config.service_type,
        rules = config.rules_list(),
        fields = config.fields_list(),
        prohibited = config.prohibited_list(),
    );

    let user_prompt = format!(
        "Please analyse the following raw progress note for NDIS compliance issues:\n\n---\n{}\n---",
        raw_text
    );

    engine::infer(engine, &system, &user_prompt)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agent 2 — Rewriter
// ─────────────────────────────────────────────────────────────────────────────

fn agent_rewriter(
    raw_text: &str,
    compliance_analysis: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
    missing_prompt: &str,
) -> Result<String, String> {
    let system = format!(
        r#"RULE 0 — NO HALLUCINATION (OVERRIDES ALL OTHER RULES):
You are strictly prohibited from fabricating, guessing, or assuming any information not present in the raw note. If information is missing, insert an orange bracket: [MISSING: specific question]. Never fill in blanks to make a note look complete. Every word in the output must trace back to the human worker's input.

OBJECTIVE:
Transform raw, worker-centric NDIS support notes into "Gold Standard" outcome-based documentation that survives a 2026 NDIS Quality and Safeguards Commission audit. Move from "What the worker did" (Activity) to "What the participant achieved" (Outcome).

RULE 1 — THE SUBJECT SHIFT:
• NEVER start with "I," "Staff," or "The worker."
• ALWAYS start with "The participant," "[Name]," or "The individual."
• Example: Change "I drove him to the shops" to "The participant accessed the community via staff transport to complete weekly grocery shopping."

RULE 2 — USE EVIDENCE VERBS:
Replace passive verbs (helped, assisted, took) with Capacity Building Verbs:
• Chose / Decided / Selected (Proves Choice & Control)
• Practiced / Developed / Navigated (Proves Skill Building)
• Led / Initiated / Directed (Proves Independence)
• Communicated / Expressed (Proves Decision Making)

RULE 3 — ACTIVITY-TO-OUTCOME FRAMEWORK:
Every rewritten note must follow this formula:
[Participant Action] + [Support Provided] + [Outcome/Goal Link]
If the raw note does not contain a goal link or outcome, do NOT invent one. Insert: [MISSING: Which NDIS goal did this activity support?] or [MISSING: What outcome or progress did the participant demonstrate?]

RULE 4 — 2026 NUDGE (REFLECTIVE RISK):
If the raw note mentions a problem or risk, show the Safety-over-Compliance shift:
• Instead of just "Risk assessment followed," write: "Worker applied the environmental risk assessment by [Specific Action from note] to ensure participant safety during the activity."
• If the specific action is not in the note, insert: [MISSING: What specific action did the worker take to manage this risk?]

RULE 5 — TONE & STYLE:
• No Fluff: Do not use words like "lovely," "happy," or "nice" unless they describe a specific measurable outcome.
• Audit-Ready: Use professional terminology (e.g., Restrictive Practice, Dignity of Risk, Community Access, Informed Choice).

RULE 6 — FINAL VERIFICATION (before outputting):
1. Is there a clear link to a goal or independence? If not, insert [MISSING: ...] bracket.
2. Is the participant the "hero" of the sentence? If not, restructure.

MANDATORY ORANGE BRACKETS:
For each of the 5 Pillars, if the raw note does not contain the information:
- [MISSING: Which NDIS goal did this activity support?] (Goal Alignment)
- [MISSING: How did the participant respond to this activity?] (Participant Response)
- [MISSING: What specific support actions were provided?] (Worker Actions)
- [MISSING: Were there any risk or safety observations?] (Risk/Safety)
- [MISSING: What outcome or progress was achieved?] (Outcomes/Progress)

COMPLIANCE RULES TO MEET ({service_type}):
{rules}

REQUIRED FIELDS (all must be present in your output):
{fields}

OUTPUT FORMAT (follow this structure exactly):
{template}

TONE AND LANGUAGE GUIDELINES:
{tone}

PROHIBITED TERMS (do not use these):
{prohibited}

EXAMPLE OF A CORRECTLY FORMATTED NOTE:
{example}

MISSING PILLAR PLACEHOLDERS TO INCLUDE:
{missing_prompt}

INSTRUCTIONS:
- Rewrite the note to address ALL issues identified in the compliance analysis and apply the NDIS Gold Standard transformation rules
- Ensure every required field is present and complete
- Follow the output format exactly
- Maintain ALL factual content from the original — do not omit or alter facts
- Apply tone guidelines throughout
- Do not use any prohibited terms
- Insert [MISSING: ...] brackets for any information not present in the original
- Output ONLY the rewritten note — no commentary, no preamble"#,
        service_type = config.service_type,
        rules = config.rules_list(),
        fields = config.fields_list(),
        template = if config.format_template.is_empty() {
            "Use a clear, structured format with appropriate headings.".to_string()
        } else {
            config.format_template.clone()
        },
        tone = config.tone_list(),
        prohibited = config.prohibited_list(),
        example = if config.example_output.is_empty() {
            "No example provided.".to_string()
        } else {
            config.example_output.clone()
        },
        missing_prompt = missing_prompt,
    );

    let user_prompt = format!(
        r#"Please rewrite the following raw progress note into audit-ready format.

ORIGINAL RAW NOTE:
---
{}
---

COMPLIANCE ANALYSIS (issues to address):
---
{}
---

Produce the rewritten, audit-ready note now:"#,
        raw_text, compliance_analysis
    );

    engine::infer(engine, &system, &user_prompt)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Agent 3 — Quality Reviewer
// ─────────────────────────────────────────────────────────────────────────────

fn agent_quality_reviewer(
    draft_text: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
) -> Result<(String, String), String> {
    let system = format!(
        r#"You are an NDIS quality review agent specialising in {service_type} supports.

Your role is to perform a final quality check on a rewritten progress note and make any necessary adjustments.

COMPLIANCE RULES TO VERIFY:
{rules}

REQUIRED FIELDS (verify all are present):
{fields}

TONE GUIDELINES (verify these are applied):
{tone}

PROHIBITED TERMS (check none are present):
{prohibited}

NO-HALLUCINATION DIRECTIVE (CRITICAL):
- Do NOT add any information that was not in the draft note.
- If a [MISSING: ...] placeholder is present, leave it as-is — do NOT fill it in with invented content.
- Only make corrections to grammar, clarity, tone, and compliance language.

Your task:
- Verify the note meets all compliance rules
- Check all required fields are present and complete (or have [MISSING: ...] placeholders)
- Ensure no prohibited terms are used
- Verify tone guidelines are applied throughout
- Make minor adjustments if needed (grammar, clarity, compliance gaps)
- Ensure the note reads naturally and professionally
- Leave all [MISSING: ...] placeholders exactly as they are

Output your response in EXACTLY this format:

REVIEW NOTES:
[Your brief review commentary — what was checked, any changes made, overall assessment]

FINAL NOTE:
[The final, polished, audit-ready progress note]"#,
        service_type = config.service_type,
        rules = config.rules_list(),
        fields = config.fields_list(),
        tone = config.tone_list(),
        prohibited = config.prohibited_list(),
    );

    let user_prompt = format!(
        "Please review and finalise the following rewritten progress note:\n\n---\n{}\n---",
        draft_text
    );

    let response = engine::infer(engine, &system, &user_prompt)?;
    let (review_notes, final_text) = parse_reviewer_response(&response);
    Ok((final_text, review_notes))
}

fn parse_reviewer_response(response: &str) -> (String, String) {
    let response_upper = response.to_uppercase();
    if let Some(final_pos) = response_upper.find("FINAL NOTE:") {
        let review_part = response[..final_pos].trim();
        let final_part = response[final_pos + "FINAL NOTE:".len()..].trim();
        let review_clean = if let Some(review_pos) = review_part.to_uppercase().find("REVIEW NOTES:") {
            review_part[review_pos + "REVIEW NOTES:".len()..].trim().to_string()
        } else {
            review_part.to_string()
        };
        (review_clean, final_part.to_string())
    } else {
        (
            "Review completed. Output provided as final note.".to_string(),
            response.trim().to_string(),
        )
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public convenience wrappers (called from lib.rs)
// ─────────────────────────────────────────────────────────────────────────────

/// Single-note rewrite (Quick or Deep mode).
/// Kept for backwards compatibility with the existing `rewrite_note` Tauri command.
#[allow(dead_code)]
pub async fn quick_rewrite(
    raw_text: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
) -> Result<PipelineResult, String> {
    process_note(raw_text, config, engine, "quick", None).await
}

/// Single-note Deep mode rewrite.
#[allow(dead_code)]
pub async fn run_pipeline(
    raw_text: &str,
    config: &CartridgeConfig,
    engine: &EngineState,
) -> Result<PipelineResult, String> {
    process_note(raw_text, config, engine, "deep", None).await
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Test 1: ORANGE — missing pillars, no red flags ──────────────────────
    #[test]
    fn test_traffic_light_orange_missing_pillars() {
        // Simulate the pipeline logic (without the inference call)
        let text = "Took [NAME] to the shops.";
        let safety = safety_scan::safety_scan(text);
        let quality = quality_scan::quality_scan(text);

        assert!(!safety.is_red, "Should NOT be RED");
        assert!(!quality.is_green, "Should NOT be GREEN — missing pillars");

        let traffic_light = if safety.is_red {
            TrafficLight::Red
        } else if !quality.is_green {
            TrafficLight::Orange
        } else {
            TrafficLight::Green
        };

        assert_eq!(traffic_light, TrafficLight::Orange);
        assert!(!quality.missing_pillars.is_empty());

        // Verify the [MISSING: ...] prompts are correct
        let missing_names: Vec<&str> = quality
            .missing_pillars
            .iter()
            .map(|p| p.pillar_name.as_str())
            .collect();
        assert!(missing_names.contains(&"Goal Alignment"));
        assert!(missing_names.contains(&"Participant Response"));
        assert!(missing_names.contains(&"Outcomes / Progress"));
    }

    // ── Test 2: ORANGE — missing pillars, with [MISSING: ...] prompts ───────
    #[test]
    fn test_orange_missing_prompt_format() {
        let text = "Took [NAME] to the shops.";
        let quality = quality_scan::quality_scan(text);
        for mp in &quality.missing_pillars {
            assert!(mp.prompt_question.starts_with("[MISSING:"));
            assert!(mp.prompt_question.ends_with(']'));
        }
        // Verify the expected prompts are present
        let prompts: Vec<&str> = quality
            .missing_pillars
            .iter()
            .map(|p| p.prompt_question.as_str())
            .collect();
        assert!(prompts.contains(&"[MISSING: Which NDIS goal did this activity support?]"));
        assert!(prompts.contains(&"[MISSING: How did the participant respond to this activity?]"));
        assert!(prompts.contains(&"[MISSING: What was the outcome or progress made during this shift?]"));
    }

    // ── Test 3: GREEN — all 5 pillars present ───────────────────────────────
    #[test]
    fn test_traffic_light_green_all_pillars() {
        let text = "Supported [NAME] with her weekly grocery shopping as per her NDIS goal \
                    of building independent living skills. [NAME] chose items from her shopping \
                    list independently and responded positively, expressing pride in managing \
                    her budget. Worker provided verbal prompts only. No safety concerns observed. \
                    [NAME] successfully completed the shop within budget, demonstrating improved \
                    confidence compared to last week.";

        let safety = safety_scan::safety_scan(text);
        let quality = quality_scan::quality_scan(text);

        assert!(!safety.is_red, "Should NOT be RED");
        assert!(quality.is_green, "Should be GREEN — all 5 pillars present");

        let traffic_light = if safety.is_red {
            TrafficLight::Red
        } else if !quality.is_green {
            TrafficLight::Orange
        } else {
            TrafficLight::Green
        };

        assert_eq!(traffic_light, TrafficLight::Green);
        assert_eq!(quality.present_pillars.len(), 5);
    }

    // ── Test 4: RED overrides GREEN ─────────────────────────────────────────
    #[test]
    fn test_traffic_light_red_overrides_green() {
        // This note has all 5 pillars BUT also contains a red flag keyword.
        let text = "Supported [NAME] with her weekly grocery shopping as per her NDIS goal. \
                    [NAME] responded positively. Worker assisted with prompts. \
                    No safety concerns. Good progress made. \
                    However, another participant was physically restrained by a staff member in the car park.";

        let safety = safety_scan::safety_scan(text);
        let quality = quality_scan::quality_scan(text);

        // Safety scan MUST find a red flag
        assert!(safety.is_red, "Should be RED — 'restrained' keyword matched");

        // Traffic light determination — RED is locked regardless of quality
        let traffic_light = if safety.is_red {
            TrafficLight::Red
        } else if !quality.is_green {
            TrafficLight::Orange
        } else {
            TrafficLight::Green
        };

        assert_eq!(traffic_light, TrafficLight::Red);

        // Quality scan still runs — verify it found pillars
        // (the pipeline doesn't skip quality scan for red notes)
        assert!(!quality.present_pillars.is_empty(), "Quality scan should still run for RED notes");
    }

    // ── Test 5: Batch processing — RED does not halt the batch ──────────────
    #[test]
    fn test_batch_non_blocking_logic() {
        // Simulate what the batch loop does: process each note independently
        let notes = vec![
            "Supported [NAME] with shopping as per NDIS goal. Responded positively. Worker assisted. No safety concerns. Good progress made.",
            "Client was restrained by staff.", // RED
            "Took [NAME] to the shops.",       // ORANGE
        ];

        let mut results: Vec<TrafficLight> = Vec::new();

        for note in &notes {
            let safety = safety_scan::safety_scan(note);
            let quality = quality_scan::quality_scan(note);
            let tl = if safety.is_red {
                TrafficLight::Red
            } else if !quality.is_green {
                TrafficLight::Orange
            } else {
                TrafficLight::Green
            };
            results.push(tl);
        }

        // All 3 notes processed — batch was non-blocking
        assert_eq!(results.len(), 3);
        // Note 2 is RED
        assert_eq!(results[1], TrafficLight::Red);
        // Note 3 is ORANGE
        assert_eq!(results[2], TrafficLight::Orange);
    }

    // ── Utility tests ────────────────────────────────────────────────────────
    #[test]
    fn test_parse_reviewer_response_with_format() {
        let response = "REVIEW NOTES:\nLooks good overall.\n\nFINAL NOTE:\nThe participant engaged well.";
        let (review, final_text) = parse_reviewer_response(response);
        assert!(review.contains("Looks good"));
        assert!(final_text.contains("participant engaged"));
    }

    #[test]
    fn test_parse_reviewer_response_without_format() {
        let response = "The participant engaged well in today's session.";
        let (review, final_text) = parse_reviewer_response(response);
        assert_eq!(review, "Review completed. Output provided as final note.");
        assert!(final_text.contains("participant engaged"));
    }

    #[test]
    fn test_cartridge_config_from_json() {
        let json = r#"{"service_type":"Daily Living","compliance_rules":["Rule 1","Rule 2"],"required_fields":["Field A"],"format_template":"TEMPLATE","tone_guidelines":["Tone 1"],"prohibited_terms":["bad word"],"example_output":"Example"}"#;
        let config = CartridgeConfig::from_json(json);
        assert_eq!(config.service_type, "Daily Living");
        assert_eq!(config.compliance_rules.len(), 2);
        assert_eq!(config.prohibited_terms[0], "bad word");
    }

    #[test]
    fn test_missing_pillars_prompt_builder() {
        let quality = quality_scan::quality_scan("Took [NAME] to the shops.");
        let prompt = build_missing_pillars_prompt(&quality);
        assert!(prompt.contains("[MISSING:"));
        assert!(prompt.contains("Goal Alignment") || prompt.contains("NDIS goal"));
    }

    #[test]
    fn test_traffic_light_as_str() {
        assert_eq!(TrafficLight::Red.as_str(), "red");
        assert_eq!(TrafficLight::Orange.as_str(), "orange");
        assert_eq!(TrafficLight::Green.as_str(), "green");
    }
}
