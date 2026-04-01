use crate::models::{CsvParseResult, RawNote};
use csv::ReaderBuilder;
use std::path::Path;
use uuid::Uuid;

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

fn get_platform_signatures() -> Vec<PlatformSignature> {
    vec![
        PlatformSignature {
            name: "ShiftCare",
            required_columns: vec!["Client Name", "Carer Name", "Shift Date"],
            mapping: ColumnMapping {
                participant_name: vec!["Client Name", "client_name", "Client"],
                support_worker: vec!["Carer Name", "carer_name", "Carer", "Worker"],
                date: vec!["Shift Date", "shift_date", "Date"],
                time: vec!["Shift Time", "shift_time", "Start Time", "Time"],
                duration: vec!["Duration", "duration", "Hours"],
                note_text: vec!["Progress Notes", "progress_notes", "Notes", "Note", "Shift Notes"],
            },
        },
        PlatformSignature {
            name: "Brevity",
            required_columns: vec!["Participant", "Staff Member", "Service Date"],
            mapping: ColumnMapping {
                participant_name: vec!["Participant", "participant", "Client Name"],
                support_worker: vec!["Staff Member", "staff_member", "Staff"],
                date: vec!["Service Date", "service_date", "Date"],
                time: vec!["Service Time", "service_time", "Time", "Start"],
                duration: vec!["Duration", "duration", "Hours"],
                note_text: vec!["Case Note", "case_note", "Progress Note", "Notes"],
            },
        },
        PlatformSignature {
            name: "Lumary",
            required_columns: vec!["Client", "Worker", "Appointment Date"],
            mapping: ColumnMapping {
                participant_name: vec!["Client", "client", "Participant Name"],
                support_worker: vec!["Worker", "worker", "Support Worker"],
                date: vec!["Appointment Date", "appointment_date", "Date"],
                time: vec!["Appointment Time", "appointment_time", "Time"],
                duration: vec!["Duration", "duration"],
                note_text: vec!["Session Notes", "session_notes", "Notes", "Progress Note"],
            },
        },
        PlatformSignature {
            name: "Astalty",
            required_columns: vec!["participant_name", "worker_name", "session_date"],
            mapping: ColumnMapping {
                participant_name: vec!["participant_name", "Participant Name", "Participant"],
                support_worker: vec!["worker_name", "Worker Name", "Worker"],
                date: vec!["session_date", "Session Date", "Date"],
                time: vec!["session_time", "Session Time", "Time"],
                duration: vec!["session_duration", "Duration"],
                note_text: vec!["progress_note", "Progress Note", "Notes"],
            },
        },
        PlatformSignature {
            name: "SupportAbility",
            required_columns: vec!["Person Supported", "Support Staff", "Date of Service"],
            mapping: ColumnMapping {
                participant_name: vec!["Person Supported", "person_supported", "Participant"],
                support_worker: vec!["Support Staff", "support_staff", "Staff"],
                date: vec!["Date of Service", "date_of_service", "Date"],
                time: vec!["Time of Service", "time_of_service", "Time"],
                duration: vec!["Service Duration", "service_duration", "Duration"],
                note_text: vec!["Progress Notes", "progress_notes", "Notes", "Case Notes"],
            },
        },
    ]
}

/// Generic fallback mapping for unrecognised CSV formats
fn get_generic_mapping() -> ColumnMapping {
    ColumnMapping {
        participant_name: vec![
            "Participant", "Client", "Client Name", "Participant Name",
            "Person Supported", "participant", "client", "name", "Name",
        ],
        support_worker: vec![
            "Worker", "Support Worker", "Staff", "Carer", "Staff Member",
            "worker", "support_worker", "staff", "carer",
        ],
        date: vec![
            "Date", "Service Date", "Shift Date", "Session Date",
            "Appointment Date", "date", "service_date",
        ],
        time: vec![
            "Time", "Start Time", "Service Time", "Shift Time",
            "Session Time", "time", "start_time",
        ],
        duration: vec![
            "Duration", "Hours", "Service Duration", "duration", "hours",
        ],
        note_text: vec![
            "Notes", "Progress Notes", "Progress Note", "Case Note",
            "Session Notes", "Shift Notes", "Note", "notes",
            "progress_notes", "progress_note", "case_note",
        ],
    }
}

/// Find a matching column header from a list of candidates
fn find_column<'a>(headers: &'a [String], candidates: &[&str]) -> Option<usize> {
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

/// Parse a CSV file and extract progress notes
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
    
    // Find column indices
    let name_idx = find_column(&headers, &mapping.participant_name);
    let worker_idx = find_column(&headers, &mapping.support_worker);
    let date_idx = find_column(&headers, &mapping.date);
    let time_idx = find_column(&headers, &mapping.time);
    let duration_idx = find_column(&headers, &mapping.duration);
    let note_idx = find_column(&headers, &mapping.note_text);
    
    let mut warnings = Vec::new();
    
    if note_idx.is_none() {
        return Err("Could not find a progress notes column in the CSV file. Please ensure your CSV contains a column with note text.".to_string());
    }
    
    if name_idx.is_none() {
        warnings.push("Participant name column not detected. Notes will use row numbers as identifiers.".to_string());
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
            continue; // Skip rows with no note text
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
        return Err("No progress notes found in the CSV file. Please check that the file contains note data.".to_string());
    }
    
    Ok(CsvParseResult {
        platform,
        notes,
        total_count,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_detect_shiftcare() {
        let headers = vec![
            "Client Name".to_string(),
            "Carer Name".to_string(),
            "Shift Date".to_string(),
            "Shift Time".to_string(),
            "Progress Notes".to_string(),
        ];
        let (platform, _) = detect_platform(&headers);
        assert_eq!(platform, "ShiftCare");
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
}
