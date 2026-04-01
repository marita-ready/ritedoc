use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

/// Application state managed by Tauri
pub struct AppState {
    pub app_data_dir: PathBuf,
    pub resource_dir: PathBuf,
    pub participant_profiles: Mutex<HashMap<String, ParticipantProfile>>,
    pub batch_state: Mutex<Option<BatchState>>,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf, resource_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            resource_dir,
            participant_profiles: Mutex::new(HashMap::new()),
            batch_state: Mutex::new(None),
        }
    }
}

/// Participant profile stored locally
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantProfile {
    pub id: String,
    pub name: String,
    pub goals: Vec<String>,
    pub notes_processed: u32,
}

/// Raw progress note parsed from CSV
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

/// PII mapping for scrub/restore
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PiiMapping {
    pub original: String,
    pub tag: String,
    pub category: String,
}

/// Scrubbed note ready for LLM processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrubbedNote {
    pub scrubbed_text: String,
    pub pii_mappings: Vec<PiiMapping>,
}

/// Red flag detected in a note
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedFlag {
    pub category: String,
    pub description: String,
    pub keywords_matched: Vec<String>,
    pub required_forms: Vec<RequiredForm>,
    pub severity: String,
}

/// Required form for a red flag
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequiredForm {
    pub form_name: String,
    pub fields: Vec<FormField>,
}

/// A field in a required form
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FormField {
    pub label: String,
    pub value: Option<String>,
    pub placeholder: Option<String>,
    pub is_missing: bool,
}

/// Missing data item detected during processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingDataItem {
    pub field_name: String,
    pub reason: String,
    pub placeholder: String,
    pub submitted_value: Option<String>,
}

/// Pillar score in the 5-pillar rubric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PillarScore {
    pub pillar_name: String,
    pub pillar_id: u8,
    pub score: u8, // 0-3 internal only, never shown to user
    pub met: bool,
    pub feedback: String,
}

/// Traffic light status
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

/// Agent 1 output: rewrite + scan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent1Output {
    pub rewritten_note: String,
    pub red_flags: Vec<RedFlag>,
    pub missing_data: Vec<MissingDataItem>,
    pub bracket_flags: Vec<String>,
}

/// Agent 2 output: audit + score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent2Output {
    pub audited_note: String,
    pub pillar_scores: Vec<PillarScore>,
    pub traffic_light: TrafficLight,
    pub hallucination_check: bool,
    pub audit_notes: String,
}

/// Fully processed note
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
}

/// Batch processing state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchState {
    pub total_notes: usize,
    pub processed_count: usize,
    pub notes: Vec<ProcessedNote>,
    pub source_platform: String,
    pub start_time: String,
    pub is_complete: bool,
}

/// Batch summary for Screen 4
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchSummary {
    pub total_notes: usize,
    pub green_count: usize,
    pub orange_count: usize,
    pub red_count: usize,
    pub processing_time: String,
    pub unresolved_red_flags: Vec<UnresolvedItem>,
}

/// Unresolved red flag item for batch summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnresolvedItem {
    pub participant_name: String,
    pub participant_code: String,
    pub description: String,
    pub required_forms: Vec<String>,
}

/// CSV platform detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvParseResult {
    pub platform: String,
    pub notes: Vec<RawNote>,
    pub total_count: usize,
    pub warnings: Vec<String>,
}

/// Response for process_note command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessNoteResponse {
    pub note: ProcessedNote,
    pub has_missing_data: bool,
    pub missing_items: Vec<MissingDataItem>,
}

/// Response for batch processing progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProgress {
    pub processed: usize,
    pub total: usize,
    pub latest_notes: Vec<ProcessedNote>,
    pub is_complete: bool,
}
