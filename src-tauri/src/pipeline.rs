use crate::models::*;
use crate::pii_scrubber;

/// Process a single note through the full pipeline
/// Supports both Standard (2-agent) and Turbo (3-agent) modes
pub fn process_single_note(
    raw_note: &RawNote,
    cartridges: &CartridgeSet,
    mode: &ProcessingMode,
) -> Result<ProcessedNote, String> {
    let start = std::time::Instant::now();

    // Step 1: PII Scrubbing
    let scrubbed = pii_scrubber::scrub_note(
        &raw_note.raw_text,
        &raw_note.participant_name,
        &raw_note.support_worker,
    );

    let participant_code = generate_participant_code(&raw_note.participant_name);
    let worker_code = if raw_note.support_worker.is_empty() {
        "Not provided".to_string()
    } else {
        generate_participant_code(&raw_note.support_worker)
    };

    // Step 2-4: Agent pipeline (mode-dependent)
    let (agent1_output, agent2_output) = match mode {
        ProcessingMode::Standard => run_standard_pipeline(
            &scrubbed,
            raw_note,
            cartridges,
            &participant_code,
            &worker_code,
        )?,
        ProcessingMode::Turbo => run_turbo_pipeline(
            &scrubbed,
            raw_note,
            cartridges,
            &participant_code,
            &worker_code,
        )?,
    };

    // Step 5: Restore PII in the final note
    let final_note = pii_scrubber::restore_pii(
        &agent2_output.audited_note,
        &scrubbed.pii_mappings,
    );

    // Step 6: Determine traffic light
    let traffic_light = determine_traffic_light(
        &agent1_output.red_flags,
        &agent2_output.pillar_scores,
        &agent1_output.missing_data,
    );

    let preview = if final_note.len() > 120 {
        format!("{}...", &final_note[..120])
    } else {
        final_note.clone()
    };

    let elapsed = start.elapsed().as_millis() as u64;

    Ok(ProcessedNote {
        id: raw_note.id.clone(),
        participant_name: raw_note.participant_name.clone(),
        participant_code,
        support_worker: raw_note.support_worker.clone(),
        date: raw_note.date.clone(),
        time: raw_note.time.clone(),
        raw_text: raw_note.raw_text.clone(),
        rewritten_note: final_note,
        traffic_light,
        red_flags: agent1_output.red_flags,
        missing_data: agent1_output.missing_data,
        pillar_scores: agent2_output.pillar_scores,
        is_done: false,
        is_flagged: false,
        preview,
        processing_mode: mode.label().to_string(),
        processing_time_ms: elapsed,
    })
}

/// Standard Mode: 2-agent pipeline
/// Agent 1: Rewrite + Red Flag Scan
/// Agent 2: Audit + Score
fn run_standard_pipeline(
    scrubbed: &ScrubbedNote,
    raw_note: &RawNote,
    _cartridges: &CartridgeSet,
    participant_code: &str,
    worker_code: &str,
) -> Result<(Agent1Output, Agent2Output), String> {
    // Build Agent 1 message (Rewrite + Scan combined)
    let _agent1_msg = build_standard_agent1_message(
        &scrubbed.scrubbed_text,
        raw_note,
        participant_code,
        worker_code,
    );

    // Placeholder: In production, send to llama.cpp
    let agent1_output = run_agent1_placeholder(raw_note, scrubbed)?;

    // Build Agent 2 message (Audit + Score)
    let _agent2_msg = build_agent2_message(
        &scrubbed.scrubbed_text,
        &agent1_output.rewritten_note,
        raw_note,
        &agent1_output.red_flags,
        participant_code,
        worker_code,
    );

    let agent2_output = run_agent2_placeholder(&agent1_output)?;

    Ok((agent1_output, agent2_output))
}

/// Turbo Mode: 3-agent pipeline
/// Agent 1: Rewrite only
/// Agent 2: Red Flag Scan only
/// Agent 3: Audit + Score
fn run_turbo_pipeline(
    scrubbed: &ScrubbedNote,
    raw_note: &RawNote,
    _cartridges: &CartridgeSet,
    participant_code: &str,
    worker_code: &str,
) -> Result<(Agent1Output, Agent2Output), String> {
    // Agent 1: Rewrite only
    let _turbo1_msg = build_turbo_agent1_message(
        &scrubbed.scrubbed_text,
        raw_note,
        participant_code,
        worker_code,
    );

    // Placeholder: get rewritten text
    let rewrite_output = run_agent1_placeholder(raw_note, scrubbed)?;

    // Agent 2: Red Flag Scan only (uses rewritten text)
    let _turbo2_msg = build_turbo_agent2_message(
        &scrubbed.scrubbed_text,
        &rewrite_output.rewritten_note,
    );

    // Agent 3: Audit + Score
    let _turbo3_msg = build_agent2_message(
        &scrubbed.scrubbed_text,
        &rewrite_output.rewritten_note,
        raw_note,
        &rewrite_output.red_flags,
        participant_code,
        worker_code,
    );

    let agent2_output = run_agent2_placeholder(&rewrite_output)?;

    Ok((rewrite_output, agent2_output))
}

// ===== Message Builders =====

fn build_standard_agent1_message(
    scrubbed_text: &str,
    raw_note: &RawNote,
    participant_code: &str,
    worker_code: &str,
) -> String {
    let date_str = if raw_note.date.is_empty() { "Not provided" } else { &raw_note.date };
    let time_str = if raw_note.time.is_empty() { "Not provided" } else { &raw_note.time };
    let dur_str = if raw_note.duration.is_empty() { "Not provided" } else { &raw_note.duration };

    format!(
        "RAW PROGRESS NOTE:\n---\nMETADATA (from case management system — verified facts, use these in the rewrite):\n  Participant Code: {}\n  Support Worker Code: {}\n  Date: {}\n  Time: {}\n  Duration: {}\n\nNote text (as written by the support worker):\n{}\n---\n\nPlease rewrite this note to audit-prepared standard and scan for any red flags. Return your response as valid JSON.",
        participant_code, worker_code, date_str, time_str, dur_str, scrubbed_text
    )
}

fn build_turbo_agent1_message(
    scrubbed_text: &str,
    raw_note: &RawNote,
    participant_code: &str,
    worker_code: &str,
) -> String {
    let date_str = if raw_note.date.is_empty() { "Not provided" } else { &raw_note.date };
    let time_str = if raw_note.time.is_empty() { "Not provided" } else { &raw_note.time };
    let dur_str = if raw_note.duration.is_empty() { "Not provided" } else { &raw_note.duration };

    format!(
        "RAW PROGRESS NOTE:\n---\nMETADATA (from case management system — verified facts, use these in the rewrite):\n  Participant Code: {}\n  Support Worker Code: {}\n  Date: {}\n  Time: {}\n  Duration: {}\n\nNote text (as written by the support worker):\n{}\n---\n\nPlease rewrite this note to audit-prepared standard. Return only the rewritten text as valid JSON with key \"rewritten_note\".",
        participant_code, worker_code, date_str, time_str, dur_str, scrubbed_text
    )
}

fn build_turbo_agent2_message(
    original_scrubbed: &str,
    rewritten: &str,
) -> String {
    format!(
        "ORIGINAL RAW NOTE:\n---\n{}\n---\n\nREWRITTEN NOTE:\n---\n{}\n---\n\nScan both the original and rewritten notes for red flags. Return your response as valid JSON with key \"red_flags\" containing an array of detected flags.",
        original_scrubbed, rewritten
    )
}

fn build_agent2_message(
    original_scrubbed: &str,
    rewritten: &str,
    raw_note: &RawNote,
    red_flags: &[RedFlag],
    participant_code: &str,
    worker_code: &str,
) -> String {
    let date_str = if raw_note.date.is_empty() { "Not provided" } else { &raw_note.date };
    let time_str = if raw_note.time.is_empty() { "Not provided" } else { &raw_note.time };
    let dur_str = if raw_note.duration.is_empty() { "Not provided" } else { &raw_note.duration };

    let flags_text = if red_flags.is_empty() {
        "RED FLAGS DETECTED BY SCANNING AGENT: None".to_string()
    } else {
        let mut s = "RED FLAGS DETECTED BY SCANNING AGENT (authoritative — if any flags listed, traffic light MUST be RED):\n".to_string();
        for rf in red_flags {
            s.push_str(&format!("  - {}: {}\n", rf.category, rf.description));
        }
        s
    };

    format!(
        "ORIGINAL RAW NOTE (as written by the support worker):\n---\n{}\n---\n\nMETADATA FROM CASE MANAGEMENT SYSTEM (verified — NOT hallucinations):\n  Participant Code: {}\n  Support Worker Code: {}\n  Date: {}\n  Time: {}\n  Duration: {}\n\n{}\n\nREWRITTEN NOTE (prepared by documentation assistant):\n---\n{}\n---\n\nPlease audit this rewritten note against the original raw note and metadata. Check for hallucinations, score against the 5-pillar rubric, and assign a traffic light. If red flags were detected above, traffic light MUST be RED. Return your response as valid JSON.",
        original_scrubbed, participant_code, worker_code, date_str, time_str, dur_str, flags_text, rewritten
    )
}

// ===== Traffic Light Logic =====

fn determine_traffic_light(
    red_flags: &[RedFlag],
    pillar_scores: &[PillarScore],
    missing_data: &[MissingDataItem],
) -> TrafficLight {
    if !red_flags.is_empty() {
        return TrafficLight::Red;
    }
    if !missing_data.is_empty() {
        return TrafficLight::Orange;
    }
    for score in pillar_scores {
        if score.score < 2 {
            return TrafficLight::Orange;
        }
    }
    TrafficLight::Green
}

// ===== Placeholders (replaced by LLM in production) =====

fn run_agent1_placeholder(
    raw_note: &RawNote,
    scrubbed: &ScrubbedNote,
) -> Result<Agent1Output, String> {
    let mut missing_data = Vec::new();
    let mut bracket_flags = Vec::new();

    if raw_note.date.is_empty() {
        let flag = "[DATE AND TIME REQUIRED — confirm the date and time of this session]".to_string();
        missing_data.push(MissingDataItem {
            field_name: "Date and Time".to_string(),
            reason: "This note does not include a date or time.".to_string(),
            placeholder: flag.clone(),
            submitted_value: None,
        });
        bracket_flags.push(flag);
    }

    let text_lower = raw_note.raw_text.to_lowercase();
    if !text_lower.contains("goal") && !text_lower.contains("plan") && !text_lower.contains("objective") {
        let flag = "[GOAL LINK REQUIRED — specify the NDIS plan goal this activity supports]".to_string();
        missing_data.push(MissingDataItem {
            field_name: "Participant Goal".to_string(),
            reason: "This note does not reference a goal from the participant's NDIS plan.".to_string(),
            placeholder: flag.clone(),
            submitted_value: None,
        });
        bracket_flags.push(flag);
    }

    let rewritten = format!(
        "On {}, support worker {} provided support to participant {}. {}",
        if raw_note.date.is_empty() { "[DATE AND TIME REQUIRED]" } else { &raw_note.date },
        if raw_note.support_worker.is_empty() { "[STAFF CODE REQUIRED]" } else { "[Support Worker]" },
        "[Participant]",
        &scrubbed.scrubbed_text,
    );

    Ok(Agent1Output {
        rewritten_note: rewritten,
        red_flags: Vec::new(),
        missing_data,
        bracket_flags,
    })
}

fn run_agent2_placeholder(
    agent1_output: &Agent1Output,
) -> Result<Agent2Output, String> {
    let has_missing = !agent1_output.missing_data.is_empty();
    let has_red_flags = !agent1_output.red_flags.is_empty();

    let traffic_light = if has_red_flags {
        TrafficLight::Red
    } else if has_missing {
        TrafficLight::Orange
    } else {
        TrafficLight::Green
    };

    Ok(Agent2Output {
        audited_note: agent1_output.rewritten_note.clone(),
        pillar_scores: vec![
            PillarScore { pillar_name: "Goal Linkage".to_string(), pillar_id: 1, score: if has_missing { 1 } else { 2 }, met: !has_missing, feedback: "Assessment pending LLM processing.".to_string() },
            PillarScore { pillar_name: "Participant Voice".to_string(), pillar_id: 2, score: if has_missing { 1 } else { 2 }, met: !has_missing, feedback: "Assessment pending LLM processing.".to_string() },
            PillarScore { pillar_name: "Measurable Outcomes".to_string(), pillar_id: 3, score: if has_missing { 1 } else { 2 }, met: !has_missing, feedback: "Assessment pending LLM processing.".to_string() },
            PillarScore { pillar_name: "Support Delivered".to_string(), pillar_id: 4, score: 2, met: true, feedback: "Assessment pending LLM processing.".to_string() },
            PillarScore { pillar_name: "Risk & Safety".to_string(), pillar_id: 5, score: 2, met: true, feedback: "Assessment pending LLM processing.".to_string() },
        ],
        traffic_light,
        hallucination_check: true,
        audit_notes: "Audit assessment pending full LLM processing.".to_string(),
    })
}

// ===== Utility Functions =====

pub fn generate_participant_code(name: &str) -> String {
    let parts: Vec<&str> = name.split_whitespace().collect();
    let initials = match parts.len() {
        0 => "XX".to_string(),
        1 => {
            let c = parts[0].chars().next().unwrap_or('X');
            format!("{}{}", c, c).to_uppercase()
        }
        _ => format!(
            "{}{}",
            parts[0].chars().next().unwrap_or('X'),
            parts.last().unwrap().chars().next().unwrap_or('X'),
        )
        .to_uppercase(),
    };
    format!("{}-{:03}", initials, rand::random::<u16>() % 100)
}

pub fn sort_notes_by_status(notes: &mut Vec<ProcessedNote>) {
    notes.sort_by(|a, b| a.traffic_light.sort_order().cmp(&b.traffic_light.sort_order()));
}

pub fn generate_batch_summary(notes: &[ProcessedNote], processing_time: &str) -> BatchSummary {
    let green_count = notes.iter().filter(|n| n.traffic_light == TrafficLight::Green).count();
    let orange_count = notes.iter().filter(|n| n.traffic_light == TrafficLight::Orange).count();
    let red_count = notes.iter().filter(|n| n.traffic_light == TrafficLight::Red).count();

    let unresolved: Vec<UnresolvedItem> = notes
        .iter()
        .filter(|n| n.traffic_light == TrafficLight::Red)
        .map(|n| {
            let desc = n.red_flags.iter().map(|rf| rf.description.clone()).collect::<Vec<_>>().join(". ");
            UnresolvedItem {
                participant_name: n.participant_name.clone(),
                participant_code: n.participant_code.clone(),
                description: desc,
                required_forms: Vec::new(),
            }
        })
        .collect();

    BatchSummary {
        total_notes: notes.len(),
        green_count,
        orange_count,
        red_count,
        processing_time: processing_time.to_string(),
        unresolved_red_flags: unresolved,
    }
}

pub fn export_notes_to_csv(notes: &[ProcessedNote]) -> Result<String, String> {
    let mut wtr = csv::Writer::from_writer(Vec::new());

    wtr.write_record(&[
        "Participant", "Participant Code", "Support Worker", "Date", "Time",
        "Status", "Rewritten Note", "Red Flags", "Missing Data", "Original Note",
    ])
    .map_err(|e| format!("CSV write error: {}", e))?;

    for note in notes {
        let status = match &note.traffic_light {
            TrafficLight::Red => "Needs Attention",
            TrafficLight::Orange => "Review Required",
            TrafficLight::Green => "Ready to Approve",
        };

        let red_flags_text = note.red_flags.iter()
            .map(|rf| format!("{}: {}", rf.category, rf.description))
            .collect::<Vec<_>>().join("; ");

        let missing_text = note.missing_data.iter()
            .map(|md| md.field_name.clone())
            .collect::<Vec<_>>().join("; ");

        wtr.write_record(&[
            &note.participant_name, &note.participant_code, &note.support_worker,
            &note.date, &note.time, status, &note.rewritten_note,
            &red_flags_text, &missing_text, &note.raw_text,
        ])
        .map_err(|e| format!("CSV write error: {}", e))?;
    }

    let data = wtr.into_inner().map_err(|e| format!("CSV flush error: {}", e))?;
    String::from_utf8(data).map_err(|e| format!("UTF-8 error: {}", e))
}
