use crate::models::{PiiMapping, ScrubbedNote};
use aho_corasick::AhoCorasick;
use regex::Regex;

/// PII Scrubber — Nanoclaw implementation
/// Strips PII before LLM processing and restores it after.
///
/// Categories:
/// - [Participant] — primary subject from CSV
/// - [Support Worker] — staff from CSV
/// - [Associate] — kinship/family (Aunty, Uncle, Nan, Pop, Mum, Dad, etc.)
/// - [Medical Professional] — Dr, Nurse, OT, Physio, etc.
/// - [Facility] — Hospital, Clinic, Medical Centre, etc.
/// - [Location] — addresses, Victorian suburbs
/// - [Phone] — Australian phone numbers
/// - [Email] — email addresses

/// Victorian suburbs and major regional towns for dictionary lookup
const VIC_SUBURBS: &[&str] = &[
    "Abbotsford", "Albert Park", "Alphington", "Armadale", "Ascot Vale",
    "Balaclava", "Balwyn", "Bentleigh", "Box Hill", "Brighton",
    "Brunswick", "Bundoora", "Camberwell", "Carlton", "Caulfield",
    "Cheltenham", "Clayton", "Clifton Hill", "Coburg", "Collingwood",
    "Cranbourne", "Dandenong", "Doncaster", "Elsternwick", "Elwood",
    "Essendon", "Fairfield", "Fitzroy", "Flemington", "Footscray",
    "Frankston", "Geelong", "Glen Waverley", "Glenroy", "Hawthorn",
    "Heidelberg", "Highett", "Ivanhoe", "Kensington", "Kew",
    "Malvern", "Maribyrnong", "Melbourne", "Mentone", "Moonee Ponds",
    "Moorabbin", "Mordialloc", "Mornington", "Mount Waverley", "Northcote",
    "Oakleigh", "Pascoe Vale", "Port Melbourne", "Prahran", "Preston",
    "Reservoir", "Richmond", "Ringwood", "Sandringham", "South Yarra",
    "Southbank", "St Kilda", "Sunshine", "Toorak", "Werribee",
    "Williamstown", "Windsor", "Yarraville",
    // Regional
    "Ballarat", "Bendigo", "Shepparton", "Warrnambool", "Mildura",
    "Wangaratta", "Wodonga", "Traralgon", "Morwell", "Sale",
    "Bairnsdale", "Swan Hill", "Echuca", "Horsham", "Hamilton",
    "Colac", "Bacchus Marsh", "Melton", "Sunbury", "Pakenham",
    "Berwick", "Narre Warren", "Hallam", "Endeavour Hills", "Rowville",
    "Boronia", "Croydon", "Lilydale", "Belgrave", "Ferntree Gully",
    "Bayswater", "Wantirna", "Templestowe", "Eltham", "Diamond Creek",
    "Greensborough", "Bundoora", "Mill Park", "South Morang", "Epping",
    "Craigieburn", "Broadmeadows", "Tullamarine", "Keilor", "Altona",
    "Laverton", "Hoppers Crossing", "Point Cook", "Tarneit", "Wyndham Vale",
];

/// NDIS/medical terms that should NOT be redacted even if capitalised
const SAFE_WORDS: &[&str] = &[
    "The", "This", "That", "These", "Those", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March",
    "April", "May", "June", "July", "August", "September", "October", "November",
    "December", "Goal", "Plan", "Support", "Community", "Daily", "Living",
    "Behaviour", "Behavior", "Safety", "Progress", "Note", "Session", "Morning",
    "Afternoon", "Evening", "Night", "Participant", "Worker", "Staff", "Review",
    "Incident", "Report", "Form", "Practice", "Medication", "Assessment",
    "Standard", "Performance", "Not", "Available", "Required", "Green", "Orange",
    "Red", "Needs", "Attention", "Batch", "Complete", "Processing", "Import",
    "NDIS", "NDIA", "LAC", "SIL", "SDA", "STA", "MTA", "ILO", "SRS",
    "PRN", "OT", "GP", "ED", "ICU", "BSP", "PBS", "AAT", "VCAT",
    "Panadol", "Risperidone", "Valium", "Diazepam", "Seroquel", "Quetiapine",
    "Olanzapine", "Lithium", "Epilim", "Tegretol", "Prozac", "Zoloft",
    "Lexapro", "Endep", "Ritalin", "Concerta", "Melatonin", "Stilnox",
    "Lyrica", "Neurontin", "Lamictal", "Keppra", "Topamax",
    "Aboriginal", "Torres", "Strait", "Islander", "Indigenous", "First", "Nations",
    "Australian", "Victoria", "Victorian", "Australia",
    "Domestic", "Assistance", "Capacity", "Building", "Coordination",
    "Supported", "Independent", "Respite", "Transport", "Therapy",
    "Occupational", "Speech", "Physiotherapy", "Psychology", "Psychiatry",
    "Behaviour", "Positive", "Restrictive", "Intervention",
    "He", "She", "They", "His", "Her", "Their", "Him", "Them",
    "Was", "Were", "Has", "Had", "Did", "Does", "Will", "Would",
    "Could", "Should", "Can", "May", "Might", "Must", "Shall",
    "Been", "Being", "Have", "Having", "Done", "Doing",
    "After", "Before", "During", "While", "When", "Where", "How",
    "What", "Which", "Who", "Whom", "Whose", "Why",
    "Also", "Very", "Much", "More", "Most", "Some", "Any", "All",
    "Each", "Every", "Both", "Either", "Neither", "Other", "Another",
    "Today", "Tomorrow", "Yesterday", "Tonight", "Now", "Then",
];

/// Kinship titles that indicate an associate
const KINSHIP_TITLES: &[&str] = &[
    "Aunty", "Auntie", "Aunt", "Uncle", "Nan", "Nanna", "Nanny",
    "Pop", "Poppy", "Grandma", "Grandpa", "Grandmother", "Grandfather",
    "Sis", "Bro", "Cuz", "Cousin", "Mum", "Mom", "Dad",
    "Brother", "Sister", "Niece", "Nephew", "Son", "Daughter",
    "Mother", "Father", "Wife", "Husband", "Partner", "Fiancee", "Fiance",
    "Stepmum", "Stepdad", "Stepmother", "Stepfather",
];

/// Medical professional titles
const MEDICAL_TITLES: &[&str] = &[
    "Dr", "Dr.", "Doctor", "Prof", "Prof.", "Professor",
    "Nurse", "Physio", "Physiotherapist", "OT", "Psychologist",
    "Psychiatrist", "Therapist", "Counsellor", "Counselor",
    "Dietitian", "Dietician", "Podiatrist", "Optometrist",
    "Audiologist", "Dentist", "Pharmacist", "Paramedic",
    "Speech Pathologist", "Behaviour Practitioner",
];

/// Facility suffixes
const FACILITY_SUFFIXES: &[&str] = &[
    "Hospital", "Clinic", "Medical Centre", "Medical Center",
    "Health Centre", "Health Center", "Surgery", "Practice",
    "Community Health", "Day Program", "Respite Centre",
    "Residential Facility", "Group Home", "SIL House",
    "Supported Accommodation", "Aged Care", "Nursing Home",
    "Emergency Department", "Urgent Care", "Rehab Centre",
    "Rehabilitation Centre", "Rehabilitation Center",
];

pub struct PiiScrubber {
    participant_names: Vec<String>,
    worker_names: Vec<String>,
    safe_words_ac: AhoCorasick,
    suburb_ac: AhoCorasick,
}

impl PiiScrubber {
    pub fn new() -> Self {
        let safe_words_ac = AhoCorasick::builder()
            .ascii_case_insensitive(true)
            .build(SAFE_WORDS)
            .unwrap();
        let suburb_ac = AhoCorasick::builder()
            .ascii_case_insensitive(false)
            .build(VIC_SUBURBS)
            .unwrap();

        Self {
            participant_names: Vec::new(),
            worker_names: Vec::new(),
            safe_words_ac,
            suburb_ac,
        }
    }

    pub fn with_context(mut self, participant_name: &str, worker_name: &str) -> Self {
        if !participant_name.is_empty() {
            self.participant_names.push(participant_name.to_string());
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

    pub fn scrub(&self, text: &str) -> ScrubbedNote {
        let mut scrubbed = text.to_string();
        let mut mappings: Vec<PiiMapping> = Vec::new();

        // 1. Scrub known participant names (longest first)
        let mut sorted_participant = self.participant_names.clone();
        sorted_participant.sort_by(|a, b| b.len().cmp(&a.len()));
        for name in &sorted_participant {
            if name.len() > 2 {
                let re = Regex::new(&format!(r"(?i)\b{}\b", regex::escape(name))).unwrap();
                if re.is_match(&scrubbed) {
                    let tag = "[Participant]".to_string();
                    mappings.push(PiiMapping {
                        original: name.clone(),
                        tag: tag.clone(),
                        category: "participant_name".to_string(),
                    });
                    scrubbed = re.replace_all(&scrubbed, tag.as_str()).to_string();
                }
            }
        }

        // 2. Scrub known worker names
        let mut sorted_worker = self.worker_names.clone();
        sorted_worker.sort_by(|a, b| b.len().cmp(&a.len()));
        for name in &sorted_worker {
            if name.len() > 2 {
                let re = Regex::new(&format!(r"(?i)\b{}\b", regex::escape(name))).unwrap();
                if re.is_match(&scrubbed) {
                    let tag = "[Support Worker]".to_string();
                    mappings.push(PiiMapping {
                        original: name.clone(),
                        tag: tag.clone(),
                        category: "worker_name".to_string(),
                    });
                    scrubbed = re.replace_all(&scrubbed, tag.as_str()).to_string();
                }
            }
        }

        // 3. Scrub medical professional titles + names -> [Medical Professional]
        for title in MEDICAL_TITLES {
            let pattern = format!(
                r"(?i)\b{}\s*\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
                regex::escape(title)
            );
            if let Ok(re) = Regex::new(&pattern) {
                let new_scrubbed = re.replace_all(&scrubbed, |caps: &regex::Captures| {
                    let full = caps.get(0).unwrap().as_str();
                    if !full.contains("[") {
                        mappings.push(PiiMapping {
                            original: full.to_string(),
                            tag: "[Medical Professional]".to_string(),
                            category: "medical_professional".to_string(),
                        });
                        "[Medical Professional]".to_string()
                    } else {
                        full.to_string()
                    }
                });
                scrubbed = new_scrubbed.to_string();
            }
        }

        // 4. Scrub facility names -> [Facility]
        for suffix in FACILITY_SUFFIXES {
            // Match "the X Y Hospital" or "X Hospital" patterns
            let pattern = format!(
                r"(?i)\b(?:the\s+)?(?:[A-Z][a-z]+\s+){{1,4}}{}\b",
                regex::escape(suffix)
            );
            if let Ok(re) = Regex::new(&pattern) {
                let new_scrubbed = re.replace_all(&scrubbed, |caps: &regex::Captures| {
                    let full = caps.get(0).unwrap().as_str();
                    if !full.contains("[") {
                        mappings.push(PiiMapping {
                            original: full.to_string(),
                            tag: "[Facility]".to_string(),
                            category: "facility".to_string(),
                        });
                        "[Facility]".to_string()
                    } else {
                        full.to_string()
                    }
                });
                scrubbed = new_scrubbed.to_string();
            }
        }

        // 5. Scrub kinship titles + names -> [Associate]
        // Contextual rule: "Aunty Liz" -> [Associate], but "his mum" retains title
        for title in KINSHIP_TITLES {
            // Title + Name pattern
            let pattern = format!(
                r"(?i)\b{}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b",
                regex::escape(title)
            );
            if let Ok(re) = Regex::new(&pattern) {
                let new_scrubbed = re.replace_all(&scrubbed, |caps: &regex::Captures| {
                    let full = caps.get(0).unwrap().as_str();
                    if !full.contains("[") {
                        mappings.push(PiiMapping {
                            original: full.to_string(),
                            tag: "[Associate]".to_string(),
                            category: "associate_name".to_string(),
                        });
                        "[Associate]".to_string()
                    } else {
                        full.to_string()
                    }
                });
                scrubbed = new_scrubbed.to_string();
            }
        }

        // 6. Scrub generic title + name (Mr, Mrs, Ms, Miss, Mx)
        let generic_title_re = Regex::new(
            r"(?i)\b(Mr|Mrs|Ms|Miss|Mx)\s*\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
        ).unwrap();
        let new_scrubbed = generic_title_re.replace_all(&scrubbed, |caps: &regex::Captures| {
            let full = caps.get(0).unwrap().as_str();
            if !full.contains("[") {
                mappings.push(PiiMapping {
                    original: full.to_string(),
                    tag: "[Associate]".to_string(),
                    category: "associate_name".to_string(),
                });
                "[Associate]".to_string()
            } else {
                full.to_string()
            }
        });
        scrubbed = new_scrubbed.to_string();

        // 7. Scrub Australian phone numbers
        let phone_patterns = [
            r"\b(?:\+?61\s?)?0?4\d{2}\s?\d{3}\s?\d{3}\b",  // Mobile
            r"\b(?:\+?61\s?)?0[2-9]\s?\d{4}\s?\d{4}\b",      // Landline
            r"\b(?:13|1300|1800)\s?\d{2,3}\s?\d{3}\b",        // Service numbers
        ];
        for pattern in &phone_patterns {
            if let Ok(re) = Regex::new(pattern) {
                let new_scrubbed = re.replace_all(&scrubbed, |caps: &regex::Captures| {
                    let full = caps.get(0).unwrap().as_str();
                    if !full.contains("[") {
                        mappings.push(PiiMapping {
                            original: full.to_string(),
                            tag: "[Phone]".to_string(),
                            category: "phone".to_string(),
                        });
                        "[Phone]".to_string()
                    } else {
                        full.to_string()
                    }
                });
                scrubbed = new_scrubbed.to_string();
            }
        }

        // 8. Scrub email addresses
        let email_re = Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b").unwrap();
        let new_scrubbed = email_re.replace_all(&scrubbed, |caps: &regex::Captures| {
            let full = caps.get(0).unwrap().as_str();
            mappings.push(PiiMapping {
                original: full.to_string(),
                tag: "[Email]".to_string(),
                category: "email".to_string(),
            });
            "[Email]".to_string()
        });
        scrubbed = new_scrubbed.to_string();

        // 9. Scrub NDIS numbers
        let ndis_re = Regex::new(r"(?i)\bNDIS\s*(?:number|no|#|num)?[:\s]*(\d{9,10})\b").unwrap();
        let new_scrubbed = ndis_re.replace_all(&scrubbed, |caps: &regex::Captures| {
            let full = caps.get(0).unwrap().as_str();
            mappings.push(PiiMapping {
                original: full.to_string(),
                tag: "[NDIS Number]".to_string(),
                category: "ndis_number".to_string(),
            });
            "[NDIS Number]".to_string()
        });
        scrubbed = new_scrubbed.to_string();

        // 10. Scrub street addresses
        let address_re = Regex::new(
            r"\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Place|Pl|Crescent|Cres|Boulevard|Blvd|Lane|Ln|Way|Terrace|Tce|Circuit|Cct|Close|Cl|Parade|Pde)\b"
        ).unwrap();
        let new_scrubbed = address_re.replace_all(&scrubbed, |caps: &regex::Captures| {
            let full = caps.get(0).unwrap().as_str();
            if !full.contains("[") {
                mappings.push(PiiMapping {
                    original: full.to_string(),
                    tag: "[Location]".to_string(),
                    category: "address".to_string(),
                });
                "[Location]".to_string()
            } else {
                full.to_string()
            }
        });
        scrubbed = new_scrubbed.to_string();

        // 11. Scrub Victorian suburbs via Aho-Corasick dictionary
        // Only match whole words that aren't already scrubbed
        for mat in self.suburb_ac.find_iter(&scrubbed.clone()) {
            let suburb = &scrubbed[mat.start()..mat.end()];
            // Check it's a word boundary match
            let before_ok = mat.start() == 0
                || !scrubbed.as_bytes()[mat.start() - 1].is_ascii_alphabetic();
            let after_ok = mat.end() >= scrubbed.len()
                || !scrubbed.as_bytes()[mat.end()].is_ascii_alphabetic();

            if before_ok && after_ok && !suburb.contains("[") {
                mappings.push(PiiMapping {
                    original: suburb.to_string(),
                    tag: "[Location]".to_string(),
                    category: "suburb".to_string(),
                });
            }
        }
        // Apply suburb replacements (do in reverse order to preserve indices)
        let suburb_mappings: Vec<_> = mappings
            .iter()
            .filter(|m| m.category == "suburb")
            .cloned()
            .collect();
        for m in &suburb_mappings {
            scrubbed = scrubbed.replace(&m.original, "[Location]");
        }

        ScrubbedNote {
            scrubbed_text: scrubbed,
            pii_mappings: mappings,
        }
    }
}

/// Restore PII back into processed text
pub fn restore_pii(text: &str, mappings: &[PiiMapping]) -> String {
    let mut restored = text.to_string();

    // Sort by tag length descending to handle longer tags first
    let mut sorted_mappings = mappings.to_vec();
    sorted_mappings.sort_by(|a, b| b.tag.len().cmp(&a.tag.len()));

    // Build a map of tag -> original (use first occurrence for each tag)
    let mut tag_map = std::collections::HashMap::new();
    for mapping in &sorted_mappings {
        tag_map
            .entry(mapping.tag.clone())
            .or_insert_with(|| mapping.original.clone());
    }

    for (tag, original) in &tag_map {
        restored = restored.replace(tag.as_str(), original.as_str());
    }

    restored
}

/// Convenience function for scrubbing a note with context
pub fn scrub_note(text: &str, participant_name: &str, worker_name: &str) -> ScrubbedNote {
    let scrubber = PiiScrubber::new().with_context(participant_name, worker_name);
    scrubber.scrub(text)
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
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Aunty Mary came to visit the participant.");
        assert!(result.scrubbed_text.contains("[Associate]"));
        assert!(!result.scrubbed_text.contains("Aunty Mary"));
    }

    #[test]
    fn test_scrub_medical_professional() {
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Appointment with Dr. Smith at the clinic.");
        assert!(result.scrubbed_text.contains("[Medical Professional]"));
        assert!(!result.scrubbed_text.contains("Dr. Smith"));
    }

    #[test]
    fn test_scrub_facility() {
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Took client to the Royal Melbourne Hospital for a checkup.");
        assert!(result.scrubbed_text.contains("[Facility]"));
        assert!(!result.scrubbed_text.contains("Royal Melbourne Hospital"));
    }

    #[test]
    fn test_scrub_suburb() {
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Went for a walk in Fitzroy.");
        assert!(result.scrubbed_text.contains("[Location]"));
        assert!(!result.scrubbed_text.contains("Fitzroy"));
    }

    #[test]
    fn test_scrub_phone() {
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Called supervisor on 0412 345 678.");
        assert!(result.scrubbed_text.contains("[Phone]"));
        assert!(!result.scrubbed_text.contains("0412"));
    }

    #[test]
    fn test_medication_preserved() {
        let scrubber = PiiScrubber::new();
        let result = scrubber.scrub("Administered Panadol 500mg as per PRN protocol.");
        assert!(result.scrubbed_text.contains("Panadol"));
    }

    #[test]
    fn test_restore_pii() {
        let mappings = vec![PiiMapping {
            original: "Margaret Kennedy".to_string(),
            tag: "[Participant]".to_string(),
            category: "participant_name".to_string(),
        }];
        let restored =
            restore_pii("[Participant] was assisted with her morning routine.", &mappings);
        assert_eq!(
            restored,
            "Margaret Kennedy was assisted with her morning routine."
        );
    }
}
