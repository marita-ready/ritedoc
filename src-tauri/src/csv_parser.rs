//! CSV Parser — Auto-detects 6 NDIS platforms and maps columns to RiteDoc fields.
//!
//! Supported platforms:
//!   - ShiftCare (Events Report — Details view)
//!   - Brevity (Data Export — Progress Notes)
//!   - Lumary (Salesforce report export)
//!   - Astalty (Support Notes Report)
//!   - SupportAbility (Activity Report)
//!   - CareMaster (Supports Reports)
//!
//! Falls back to a generic mapping if no platform signature matches.
//!
//! This module is 100% offline — it reads local CSV files only.
//! No network calls, no external APIs.

use serde::{Deserialize, Serialize};
use csv::ReaderBuilder;
use std::path::Path;
use uuid::Uuid;

// ─────────────────────────────────────────────────────────────────────────────
//  Public types
// ─────────────────────────────────────────────────────────────────────────────

/// A single raw note extracted from a CSV row.
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

/// The result of parsing a CSV file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvParseResult {
    pub platform: String,
    pub notes: Vec<RawNote>,
    pub total_count: usize,
    pub warnings: Vec<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
//  Column mapping internals
// ─────────────────────────────────────────────────────────────────────────────

/// Column mapping for different CMS platforms
struct ColumnMapping {
    participant_name: Vec<&'static str>,
    support_worker: Vec<&'static str>,
    date: Vec<&'static str>,
    time: Vec<&'static str>,
    duration: Vec<&'static str>,
    note_text: Vec<&'static str>,
}

/// Platform detection signatures — unique column headers per platform
struct PlatformSignature {
    name: &'static str,
    required_columns: Vec<&'static str>,
    mapping: ColumnMapping,
}

/// Get platform signatures based on csv_export_headers.md spec
fn get_platform_signatures() -> Vec<PlatformSignature> {
    vec![
        // ShiftCare: Events Report (Details view)
        PlatformSignature {
            name: "ShiftCare",
            required_columns: vec!["Client", "Staff", "Details"],
            mapping: ColumnMapping {
                participant_name: vec!["Client", "Client Name", "client", "client_name"],
                support_worker: vec!["Staff", "Carer Name", "Carer", "Worker", "staff"],
                date: vec!["Date", "Shift Date", "shift_date", "date"],
                time: vec!["Time", "Shift Time", "shift_time", "Start Time"],
                duration: vec!["Duration", "duration", "Hours"],
                note_text: vec!["Details", "Progress Notes", "progress_notes", "Notes", "Shift Notes"],
            },
        },
        // Brevity: Data Export for Progress Notes
        PlatformSignature {
            name: "Brevity",
            required_columns: vec!["Client Name", "Employee Name", "Progress Note"],
            mapping: ColumnMapping {
                participant_name: vec!["Client Name", "Participant", "participant", "client_name"],
                support_worker: vec!["Employee Name", "Staff Member", "staff_member", "Staff"],
                date: vec!["Date", "Service Date", "service_date"],
                time: vec!["Time", "Service Time", "service_time", "Start"],
                duration: vec!["Duration", "duration", "Hours"],
                note_text: vec!["Progress Note", "Case Note", "case_note", "Notes"],
            },
        },
        // Lumary: Salesforce report export
        PlatformSignature {
            name: "Lumary",
            required_columns: vec!["Client: Full Name", "Case Note Content"],
            mapping: ColumnMapping {
                participant_name: vec![
                    "Client: Full Name", "Client", "client", "Participant Name",
                ],
                support_worker: vec![
                    "Created By: Full Name", "Worker", "worker", "Support Worker",
                ],
                date: vec![
                    "Date/Time Created", "Appointment Date", "appointment_date", "Date",
                ],
                time: vec!["Date/Time Created", "Appointment Time", "appointment_time", "Time"],
                duration: vec!["Duration", "duration"],
                note_text: vec![
                    "Case Note Content", "Description", "Notes", "Session Notes",
                    "session_notes", "Progress Note", "Case Note",
                ],
            },
        },
        // Astalty: Support Notes Report
        PlatformSignature {
            name: "Astalty",
            required_columns: vec!["Participants", "Content"],
            mapping: ColumnMapping {
                participant_name: vec![
                    "Participants", "participant_name", "Participant Name", "Participant",
                ],
                support_worker: vec!["Created by", "worker_name", "Worker Name", "Worker"],
                date: vec!["Created at", "session_date", "Session Date", "Date"],
                time: vec!["Created at", "session_time", "Session Time", "Time"],
                duration: vec!["session_duration", "Duration"],
                note_text: vec!["Content", "progress_note", "Progress Note", "Notes"],
            },
        },
        // SupportAbility: Activity Report
        PlatformSignature {
            name: "SupportAbility",
            required_columns: vec!["Clients", "Activity Notes"],
            mapping: ColumnMapping {
                participant_name: vec![
                    "Clients", "Person Supported", "person_supported", "Participant",
                ],
                support_worker: vec!["Staff", "Support Staff", "support_staff"],
                date: vec!["From", "Date of Service", "date_of_service", "Date"],
                time: vec!["From", "Time of Service", "time_of_service", "Time"],
                duration: vec![
                    "Activity Hours", "Service Duration", "service_duration", "Duration",
                ],
                note_text: vec![
                    "Activity Notes", "Progress Notes", "progress_notes", "Notes", "Case Notes",
                ],
            },
        },
        // CareMaster: Supports Reports
        PlatformSignature {
            name: "CareMaster",
            required_columns: vec!["Support ID", "Case Note"],
            mapping: ColumnMapping {
                participant_name: vec!["Client", "client", "Participant"],
                support_worker: vec!["Support Worker", "support_worker", "Worker", "Staff"],
                date: vec!["Date", "date"],
                time: vec!["Time", "time"],
                duration: vec!["Duration", "duration"],
                note_text: vec!["Case Note", "case_note", "Notes", "Progress Note"],
            },
        },
    ]
}

/// Generic fallback mapping for unrecognised CSV formats
fn get_generic_mapping() -> ColumnMapping {
    ColumnMapping {
        participant_name: vec![
            "Participant", "Client", "Client Name", "Participant Name",
            "Person Supported", "Clients", "participant", "client", "name", "Name",
        ],
        support_worker: vec![
            "Worker", "Support Worker", "Staff", "Carer", "Staff Member",
            "Employee Name", "Created by", "Created By: Full Name",
            "worker", "support_worker", "staff", "carer",
        ],
        date: vec![
            "Date", "Service Date", "Shift Date", "Session Date",
            "Appointment Date", "Date/Time Created", "Created at", "From",
            "date", "service_date",
        ],
        time: vec![
            "Time", "Start Time", "Service Time", "Shift Time",
            "Session Time", "time", "start_time",
        ],
        duration: vec![
            "Duration", "Hours", "Service Duration", "Activity Hours",
            "duration", "hours",
        ],
        note_text: vec![
            "Notes", "Progress Notes", "Progress Note", "Case Note",
            "Session Notes", "Shift Notes", "Note", "Details",
            "Content", "Case Note Content", "Activity Notes", "Description",
            "notes", "progress_notes", "progress_note", "case_note",
        ],
    }
}

/// Find a matching column header from a list of candidates
fn find_column(headers: &[String], candidates: &[&str]) -> Option<usize> {
    for candidate in candidates {
        let lower_candidate = candidate.to_lowercase();
        for (i, header) in headers.iter().enumerate() {
            let lower_header = header.trim().to_lowercase();
            if lower_header == lower_candidate {
                return Some(i);
            }
        }
    }
    None
}

/// Detect which CMS platform the CSV was exported from
fn detect_platform(headers: &[String]) -> (String, ColumnMapping) {
    let lower_headers: Vec<String> = headers.iter().map(|h| h.trim().to_lowercase()).collect();

    for sig in get_platform_signatures() {
        let matches = sig.required_columns.iter().all(|req| {
            let lower_req = req.to_lowercase();
            lower_headers.iter().any(|h| h == &lower_req)
        });
        if matches {
            return (sig.name.to_string(), sig.mapping);
        }
    }

    ("Generic CSV".to_string(), get_generic_mapping())
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────────────────────

/// Parse a CSV file and extract progress notes.
/// 100% offline — reads a local file only.
pub fn parse_csv_file(file_path: &str) -> Result<CsvParseResult, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let mut reader = ReaderBuilder::new()
        .flexible(true)
        .trim(csv::Trim::All)
        .from_path(path)
        .map_err(|e| format!("Failed to read CSV: {}", e))?;

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| format!("Failed to read headers: {}", e))?
        .iter()
        .map(|h| h.to_string())
        .collect();

    let (platform, mapping) = detect_platform(&headers);

    let name_idx = find_column(&headers, &mapping.participant_name);
    let worker_idx = find_column(&headers, &mapping.support_worker);
    let date_idx = find_column(&headers, &mapping.date);
    let time_idx = find_column(&headers, &mapping.time);
    let duration_idx = find_column(&headers, &mapping.duration);
    let note_idx = find_column(&headers, &mapping.note_text);

    let mut warnings = Vec::new();

    if note_idx.is_none() {
        return Err(
            "Could not find a progress notes column in the CSV file. Please ensure your CSV contains a column with note text.".to_string(),
        );
    }

    if name_idx.is_none() {
        warnings.push(
            "Participant name column not detected. Notes will use row numbers as identifiers."
                .to_string(),
        );
    }

    let mut notes = Vec::new();

    for (row_index, result) in reader.records().enumerate() {
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                warnings.push(format!("Skipped row {}: {}", row_index + 2, e));
                continue;
            }
        };

        let get_field = |idx: Option<usize>| -> String {
            idx.and_then(|i| record.get(i))
                .map(|s| s.trim().to_string())
                .unwrap_or_default()
        };

        let raw_text = get_field(note_idx);
        if raw_text.is_empty() {
            continue;
        }

        let participant_name = get_field(name_idx);
        let note = RawNote {
            id: Uuid::new_v4().to_string(),
            participant_name: if participant_name.is_empty() {
                format!("Participant {}", row_index + 1)
            } else {
                participant_name
            },
            support_worker: get_field(worker_idx),
            date: get_field(date_idx),
            time: get_field(time_idx),
            duration: get_field(duration_idx),
            raw_text,
            source_platform: platform.clone(),
            row_index: row_index + 1,
        };

        notes.push(note);
    }

    let total_count = notes.len();

    if total_count == 0 {
        return Err(
            "No progress notes found in the CSV file. Please check that the file contains note data.".to_string(),
        );
    }

    Ok(CsvParseResult {
        platform,
        notes,
        total_count,
        warnings,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_shiftcare() {
        let headers = vec![
            "Date".to_string(),
            "Time".to_string(),
            "Client".to_string(),
            "Staff".to_string(),
            "Category".to_string(),
            "Details".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "ShiftCare");
    }

    #[test]
    fn test_detect_brevity() {
        let headers = vec![
            "Note ID".to_string(),
            "Date".to_string(),
            "Client Name".to_string(),
            "Employee Name".to_string(),
            "Service Type".to_string(),
            "Progress Note".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "Brevity");
    }

    #[test]
    fn test_detect_lumary() {
        let headers = vec![
            "Case Note: ID".to_string(),
            "Client: Full Name".to_string(),
            "Created By: Full Name".to_string(),
            "Date/Time Created".to_string(),
            "Subject".to_string(),
            "Case Note Content".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "Lumary");
    }

    #[test]
    fn test_detect_astalty() {
        let headers = vec![
            "Created by".to_string(),
            "Created at".to_string(),
            "Participants".to_string(),
            "Content".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "Astalty");
    }

    #[test]
    fn test_detect_supportability() {
        let headers = vec![
            "Activity ID".to_string(),
            "From".to_string(),
            "To".to_string(),
            "Activity Hours".to_string(),
            "Clients".to_string(),
            "Staff".to_string(),
            "Activity Notes".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "SupportAbility");
    }

    #[test]
    fn test_detect_caremaster() {
        let headers = vec![
            "Support ID".to_string(),
            "Date".to_string(),
            "Client".to_string(),
            "Support Worker".to_string(),
            "Service".to_string(),
            "Case Note".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "CareMaster");
    }

    #[test]
    fn test_detect_generic() {
        let headers = vec![
            "Name".to_string(),
            "Date".to_string(),
            "Notes".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "Generic CSV");
    }

    #[test]
    fn test_parse_csv_file_not_found() {
        let result = parse_csv_file("/nonexistent/file.csv");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File not found"));
    }

    #[test]
    fn test_parse_shiftcare_csv() {
        // Create a temporary CSV file
        let tmp_path = "/tmp/ritedoc_test_shiftcare.csv";
        let csv_content = "Date,Time,Client,Staff,Category,Details\n\
                           2026-01-15,09:00,Jane Smith,Worker A,Progress Note,Supported participant with morning routine.\n\
                           2026-01-15,14:00,John Doe,Worker B,Progress Note,Accompanied participant to community access.\n";
        std::fs::write(tmp_path, csv_content).unwrap();

        let result = parse_csv_file(tmp_path).unwrap();
        assert_eq!(result.platform, "ShiftCare");
        assert_eq!(result.total_count, 2);
        assert_eq!(result.notes[0].participant_name, "Jane Smith");
        assert_eq!(result.notes[0].support_worker, "Worker A");
        assert!(result.notes[0].raw_text.contains("morning routine"));
        assert_eq!(result.notes[1].participant_name, "John Doe");

        let _ = std::fs::remove_file(tmp_path);
    }

    #[test]
    fn test_parse_csv_no_notes_column() {
        let tmp_path = "/tmp/ritedoc_test_no_notes.csv";
        let csv_content = "ID,Name,Date\n1,Jane,2026-01-15\n";
        std::fs::write(tmp_path, csv_content).unwrap();

        let result = parse_csv_file(tmp_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("progress notes column"));

        let _ = std::fs::remove_file(tmp_path);
    }

    #[test]
    fn test_parse_csv_empty_notes() {
        let tmp_path = "/tmp/ritedoc_test_empty_notes.csv";
        let csv_content = "Client,Date,Notes\nJane,2026-01-15,\nJohn,2026-01-16,\n";
        std::fs::write(tmp_path, csv_content).unwrap();

        let result = parse_csv_file(tmp_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("No progress notes found"));

        let _ = std::fs::remove_file(tmp_path);
    }
}
