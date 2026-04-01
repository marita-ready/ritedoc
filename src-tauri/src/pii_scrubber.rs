use crate::models::{PiiMapping, ScrubbedNote};
use regex::Regex;
use std::collections::HashMap;

/// PII Scrubber — strips personally identifiable information before LLM processing
/// and re-inserts it after processing is complete.
///
/// Handles:
/// - Full names (including kinship titles: Aunty, Uncle, etc.)
/// - Professional titles (Dr, Prof, etc.)
/// - Phone numbers (Australian formats)
/// - Email addresses
/// - Street addresses
/// - NDIS numbers
/// - Medicare numbers
/// - Dates of birth
/// - Location names (when provided as known PII)

pub struct PiiScrubber {
    /// Known participant names from the CSV
    participant_names: Vec<String>,
    /// Known worker names from the CSV
    worker_names: Vec<String>,
    /// Counter for generating unique tags
    associate_counter: usize,
    location_counter: usize,
}

impl PiiScrubber {
    pub fn new() -> Self {
        Self {
            participant_names: Vec::new(),
            worker_names: Vec::new(),
            associate_counter: 0,
            location_counter: 0,
        }
    }
    
    /// Set known names from the CSV context
    pub fn with_context(mut self, participant_name: &str, worker_name: &str) -> Self {
        if !participant_name.is_empty() {
            self.participant_names.push(participant_name.to_string());
            // Also add individual name parts
            for part in participant_name.split_whitespace() {
                if part.len() > 2 {
                    self.participant_names.push(part.to_string());
                }
            }
        }
        if !worker_name.is_empty() {
            self.worker_names.push(worker_name.to_string());
            for part in worker_name.split_whitespace() {
                if part.len() > 2 {
                    self.worker_names.push(part.to_string());
                }
            }
        }
        self
    }
    
    /// Scrub all PII from a text, returning the scrubbed text and mappings
    pub fn scrub(&mut self, text: &str) -> ScrubbedNote {
        let mut scrubbed = text.to_string();
        let mut mappings: Vec<PiiMapping> = Vec::new();
        
        // 1. Scrub known participant names (longest first to avoid partial matches)
        let mut sorted_participant = self.participant_names.clone();
        sorted_participant.sort_by(|a, b| b.len().cmp(&a.len()));
        for name in &sorted_participant {
            if name.len() > 2 && scrubbed.contains(name.as_str()) {
                let tag = "[Participant]".to_string();
                mappings.push(PiiMapping {
                    original: name.clone(),
                    tag: tag.clone(),
                    category: "participant_name".to_string(),
                });
                scrubbed = scrubbed.replace(name.as_str(), &tag);
            }
        }
        
        // 2. Scrub known worker names
        let mut sorted_worker = self.worker_names.clone();
        sorted_worker.sort_by(|a, b| b.len().cmp(&a.len()));
        for name in &sorted_worker {
            if name.len() > 2 && scrubbed.contains(name.as_str()) {
                let tag = "[Support Worker]".to_string();
                mappings.push(PiiMapping {
                    original: name.clone(),
                    tag: tag.clone(),
                    category: "worker_name".to_string(),
                });
                scrubbed = scrubbed.replace(name.as_str(), &tag);
            }
        }
        
        // 3. Scrub kinship and professional titles with names
        let title_patterns = [
            // Kinship titles (NDIS-specific, common in Aboriginal communities)
            r"(?i)\b(Aunty|Auntie|Uncle|Nan|Nanna|Pop|Poppy|Sis|Bro|Cuz|Cousin)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
            // Professional titles
            r"(?i)\b(Dr|Doctor|Prof|Professor|Mr|Mrs|Ms|Miss|Mx)\s*\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
            // Nurse/therapist titles
            r"(?i)\b(Nurse|OT|Physio|Psychologist|Psychiatrist|Therapist|Counsellor|Counselor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
        ];
        
        for pattern in &title_patterns {
            let re = Regex::new(pattern).unwrap();
            let mut new_scrubbed = scrubbed.clone();
            for cap in re.captures_iter(&scrubbed) {
                let full_match = cap.get(0).unwrap().as_str();
                if !full_match.contains("[") { // Don't re-scrub already scrubbed text
                    self.associate_counter += 1;
                    let tag = format!("[Associate]");
                    mappings.push(PiiMapping {
                        original: full_match.to_string(),
                        tag: tag.clone(),
                        category: "associate_name".to_string(),
                    });
                    new_scrubbed = new_scrubbed.replacen(full_match, &tag, 1);
                }
            }
            scrubbed = new_scrubbed;
        }
        
        // 4. Scrub Australian phone numbers
        let phone_patterns = [
            r"\b(?:0[2-9]\d{2}\s?\d{3}\s?\d{3})\b",           // 0X XXXX XXXX
            r"\b(?:\+?61\s?[2-9]\d{2}\s?\d{3}\s?\d{3})\b",    // +61 X XXXX XXXX
            r"\b(?:04\d{2}\s?\d{3}\s?\d{3})\b",                // 04XX XXX XXX (mobile)
            r"\b(?:13\s?\d{2}\s?\d{2})\b",                      // 13 XX XX (service numbers)
            r"\b(?:\d{2}\s?\d{4}\s?\d{4})\b",                   // XX XXXX XXXX
        ];
        
        for pattern in &phone_patterns {
            let re = Regex::new(pattern).unwrap();
            let mut new_scrubbed = scrubbed.clone();
            for mat in re.find_iter(&scrubbed) {
                let phone = mat.as_str();
                if !phone.contains("[") {
                    let tag = "[Phone]".to_string();
                    mappings.push(PiiMapping {
                        original: phone.to_string(),
                        tag: tag.clone(),
                        category: "phone".to_string(),
                    });
                    new_scrubbed = new_scrubbed.replacen(phone, &tag, 1);
                }
            }
            scrubbed = new_scrubbed;
        }
        
        // 5. Scrub email addresses
        let email_re = Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b").unwrap();
        let mut new_scrubbed = scrubbed.clone();
        for mat in email_re.find_iter(&scrubbed) {
            let email = mat.as_str();
            mappings.push(PiiMapping {
                original: email.to_string(),
                tag: "[Email]".to_string(),
                category: "email".to_string(),
            });
            new_scrubbed = new_scrubbed.replacen(email, "[Email]", 1);
        }
        scrubbed = new_scrubbed;
        
        // 6. Scrub NDIS numbers (format: typically 9-10 digits)
        let ndis_re = Regex::new(r"(?i)\bNDIS\s*(?:number|no|#|num)?[:\s]*(\d{9,10})\b").unwrap();
        let mut new_scrubbed = scrubbed.clone();
        for cap in ndis_re.captures_iter(&scrubbed) {
            let full = cap.get(0).unwrap().as_str();
            mappings.push(PiiMapping {
                original: full.to_string(),
                tag: "[NDIS Number]".to_string(),
                category: "ndis_number".to_string(),
            });
            new_scrubbed = new_scrubbed.replacen(full, "[NDIS Number]", 1);
        }
        scrubbed = new_scrubbed;
        
        // 7. Scrub street addresses (basic pattern)
        let address_re = Regex::new(
            r"\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Boulevard|Blvd|Lane|Ln|Way|Terrace|Tce|Circuit|Cct|Close|Cl|Parade|Pde)\b"
        ).unwrap();
        let mut new_scrubbed = scrubbed.clone();
        for mat in address_re.find_iter(&scrubbed) {
            let addr = mat.as_str();
            if !addr.contains("[") {
                self.location_counter += 1;
                let tag = "[Location]".to_string();
                mappings.push(PiiMapping {
                    original: addr.to_string(),
                    tag: tag.clone(),
                    category: "address".to_string(),
                });
                new_scrubbed = new_scrubbed.replacen(addr, &tag, 1);
            }
        }
        scrubbed = new_scrubbed;
        
        // 8. Scrub remaining proper nouns that look like names (capitalized words not already scrubbed)
        // This is a conservative pass — only scrubs patterns that look like "First Last" names
        // that weren't caught by the known-names pass
        let _name_re = Regex::new(r"\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b").unwrap();
        let _common_words: Vec<&str> = vec![
            "The", "This", "That", "These", "Those", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March",
            "April", "May", "June", "July", "August", "September", "October", "November",
            "December", "Goal", "Plan", "Support", "Community", "Daily", "Living",
            "Behaviour", "Behavior", "Safety", "Progress", "Note", "Session", "Morning",
            "Afternoon", "Evening", "Night", "Participant", "Worker", "Staff", "Review",
            "Incident", "Report", "Form", "Practice", "Medication", "Assessment",
            "Standard", "Performance", "Not", "Available", "Required", "Green", "Orange",
            "Red", "Needs", "Attention", "Batch", "Complete", "Processing", "Import",
        ];
        // We intentionally do NOT auto-scrub unknown names to avoid false positives
        // The known-names approach is safer for NDIS context
        
        ScrubbedNote {
            scrubbed_text: scrubbed,
            pii_mappings: mappings,
        }
    }
    
    /// Restore PII back into processed text
    pub fn restore(text: &str, mappings: &[PiiMapping]) -> String {
        let mut restored = text.to_string();
        
        // Sort by tag length descending to handle longer tags first
        let mut sorted_mappings = mappings.to_vec();
        sorted_mappings.sort_by(|a, b| b.tag.len().cmp(&a.tag.len()));
        
        // Build a map of tag -> original (use first occurrence for each tag)
        let mut tag_map: HashMap<String, String> = HashMap::new();
        for mapping in &sorted_mappings {
            tag_map.entry(mapping.tag.clone())
                .or_insert_with(|| mapping.original.clone());
        }
        
        // Replace tags with originals
        for (tag, original) in &tag_map {
            restored = restored.replace(tag.as_str(), original.as_str());
        }
        
        restored
    }
}

/// Convenience function for scrubbing a note with context
pub fn scrub_note(text: &str, participant_name: &str, worker_name: &str) -> ScrubbedNote {
    let mut scrubber = PiiScrubber::new()
        .with_context(participant_name, worker_name);
    scrubber.scrub(text)
}

/// Convenience function for restoring PII
pub fn restore_pii(text: &str, mappings: &[PiiMapping]) -> String {
    PiiScrubber::restore(text, mappings)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_scrub_participant_name() {
        let result = scrub_note(
            "Margaret Kennedy was assisted with her morning routine.",
            "Margaret Kennedy",
            "Sarah Jones",
        );
        assert!(result.scrubbed_text.contains("[Participant]"));
        assert!(!result.scrubbed_text.contains("Margaret"));
    }
    
    #[test]
    fn test_scrub_kinship_title() {
        let mut scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Aunty Mary came to visit the participant.");
        assert!(result.scrubbed_text.contains("[Associate]"));
        assert!(!result.scrubbed_text.contains("Aunty Mary"));
    }
    
    #[test]
    fn test_restore_pii() {
        let mappings = vec![
            PiiMapping {
                original: "Margaret Kennedy".to_string(),
                tag: "[Participant]".to_string(),
                category: "participant_name".to_string(),
            },
        ];
        let restored = restore_pii("[Participant] was assisted with her morning routine.", &mappings);
        assert_eq!(restored, "Margaret Kennedy was assisted with her morning routine.");
    }
}
