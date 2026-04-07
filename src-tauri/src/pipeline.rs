//! 3-Agent Rewriting Pipeline
//!
//! Processes raw NDIS progress notes through three sequential agents,
//! each calling a local Ollama LLM instance:
//!
//!   Agent 1 — Compliance Checker : analyses gaps & non-compliance
//!   Agent 2 — Rewriter           : produces an audit-ready draft
//!   Agent 3 — Quality Reviewer   : final polish & verification
//!
//! The pipeline is entirely stateless — nothing is persisted.

use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────
//  Public types
// ─────────────────────────────────────────────

/// The full result returned to the frontend after the pipeline completes.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PipelineResult {
    /// Final audit-ready text (output of Agent 3)
    pub final_text: String,
    /// Structured compliance analysis (output of Agent 1)
    pub compliance_analysis: String,
    /// Intermediate rewritten draft (output of Agent 2)
    pub draft_text: String,
    /// Quality review notes (output of Agent 3's review commentary)
    pub review_notes: String,
}

// ─────────────────────────────────────────────
//  Ollama request / response shapes
// ─────────────────────────────────────────────

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    system: String,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

// ─────────────────────────────────────────────
//  Pipeline execution
// ─────────────────────────────────────────────

/// Run the full 3-agent pipeline against the given raw note text.
///
/// * `raw_text`    – the user's raw progress note
/// * `config_json` – the cartridge's compliance rules / format config
/// * `model`       – Ollama model name (e.g. "llama3.2")
/// * `ollama_url`  – base URL of the Ollama API (e.g. "http://localhost:11434")
pub async fn run_pipeline(
    raw_text: &str,
    config_json: &str,
    model: &str,
    ollama_url: &str,
) -> Result<PipelineResult, String> {
    // ── Agent 1: Compliance Checker ─────────────────────────────
    let compliance_analysis = agent_compliance_checker(
        raw_text, config_json, model, ollama_url,
    )
    .await?;

    // ── Agent 2: Rewriter ───────────────────────────────────────
    let draft_text = agent_rewriter(
        raw_text,
        &compliance_analysis,
        config_json,
        model,
        ollama_url,
    )
    .await?;

    // ── Agent 3: Quality Reviewer ───────────────────────────────
    let (final_text, review_notes) = agent_quality_reviewer(
        &draft_text,
        config_json,
        model,
        ollama_url,
    )
    .await?;

    Ok(PipelineResult {
        final_text,
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
    config_json: &str,
    model: &str,
    ollama_url: &str,
) -> Result<String, String> {
    let system = format!(
        r#"You are an NDIS compliance analysis agent. Your role is to review raw progress notes written by support workers and identify compliance issues.

You will be given:
1. A raw progress note
2. A cartridge configuration containing compliance rules and format requirements for a specific NDIS service type

Your task:
- Identify what information is missing that is required for NDIS audit compliance
- Flag any language that is non-compliant (e.g. subjective, judgemental, or informal)
- Note any structural issues (e.g. missing date references, unclear participant outcomes, missing goal linkage)
- Identify what needs to be restructured for NDIS Practice Standards alignment

Output a structured analysis with clear headings:
- MISSING INFORMATION
- NON-COMPLIANT LANGUAGE
- STRUCTURAL ISSUES
- RECOMMENDATIONS

Be specific and actionable. Do not rewrite the note — only analyse it.

Cartridge Configuration:
{}"#,
        config_json
    );

    let prompt = format!(
        "Please analyse the following raw progress note for NDIS compliance issues:\n\n---\n{}\n---",
        raw_text
    );

    call_ollama(model, &system, &prompt, ollama_url).await
}

// ─────────────────────────────────────────────
//  Agent 2 — Rewriter
// ─────────────────────────────────────────────

async fn agent_rewriter(
    raw_text: &str,
    compliance_analysis: &str,
    config_json: &str,
    model: &str,
    ollama_url: &str,
) -> Result<String, String> {
    let system = format!(
        r#"You are an NDIS progress note rewriting agent. Your role is to take raw progress notes and rewrite them into audit-ready, compliant documentation.

You will be given:
1. The original raw progress note
2. A compliance analysis identifying issues found in the note
3. A cartridge configuration with the compliance rules and format requirements

Your task:
- Rewrite the note into a professional, audit-ready format
- Follow NDIS Practice Standards structure
- Address all issues identified in the compliance analysis
- Maintain ALL factual content from the original note — do not add fabricated details
- Use person-centred, strengths-based language
- Use objective, measurable observations where possible
- Structure the note clearly with appropriate sections
- Ensure the note would pass an NDIS audit

Output ONLY the rewritten note. Do not include commentary or explanations.

Cartridge Configuration:
{}"#,
        config_json
    );

    let prompt = format!(
        r#"Please rewrite the following raw progress note into audit-ready format.

ORIGINAL RAW NOTE:
---
{}
---

COMPLIANCE ANALYSIS:
---
{}
---

Produce the rewritten, audit-ready note now."#,
        raw_text, compliance_analysis
    );

    call_ollama(model, &system, &prompt, ollama_url).await
}

// ─────────────────────────────────────────────
//  Agent 3 — Quality Reviewer
// ─────────────────────────────────────────────

/// Returns (final_text, review_notes).
async fn agent_quality_reviewer(
    draft_text: &str,
    config_json: &str,
    model: &str,
    ollama_url: &str,
) -> Result<(String, String), String> {
    let system = format!(
        r#"You are an NDIS quality review agent. Your role is to perform a final quality check on a rewritten progress note and make any necessary adjustments.

You will be given:
1. A rewritten progress note (draft)
2. A cartridge configuration with compliance rules and format requirements

Your task:
- Verify the note meets all compliance requirements in the cartridge configuration
- Check for any remaining non-compliant language
- Ensure person-centred, strengths-based language throughout
- Verify the structure follows NDIS Practice Standards
- Make minor adjustments if needed (grammar, clarity, compliance gaps)
- Ensure the note reads naturally and professionally

Output your response in EXACTLY this format:

REVIEW NOTES:
[Your brief review commentary — what was checked, any changes made, overall assessment]

FINAL NOTE:
[The final, polished, audit-ready progress note]

Cartridge Configuration:
{}"#,
        config_json
    );

    let prompt = format!(
        "Please review and finalise the following rewritten progress note:\n\n---\n{}\n---",
        draft_text
    );

    let response = call_ollama(model, &system, &prompt, ollama_url).await?;

    // Parse the structured response into review_notes and final_text
    let (review_notes, final_text) = parse_reviewer_response(&response);

    Ok((final_text, review_notes))
}

/// Parse Agent 3's response into (review_notes, final_text).
/// Falls back gracefully if the model doesn't follow the exact format.
fn parse_reviewer_response(response: &str) -> (String, String) {
    // Try to find the "FINAL NOTE:" marker
    let response_upper = response.to_uppercase();

    if let Some(final_pos) = response_upper.find("FINAL NOTE:") {
        let review_part = response[..final_pos].trim();
        let final_part = response[final_pos + "FINAL NOTE:".len()..].trim();

        // Strip the "REVIEW NOTES:" prefix if present
        let review_clean = if let Some(stripped) = review_part
            .to_uppercase()
            .find("REVIEW NOTES:")
        {
            review_part[stripped + "REVIEW NOTES:".len()..].trim().to_string()
        } else {
            review_part.to_string()
        };

        (review_clean, final_part.to_string())
    } else {
        // Model didn't follow the format — treat entire response as the final text
        (
            "Review completed. Output provided as final note.".to_string(),
            response.trim().to_string(),
        )
    }
}

// ─────────────────────────────────────────────
//  Ollama HTTP client
// ─────────────────────────────────────────────

async fn call_ollama(
    model: &str,
    system: &str,
    prompt: &str,
    ollama_url: &str,
) -> Result<String, String> {
    let url = format!("{}/api/generate", ollama_url);

    let request_body = OllamaRequest {
        model: model.to_string(),
        prompt: prompt.to_string(),
        system: system.to_string(),
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
                "Could not connect to Ollama. Please make sure Ollama is running on your machine (http://localhost:11434). You can start it with: ollama serve".to_string()
            } else if e.is_timeout() {
                "The rewriting request timed out. The model may be too large for your hardware, or Ollama may be unresponsive. Please try again.".to_string()
            } else {
                format!("Failed to reach Ollama: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Ollama returned an error (HTTP {}). Make sure the model '{}' is pulled. Run: ollama pull {}\n\nDetails: {}",
            status, model, model, body
        ));
    }

    let ollama_resp: OllamaResponse = response.json().await.map_err(|e| {
        format!("Failed to parse Ollama response: {}", e)
    })?;

    Ok(ollama_resp.response.trim().to_string())
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
}
