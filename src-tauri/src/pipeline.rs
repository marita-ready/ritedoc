//! 3-Agent Rewriting Pipeline + Quick Mode
//!
//! Two processing modes:
//!
//!   Quick Mode  — single-pass rewrite using a combined prompt (fast)
//!   Deep Mode   — full 3-agent pipeline (thorough, audit-grade)
//!
//! Both modes use the selected cartridge's full config_json in their prompts.
//! The pipeline is entirely stateless — nothing is persisted.
//!
//! Backend: Dockerized llama.cpp HTTP server (Nanoclaw) serving Phi-4-mini Q4_K_M.
//! The server exposes an OpenAI-compatible /v1/chat/completions endpoint.
//! Default URL: http://localhost:8080

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::scrubber::scrub_pii;

// ─────────────────────────────────────────────
//  Public types
// ─────────────────────────────────────────────

/// The full result returned to the frontend after the pipeline completes.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineResult {
    /// Final audit-ready text
    pub final_text: String,
    /// Mode used: "quick" or "deep"
    pub mode: String,
    /// Structured compliance analysis (Deep mode only; empty for Quick)
    pub compliance_analysis: String,
    /// Intermediate rewritten draft (Deep mode only; empty for Quick)
    pub draft_text: String,
    /// Quality review notes (Deep mode only; empty for Quick)
    pub review_notes: String,
}

/// Parsed cartridge configuration extracted from config_json.
/// Fields are optional so partial configs degrade gracefully.
#[derive(Debug, Default)]
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
    /// Parse a cartridge's config_json string into a CartridgeConfig.
    pub fn from_json(json: &str) -> Self {
        let v: Value = serde_json::from_str(json).unwrap_or(Value::Null);
        if v.is_null() {
            return Self::default();
        }

        let str_vec = |key: &str| -> Vec<String> {
            v[key]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|x| x.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default()
        };

        CartridgeConfig {
            service_type: v["service_type"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            compliance_rules: str_vec("compliance_rules"),
            required_fields: str_vec("required_fields"),
            format_template: v["format_template"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
            tone_guidelines: str_vec("tone_guidelines"),
            prohibited_terms: str_vec("prohibited_terms"),
            example_output: v["example_output"]
                .as_str()
                .unwrap_or_default()
                .to_string(),
        }
    }

    /// Format compliance rules as a numbered list for prompt injection.
    fn rules_list(&self) -> String {
        if self.compliance_rules.is_empty() {
            return "No specific compliance rules provided.".to_string();
        }
        self.compliance_rules
            .iter()
            .enumerate()
            .map(|(i, r)| format!("{}. {}", i + 1, r))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Format required fields as a bulleted list.
    fn fields_list(&self) -> String {
        if self.required_fields.is_empty() {
            return "No specific required fields provided.".to_string();
        }
        self.required_fields
            .iter()
            .map(|f| format!("- {}", f))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Format tone guidelines as a bulleted list.
    fn tone_list(&self) -> String {
        if self.tone_guidelines.is_empty() {
            return "Use professional, person-centred language.".to_string();
        }
        self.tone_guidelines
            .iter()
            .map(|t| format!("- {}", t))
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Format prohibited terms as a comma-separated list.
    fn prohibited_list(&self) -> String {
        if self.prohibited_terms.is_empty() {
            return "None specified.".to_string();
        }
        self.prohibited_terms.join(", ")
    }
}

// ─────────────────────────────────────────────
//  llama.cpp HTTP request / response shapes
//  (OpenAI-compatible /v1/chat/completions)
// ─────────────────────────────────────────────

#[derive(Serialize)]
struct ChatRequest {
    messages: Vec<ChatMessage>,
    temperature: f32,
    /// -1 means no limit (use model default)
    max_tokens: i32,
    stream: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

// ─────────────────────────────────────────────
//  Quick Mode — single-pass rewrite
// ─────────────────────────────────────────────

/// Single-pass rewrite using a combined prompt. Faster than Deep mode.
pub async fn quick_rewrite(
    raw_text: &str,
    config: &CartridgeConfig,
    server_url: &str,
) -> Result<PipelineResult, String> {
    // Scrub PII before sending to the inference server
    let scrubbed = scrub_pii(raw_text);
    log::info!("[quick_rewrite] PII scrubbed. Sending to Nanoclaw: {}", &scrubbed);

    let system = format!(
        r#"You are an expert NDIS progress note rewriter specialising in {service_type} supports.

Your task is to rewrite raw progress notes into professional, audit-ready documentation that meets NDIS Practice Standards and Quality Indicator requirements.

COMPLIANCE RULES FOR THIS SERVICE TYPE:
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

INSTRUCTIONS:
- Rewrite the note to meet all compliance rules above
- Ensure all required fields are addressed
- Follow the output format exactly
- Apply the tone guidelines throughout
- Do not use any prohibited terms
- Preserve ALL factual content from the original — do not add fabricated details
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
    );

    let user_prompt = format!(
        "Please rewrite the following raw progress note into an audit-ready format:\n\n---\n{}\n---\n\nRewritten note:",
        scrubbed
    );

    let final_text = call_llama(server_url, &system, &user_prompt).await?;

    Ok(PipelineResult {
        final_text,
        mode: "quick".to_string(),
        compliance_analysis: String::new(),
        draft_text: String::new(),
        review_notes: String::new(),
    })
}

// ─────────────────────────────────────────────
//  Deep Mode — full 3-agent pipeline
// ─────────────────────────────────────────────

/// Run the full 3-agent pipeline against the given raw note text.
pub async fn run_pipeline(
    raw_text: &str,
    config: &CartridgeConfig,
    server_url: &str,
) -> Result<PipelineResult, String> {
    // Scrub PII before sending to the inference server
    let scrubbed = scrub_pii(raw_text);
    log::info!("[run_pipeline] PII scrubbed. Sending to Nanoclaw: {}", &scrubbed);

    // ── Agent 1: Compliance Checker ─────────────────────────────
    let compliance_analysis =
        agent_compliance_checker(&scrubbed, config, server_url).await?;

    // ── Agent 2: Rewriter ───────────────────────────────────────
    let draft_text =
        agent_rewriter(&scrubbed, &compliance_analysis, config, server_url).await?;

    // ── Agent 3: Quality Reviewer ───────────────────────────────
    let (final_text, review_notes) =
        agent_quality_reviewer(&draft_text, config, server_url).await?;

    Ok(PipelineResult {
        final_text,
        mode: "deep".to_string(),
        compliance_analysis,
        draft_text,
        review_notes,
    })
}

// ─────────────────────────────────────────────
//  Agent 1 — Compliance Checker
// ─────────────────────────────────────────────

async fn agent_compliance_checker(
    raw_text: &str,
    config: &CartridgeConfig,
    server_url: &str,
) -> Result<String, String> {
    let system = format!(
        r#"You are an NDIS compliance analysis agent specialising in {service_type} supports.

Your role is to review raw progress notes and identify compliance issues against the NDIS Practice Standards and Quality Indicators.

COMPLIANCE RULES FOR THIS SERVICE TYPE:
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

    call_llama(server_url, &system, &user_prompt).await
}

// ─────────────────────────────────────────────
//  Agent 2 — Rewriter
// ─────────────────────────────────────────────

async fn agent_rewriter(
    raw_text: &str,
    compliance_analysis: &str,
    config: &CartridgeConfig,
    server_url: &str,
) -> Result<String, String> {
    let system = format!(
        r#"You are an NDIS progress note rewriting agent specialising in {service_type} supports.

Your role is to take raw progress notes and rewrite them into audit-ready, compliant documentation.

COMPLIANCE RULES TO MEET:
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

INSTRUCTIONS:
- Rewrite the note to address ALL issues identified in the compliance analysis
- Ensure every required field is present and complete
- Follow the output format exactly
- Maintain ALL factual content from the original — do not add fabricated details
- Apply tone guidelines throughout
- Do not use any prohibited terms
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

    call_llama(server_url, &system, &user_prompt).await
}

// ─────────────────────────────────────────────
//  Agent 3 — Quality Reviewer
// ─────────────────────────────────────────────

/// Returns (final_text, review_notes).
async fn agent_quality_reviewer(
    draft_text: &str,
    config: &CartridgeConfig,
    server_url: &str,
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

Your task:
- Verify the note meets all compliance rules
- Check all required fields are present and complete
- Ensure no prohibited terms are used
- Verify tone guidelines are applied throughout
- Make minor adjustments if needed (grammar, clarity, compliance gaps)
- Ensure the note reads naturally and professionally

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

    let response = call_llama(server_url, &system, &user_prompt).await?;
    let (review_notes, final_text) = parse_reviewer_response(&response);

    Ok((final_text, review_notes))
}

/// Parse Agent 3's response into (review_notes, final_text).
/// Falls back gracefully if the model doesn't follow the exact format.
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

// ─────────────────────────────────────────────
//  llama.cpp HTTP client
//  Calls the OpenAI-compatible /v1/chat/completions endpoint
// ─────────────────────────────────────────────

async fn call_llama(
    server_url: &str,
    system: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let url = format!("{}/v1/chat/completions", server_url.trim_end_matches('/'));

    let request_body = ChatRequest {
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_prompt.to_string(),
            },
        ],
        temperature: 0.3,
        max_tokens: -1,
        stream: false,
    };

    let client = reqwest::Client::new();

    let response = client
        .post(&url)
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Could not connect to the Nanoclaw rewriting server. Please make sure the Docker container is running.\n\nRun: cd nanoclaw && docker compose up -d".to_string()
            } else if e.is_timeout() {
                "The rewriting request timed out. The model may be processing a large note. Please try again, or use Quick mode for faster results.".to_string()
            } else {
                format!("Failed to reach the rewriting server: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "The rewriting server returned an error (HTTP {}).\n\nMake sure the Nanoclaw Docker container is running and the model file is present at nanoclaw/models/phi-4-mini-q4_k_m.gguf\n\nDetails: {}",
            status, body
        ));
    }

    let chat_resp: ChatResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse server response: {}", e))?;

    let content = chat_resp
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content.trim().to_string())
        .unwrap_or_default();

    if content.is_empty() {
        return Err("The rewriting server returned an empty response. Please try again.".to_string());
    }

    Ok(content)
}

// ─────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_reviewer_response_with_format() {
        let response = "REVIEW NOTES:\nLooks good overall. Minor grammar fix applied.\n\nFINAL NOTE:\nThe participant engaged well in today's session.";
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
        assert_eq!(config.required_fields.len(), 1);
        assert_eq!(config.prohibited_terms[0], "bad word");
    }

    #[test]
    fn test_cartridge_config_from_empty_json() {
        let config = CartridgeConfig::from_json("{}");
        assert!(config.service_type.is_empty());
        assert!(config.compliance_rules.is_empty());
    }
}
