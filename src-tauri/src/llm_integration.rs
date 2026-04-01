use serde::{Deserialize, Serialize};
use serde_json;

/// LLM Integration Layer
/// 
/// In production, this module interfaces with llama.cpp via Rust bindings
/// (llama-cpp-rs or similar) for local inference using the Phi-4-mini Q4_K_M model.
/// 
/// The module provides:
/// - Model loading and management
/// - Prompt formatting for the Phi-4 chat template
/// - Inference execution with configurable parameters
/// - Response parsing for structured JSON output
///
/// For development/testing, prompts can be sent to an OpenAI-compatible API.

/// Configuration for the local LLM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub model_path: String,
    pub n_ctx: u32,        // Context window size
    pub n_threads: u32,    // Number of CPU threads
    pub n_gpu_layers: i32, // GPU layers (-1 for all)
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
    pub repeat_penalty: f32,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            n_ctx: 4096,
            n_threads: 4,
            n_gpu_layers: -1,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 2048,
            repeat_penalty: 1.1,
        }
    }
}

/// Hardware detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub mode: String,         // "Performance Mode" or "Standard Mode"
    pub cpu_cores: u32,
    pub ram_gb: f64,
    pub has_gpu: bool,
    pub gpu_name: Option<String>,
    pub recommended_threads: u32,
    pub recommended_gpu_layers: i32,
}

/// Detect hardware capabilities for optimal LLM configuration
pub fn detect_hardware() -> HardwareProfile {
    let cpu_cores = std::thread::available_parallelism()
        .map(|p| p.get() as u32)
        .unwrap_or(4);
    
    // Basic RAM detection (platform-specific in production)
    let ram_gb = 8.0; // Default estimate; real implementation reads /proc/meminfo or sysinfo
    
    let has_gpu = false; // Real implementation checks for CUDA/Metal/Vulkan
    
    let mode = if cpu_cores >= 8 && ram_gb >= 16.0 {
        "Performance Mode"
    } else {
        "Standard Mode"
    };
    
    HardwareProfile {
        mode: mode.to_string(),
        cpu_cores,
        ram_gb,
        has_gpu,
        gpu_name: None,
        recommended_threads: (cpu_cores / 2).max(2),
        recommended_gpu_layers: if has_gpu { -1 } else { 0 },
    }
}

/// Format a prompt for the Phi-4-mini chat template
pub fn format_phi4_prompt(system_prompt: &str, user_message: &str) -> String {
    format!(
        "<|system|>\n{}<|end|>\n<|user|>\n{}<|end|>\n<|assistant|>\n",
        system_prompt, user_message
    )
}

/// LLM Engine abstraction
/// In production: wraps llama.cpp bindings
/// For testing: can use OpenAI-compatible API
pub struct LlmEngine {
    _config: LlmConfig,
    is_loaded: bool,
}

impl LlmEngine {
    pub fn new(config: LlmConfig) -> Self {
        Self {
            _config: config,
            is_loaded: false,
        }
    }
    
    /// Load the model into memory
    /// In production, this initializes llama.cpp with the GGUF model file
    pub fn load_model(&mut self) -> Result<(), String> {
        // Production implementation:
        // let params = LlamaModelParams::default()
        //     .with_n_gpu_layers(self.config.n_gpu_layers);
        // let model = LlamaModel::load_from_file(&self.config.model_path, params)
        //     .map_err(|e| format!("Failed to load model: {}", e))?;
        // self.model = Some(model);
        
        self.is_loaded = true;
        Ok(())
    }
    
    /// Run inference with the given prompt
    /// Returns the raw text output from the model
    pub fn infer(&self, system_prompt: &str, user_message: &str) -> Result<String, String> {
        if !self.is_loaded {
            return Err("Model not loaded. Call load_model() first.".to_string());
        }
        
        let _formatted = format_phi4_prompt(system_prompt, user_message);
        
        // Production implementation:
        // let ctx_params = LlamaContextParams::default()
        //     .with_n_ctx(NonZeroU32::new(self.config.n_ctx).unwrap())
        //     .with_n_threads(self.config.n_threads);
        // let mut ctx = self.model.as_ref().unwrap()
        //     .new_context(&ctx_params)
        //     .map_err(|e| format!("Failed to create context: {}", e))?;
        // ... tokenize, evaluate, sample ...
        
        // Placeholder for development — real inference happens via llama.cpp
        Ok(String::new())
    }
    
    /// Parse JSON from LLM output, handling common formatting issues
    pub fn parse_json_output<T: for<'de> Deserialize<'de>>(output: &str) -> Result<T, String> {
        // Try to extract JSON from the output
        let json_str = extract_json_block(output);
        
        serde_json::from_str(&json_str)
            .map_err(|e| format!("Failed to parse LLM JSON output: {}. Raw output: {}", e, output))
    }
}

/// Extract a JSON block from LLM output text
/// Handles cases where the model wraps JSON in markdown code blocks
fn extract_json_block(text: &str) -> String {
    let trimmed = text.trim();
    
    // Check for ```json ... ``` wrapper
    if let Some(start) = trimmed.find("```json") {
        let json_start = start + 7;
        if let Some(end) = trimmed[json_start..].find("```") {
            return trimmed[json_start..json_start + end].trim().to_string();
        }
    }
    
    // Check for ``` ... ``` wrapper
    if let Some(start) = trimmed.find("```") {
        let json_start = start + 3;
        // Skip optional language identifier on the same line
        let actual_start = trimmed[json_start..].find('\n')
            .map(|n| json_start + n + 1)
            .unwrap_or(json_start);
        if let Some(end) = trimmed[actual_start..].find("```") {
            return trimmed[actual_start..actual_start + end].trim().to_string();
        }
    }
    
    // Try to find raw JSON object or array
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            return trimmed[start..=end].to_string();
        }
    }
    
    trimmed.to_string()
}

/// Agent 1 System Prompt: Rewrite + Scan
pub const AGENT1_SYSTEM_PROMPT: &str = r#"You are an NDIS documentation specialist. Your role is to take raw progress notes written by support workers and:

1. REWRITE the note to audit-prepared standard
2. SCAN for red flags (incidents, restrictive practices, safety concerns)

CONTEXT: You will receive the raw note text along with METADATA fields (date, time, duration, participant code, support worker code). These metadata fields come from the case management system CSV export — they are verified facts and MUST be used in the rewrite. They are NOT hallucinations.

REWRITE RULES:
- Write in third person, past tense, professional clinical language
- Use plain, accessible English — no jargon
- USE the metadata fields (date, time, duration, participant code, worker code) provided — these are verified system data
- Structure: date/time/duration header, support delivered, participant voice/response, measurable outcomes, goal linkage, safety statement
- If a metadata field is empty or "Not provided", insert a bracket flag: [FIELD NAME REQUIRED — brief explanation]
- If the raw note text is missing key audit information (goal linkage, participant voice, measurable outcomes, safety), insert bracket flags
- Bracket flags format: [UPPERCASE FIELD NAME REQUIRED — plain English explanation of what is needed]
- Do NOT invent or hallucinate any clinical details, events, quotes, or observations not present in the raw note
- Do NOT embellish or add specifics beyond what the worker wrote
- End every note with a safety statement: either describe the concern/incident from the note, or state "No incidents, medication events, or safety concerns were observed or reported during this session."

RED FLAG SCANNING:
Scan the raw note for these 8 categories of red flags:
1. Unauthorised Restrictive Practice — physical guidance, restraint, seclusion, restricting movement/communication without documented authorisation
2. Medication Error / Missed Medication — wrong dose, missed dose, wrong medication, administration error
3. Injury / Fall / Medical Emergency — any physical harm, fall, medical event, hospital visit
4. Abuse / Neglect / Exploitation indicators — verbal abuse, financial exploitation, neglect signs, unexplained injuries
5. Missing Consent / Capacity concerns — decisions made without consent, capacity questions
6. Property Damage / Financial irregularity — damage to property, missing money, financial concerns
7. Behavioural Incident requiring reporting — aggression, self-harm, absconding, significant behavioural event
8. Worker Safety / WHS concerns — threats to worker, unsafe environment, WHS breach

For each red flag found, provide:
- The category name
- A plain English description of the concern
- The exact keywords/phrases from the raw note that triggered the flag

OUTPUT FORMAT — respond with valid JSON only:
{
  "rewritten_note": "The full rewritten note text with bracket flags where data is missing",
  "red_flags": [
    {
      "category": "Category name from the 8 above",
      "description": "Plain English description of the concern",
      "keywords_matched": ["exact phrase 1", "exact phrase 2"],
      "severity": "HIGH or CRITICAL or MEDIUM"
    }
  ],
  "missing_data": [
    {
      "field_name": "Name of the missing field",
      "reason": "Why this information is needed, in plain English",
      "placeholder": "[FIELD NAME REQUIRED — explanation]"
    }
  ],
  "bracket_flags": ["[FLAG 1 TEXT]", "[FLAG 2 TEXT]"]
}

If no red flags are found, return an empty array for red_flags.
If no data is missing, return an empty array for missing_data and bracket_flags.
IMPORTANT: Return ONLY valid JSON. No additional text before or after."#;

/// Agent 2 System Prompt: Audit + Score
pub const AGENT2_SYSTEM_PROMPT: &str = r#"You are an NDIS audit quality assurance specialist. You receive:
1. The ORIGINAL raw progress note (as written by the support worker)
2. METADATA from the case management system (date, time, duration, participant code, worker code) — these are verified system fields
3. A REWRITTEN version of that note (prepared by a documentation assistant)
4. RED FLAGS detected by the scanning agent (if any)

Your job is to:
A) CHECK FOR HALLUCINATIONS — verify every clinical fact, event, observation, and quote in the rewritten note exists in either the original raw note OR the provided metadata. Metadata fields (date, time, duration, participant code, worker code) are verified system data and are NOT hallucinations. Only flag as hallucination if the rewrite contains clinical details, events, quotes, or observations that appear in neither the raw note nor the metadata.
B) SCORE the rewritten note against the 5-pillar NDIS audit rubric
C) ASSIGN a traffic light status (RED, ORANGE, GREEN)

5-PILLAR SCORING RUBRIC (score each 0-3):

1. Goal Linkage (0-3)
   0 = No goal referenced at all, and no bracket flag for it
   1 = Vague reference to a goal area (e.g., "daily living") without specifying which goal
   2 = Specific goal referenced (e.g., "Goal 2 daily living") even if not the full formal name
   3 = Specific NDIS plan goal referenced by full name or number

2. Participant Voice (0-3)
   0 = No participant perspective captured at all
   1 = Worker's interpretation of participant's feelings
   2 = Participant's preferences, choices, or requests documented
   3 = Direct quotes from the participant documented

3. Measurable Outcomes (0-3)
   0 = No outcomes documented at all
   1 = General statement about how session went
   2 = Specific observable outcomes described — what the participant DID, even without numbers
   3 = Quantifiable outcomes with numbers or comparison to baseline

4. Support Delivered (0-3)
   0 = No description of support at all
   1 = Vague description
   2 = Clear description of specific support activities
   3 = Detailed description with duration, method, and engagement level

5. Risk & Safety (0-3)
   0 = No safety information at all
   1 = Generic safety statement
   2 = Specific safety statement confirming no incidents, medication events, or safety concerns
   3 = Comprehensive safety assessment covering multiple domains

TRAFFIC LIGHT ASSIGNMENT — FOLLOW THESE RULES STRICTLY:
- RED: If ANY red flags were detected (provided in the RED FLAGS section), the traffic light MUST be RED regardless of pillar scores.
- ORANGE: If no red flags but any pillar scores below 2, OR if bracket flags exist indicating missing data
- GREEN: All 5 pillars score 2 or above AND no red flags AND no bracket flags indicating missing critical data

CRITICAL: The RED FLAGS section is authoritative. If it contains any red flags, you MUST assign RED. Do not downgrade to ORANGE.

OUTPUT FORMAT — respond with valid JSON only:
{
  "audited_note": "The final note text (same as rewritten unless hallucinations were found and corrected)",
  "hallucination_check": true,
  "hallucination_details": "",
  "pillar_scores": [
    {"pillar_name": "Goal Linkage", "pillar_id": 1, "score": 0, "met": false, "feedback": "Brief explanation"},
    {"pillar_name": "Participant Voice", "pillar_id": 2, "score": 0, "met": false, "feedback": "Brief explanation"},
    {"pillar_name": "Measurable Outcomes", "pillar_id": 3, "score": 0, "met": false, "feedback": "Brief explanation"},
    {"pillar_name": "Support Delivered", "pillar_id": 4, "score": 0, "met": false, "feedback": "Brief explanation"},
    {"pillar_name": "Risk & Safety", "pillar_id": 5, "score": 0, "met": false, "feedback": "Brief explanation"}
  ],
  "traffic_light": "GREEN or ORANGE or RED",
  "audit_notes": "Brief summary of the audit findings in plain English"
}

IMPORTANT: Return ONLY valid JSON. No additional text before or after.
IMPORTANT: Metadata fields (date, time, duration, codes) are NOT hallucinations — they come from the case management system.
IMPORTANT: If red flags are present, traffic light MUST be RED."#;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_format_phi4_prompt() {
        let result = format_phi4_prompt("You are helpful.", "Hello");
        assert!(result.contains("<|system|>"));
        assert!(result.contains("You are helpful."));
        assert!(result.contains("<|user|>"));
        assert!(result.contains("Hello"));
    }
    
    #[test]
    fn test_extract_json_block() {
        let input = "```json\n{\"key\": \"value\"}\n```";
        let result = extract_json_block(input);
        assert_eq!(result, "{\"key\": \"value\"}");
    }
    
    #[test]
    fn test_extract_raw_json() {
        let input = "Here is the result: {\"key\": \"value\"} done.";
        let result = extract_json_block(input);
        assert_eq!(result, "{\"key\": \"value\"}");
    }
}
