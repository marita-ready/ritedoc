use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

// ===== Processing Mode =====

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessingMode {
    Standard,
    Turbo,
}

impl ProcessingMode {
    pub fn label(&self) -> &str {
        match self {
            ProcessingMode::Standard => "Standard Mode",
            ProcessingMode::Turbo => "Turbo Mode",
        }
    }
}

// ===== Hardware Profile =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub mode: ProcessingMode,
    pub cpu_cores: u32,
    pub ram_gb: f64,
    pub has_gpu: bool,
    pub gpu_name: Option<String>,
    pub gpu_vram_gb: Option<f64>,
    pub recommended_threads: u32,
    pub recommended_gpu_layers: i32,
}

// ===== Self-Fix State =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfFixState {
    pub model_loaded: bool,
    pub model_healthy: bool,
    pub ram_ok: bool,
    pub disk_ok: bool,
    pub licence_valid: bool,
    pub licence_cache_days_remaining: i32,
    pub last_check: String,
    pub issues: Vec<SelfFixIssue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfFixIssue {
    pub category: String,
    pub description: String,
    pub action_taken: String,
    pub resolved: bool,
    pub timestamp: String,
}

// ===== Cartridge Configs =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartridgeSet {
    pub red_flags: serde_json::Value,
    pub rubric: serde_json::Value,
    pub policies: serde_json::Value,
    pub system_prompts: serde_json::Value,
}

// ===== Supabase Config =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseConfig {
    pub url: String,
    pub anon_key: String,
}

impl Default for SupabaseConfig {
    fn default() -> Self {
        Self {
            // These will be overridden by environment or config file
            url: "https://your-project.supabase.co".to_string(),
            anon_key: "your-anon-key".to_string(),
        }
    }
}

// ===== Application State =====

pub struct AppState {
    pub app_data_dir: PathBuf,
    pub resource_dir: PathBuf,
    pub participant_profiles: Mutex<HashMap<String, ParticipantProfile>>,
    pub batch_state: Mutex<Option<BatchState>>,
    pub hardware_profile: Mutex<Option<HardwareProfile>>,
    pub self_fix_state: Mutex<SelfFixState>,
    pub cartridges: Mutex<Option<CartridgeSet>>,
    pub is_activated: Mutex<bool>,
    pub supabase_config: SupabaseConfig,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf, resource_dir: PathBuf) -> Self {
        // Load Supabase config from environment or config file
        let supabase_config = load_supabase_config(&app_data_dir);

        Self {
            app_data_dir,
            resource_dir,
            participant_profiles: Mutex::new(HashMap::new()),
            batch_state: Mutex::new(None),
            hardware_profile: Mutex::new(None),
            self_fix_state: Mutex::new(SelfFixState {
                model_loaded: false,
                model_healthy: false,
                ram_ok: true,
                disk_ok: true,
                licence_valid: true,
                licence_cache_days_remaining: 7,
                last_check: String::new(),
                issues: Vec::new(),
            }),
            cartridges: Mutex::new(None),
            is_activated: Mutex::new(false),
            supabase_config,
        }
    }
}

/// Load Supabase configuration from config file or environment
fn load_supabase_config(app_data_dir: &PathBuf) -> SupabaseConfig {
    // Try config file first
    let config_path = app_data_dir.join("supabase_config.json");
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<SupabaseConfig>(&content) {
                return config;
            }
        }
    }

    // Try environment variables
    let url = std::env::var("RITEDOC_SUPABASE_URL")
        .unwrap_or_else(|_| "https://your-project.supabase.co".to_string());
    let anon_key = std::env::var("RITEDOC_SUPABASE_ANON_KEY")
        .unwrap_or_else(|_| "your-anon-key".to_string());

    SupabaseConfig { url, anon_key }
}

// ===== Participant Profile =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantProfile {
    pub id: String,
    pub name: String,
    pub goals: Vec<String>,
    pub notes_processed: u32,
}

// ===== Raw Note =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawNote {
    pub id: String,
    pub participant_name: String,
    pub support_worker: String,
    pub date: String,
    pub time: String,
    pub duration: String,
    pub raw_text: String,
    pub source_platform: String,
    pub row_index: usize,
}

// ===== PII Mapping =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiMapping {
    pub original: String,
    pub tag: String,
    pub category: String,
}

// ===== Scrubbed Note =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrubbedNote {
    pub scrubbed_text: String,
    pub pii_mappings: Vec<PiiMapping>,
}

// ===== Red Flag =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedFlag {
    pub category: String,
    pub description: String,
    pub keywords_matched: Vec<String>,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequiredForm {
    pub form_name: String,
    pub fields: Vec<FormField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormField {
    pub label: String,
    pub value: Option<String>,
    pub placeholder: Option<String>,
    pub is_missing: bool,
}

// ===== Missing Data =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingDataItem {
    pub field_name: String,
    pub reason: String,
    pub placeholder: String,
    pub submitted_value: Option<String>,
}

// ===== Pillar Score =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PillarScore {
    pub pillar_name: String,
    pub pillar_id: u8,
    pub score: u8,
    pub met: bool,
    pub feedback: String,
}

// ===== Traffic Light =====

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum TrafficLight {
    #[serde(rename = "RED")]
    Red,
    #[serde(rename = "ORANGE")]
    Orange,
    #[serde(rename = "GREEN")]
    Green,
}

impl TrafficLight {
    pub fn sort_order(&self) -> u8 {
        match self {
            TrafficLight::Red => 0,
            TrafficLight::Orange => 1,
            TrafficLight::Green => 2,
        }
    }

    pub fn label(&self) -> &str {
        match self {
            TrafficLight::Red => "Needs Attention",
            TrafficLight::Orange => "Review Required",
            TrafficLight::Green => "Review and Approve",
        }
    }
}

// ===== Agent Outputs =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent1Output {
    pub rewritten_note: String,
    pub red_flags: Vec<RedFlag>,
    pub missing_data: Vec<MissingDataItem>,
    pub bracket_flags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent2Output {
    pub audited_note: String,
    pub pillar_scores: Vec<PillarScore>,
    pub traffic_light: TrafficLight,
    pub hallucination_check: bool,
    pub audit_notes: String,
}

// ===== Processed Note =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedNote {
    pub id: String,
    pub participant_name: String,
    pub participant_code: String,
    pub support_worker: String,
    pub date: String,
    pub time: String,
    pub raw_text: String,
    pub rewritten_note: String,
    pub traffic_light: TrafficLight,
    pub red_flags: Vec<RedFlag>,
    pub missing_data: Vec<MissingDataItem>,
    pub pillar_scores: Vec<PillarScore>,
    pub is_done: bool,
    pub is_flagged: bool,
    pub preview: String,
    pub processing_mode: String,
    pub processing_time_ms: u64,
}

// ===== Batch State =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchState {
    pub total_notes: usize,
    pub processed_count: usize,
    pub notes: Vec<ProcessedNote>,
    pub source_platform: String,
    pub start_time: String,
    pub is_complete: bool,
    pub processing_mode: String,
}

// ===== Batch Summary =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchSummary {
    pub total_notes: usize,
    pub green_count: usize,
    pub orange_count: usize,
    pub red_count: usize,
    pub processing_time: String,
    pub unresolved_red_flags: Vec<UnresolvedItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnresolvedItem {
    pub participant_name: String,
    pub participant_code: String,
    pub description: String,
    pub required_forms: Vec<String>,
}

// ===== CSV Parse Result =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvParseResult {
    pub platform: String,
    pub notes: Vec<RawNote>,
    pub total_count: usize,
    pub warnings: Vec<String>,
}

// ===== Command Responses =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessNoteResponse {
    pub note: ProcessedNote,
    pub has_missing_data: bool,
    pub missing_items: Vec<MissingDataItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProgress {
    pub processed: usize,
    pub total: usize,
    pub latest_notes: Vec<ProcessedNote>,
    pub is_complete: bool,
}
