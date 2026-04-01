#!/usr/bin/env python3
"""
RiteDoc — AI Agent Prompt Testing Suite
Tests Agent 1 (Rewrite + Scan) and Agent 2 (Audit + Score) prompts
using the OpenAI API with gpt-4.1-mini to simulate local LLM behaviour.

Creates 5 realistic NDIS progress notes and runs them through both agents,
verifying correct output for rewrites, red flags, missing data, and traffic lights.
"""

import json
import os
import re
import sys
from datetime import datetime

from openai import OpenAI

client = OpenAI()
MODEL = "gpt-4.1-mini"

# ===== AGENT SYSTEM PROMPTS =====

AGENT1_SYSTEM_PROMPT = """You are an NDIS documentation specialist. Your role is to take raw progress notes written by support workers and:

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
IMPORTANT: Return ONLY valid JSON. No additional text before or after."""

AGENT2_SYSTEM_PROMPT = """You are an NDIS audit quality assurance specialist. You receive:
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
   3 = Specific NDIS plan goal referenced by full name or number (e.g., "Goal 2: Increase independence with daily living tasks")

2. Participant Voice (0-3)
   0 = No participant perspective captured at all
   1 = Worker's interpretation of participant's feelings (e.g., "seemed happy")
   2 = Participant's preferences, choices, or requests documented (e.g., "chose to walk", "asked to come back")
   3 = Direct quotes from the participant documented

3. Measurable Outcomes (0-3)
   0 = No outcomes documented at all
   1 = General statement about how session went (e.g., "went well", "went ok")
   2 = Specific observable outcomes described — what the participant DID, even without numbers (e.g., "made breakfast mostly by herself", "planted tomatoes", "selected groceries independently")
   3 = Quantifiable outcomes with numbers or comparison to baseline (e.g., "completed 3 of 5 steps independently, up from 1 last month")

4. Support Delivered (0-3)
   0 = No description of support at all
   1 = Vague description (e.g., "helped with tasks")
   2 = Clear description of specific support activities (e.g., "assisted with meal preparation", "accompanied to community garden")
   3 = Detailed description with duration, method, and participant engagement level

5. Risk & Safety (0-3)
   0 = No safety information at all
   1 = Generic safety statement (e.g., "no issues", "all good")
   2 = Specific safety statement confirming no incidents, medication events, or safety concerns
   3 = Comprehensive safety assessment covering multiple domains (incidents, medication, environmental safety)

TRAFFIC LIGHT ASSIGNMENT — FOLLOW THESE RULES STRICTLY:
- RED: If ANY red flags were detected (provided in the RED FLAGS section), the traffic light MUST be RED regardless of pillar scores. Red flags include: restrictive practices, medication errors, injuries/falls, abuse/neglect indicators, behavioural incidents, etc.
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
IMPORTANT: If red flags are present, traffic light MUST be RED."""


# ===== SAMPLE PROGRESS NOTES =====

SAMPLE_NOTES = [
    {
        "id": "test_001",
        "participant_name": "Margaret Kennedy",
        "support_worker": "Sarah Jones",
        "date": "17 March 2026",
        "time": "9:00 AM",
        "duration": "2 hours",
        "raw_text": "Went to Margs place this morning for her usual session. Helped her with breakfast - she made toast and eggs mostly by herself, I just helped with the stove. Then we did some cleaning, vacuumed the lounge and she wiped down the kitchen. She said she wants to keep doing this every week cos she feels more confident. Goal 2 daily living. No issues.",
        "expected_traffic_light": "GREEN",
        "expected_red_flags": 0,
        "description": "Good note — has goal reference, participant voice, measurable outcomes"
    },
    {
        "id": "test_002",
        "participant_name": "David Chen",
        "support_worker": "Mike Thompson",
        "date": "",
        "time": "",
        "duration": "",
        "raw_text": "Took David to the shops. He picked out some groceries. Went ok.",
        "expected_traffic_light": "ORANGE",
        "expected_red_flags": 0,
        "description": "Poor note — missing date, time, goal, participant voice, measurable outcomes"
    },
    {
        "id": "test_003",
        "participant_name": "Patricia Lam",
        "support_worker": "Jenny Williams",
        "date": "18 March 2026",
        "time": "6:30 PM",
        "duration": "1 hour",
        "raw_text": "Evening shift with Patricia. Was giving her meds and realised I gave her the wrong dose of her blood pressure tablet - gave her 10mg instead of 5mg. Noticed straight away after she took it. Called the on-call nurse Aunty Rose who said to monitor her for 2 hours. Patricia seemed fine, no adverse effects. Stayed extra time to monitor. Reported to supervisor Dr Smith on phone 0412 345 678.",
        "expected_traffic_light": "RED",
        "expected_red_flags": 1,
        "description": "Red flag — medication error (wrong dose)"
    },
    {
        "id": "test_004",
        "participant_name": "Thomas Nguyen",
        "support_worker": "Alex Rivera",
        "date": "19 March 2026",
        "time": "2:00 PM",
        "duration": "2.5 hours",
        "raw_text": "Community access with Thomas today. Went to the community garden at 42 Smith Street Footscray. He was really into it - planted some tomatoes and talked to the other gardeners. He asked if we could come back next week. Working on Goal 1 community connections. Thomas said he enjoyed meeting new people and wants to join the Wednesday group too. No safety concerns.",
        "expected_traffic_light": "GREEN",
        "expected_red_flags": 0,
        "description": "Good note — strong participant voice, goal linkage, measurable outcomes"
    },
    {
        "id": "test_005",
        "participant_name": "Sandra Reeves",
        "support_worker": "Karen Mitchell",
        "date": "20 March 2026",
        "time": "10:00 AM",
        "duration": "3 hours",
        "raw_text": "Morning session with Sandra. She was very agitated when I arrived and refused to do her morning routine. She started yelling and threw a cup at the wall. I tried to calm her down but she wouldn't listen. Eventually she settled after about 20 mins. We then did some light cleaning together. She didn't want to talk much after that. I noticed a bruise on her arm that wasn't there last visit - she said Uncle Jim did it. I'm concerned about this. Reported to my coordinator.",
        "expected_traffic_light": "RED",
        "expected_red_flags": 2,
        "description": "Red flags — behavioural incident (throwing cup, aggression) AND abuse/neglect indicators (unexplained bruise, named perpetrator)"
    }
]


# ===== PII SCRUBBER SIMULATION =====

def scrub_pii(text, participant_name, worker_name):
    """Simulate the Rust PII scrubber in Python for testing."""
    scrubbed = text
    mappings = []
    
    # Scrub participant name (full name first, then individual parts)
    if participant_name:
        if participant_name in scrubbed:
            scrubbed = scrubbed.replace(participant_name, "[Participant]")
            mappings.append({"original": participant_name, "tag": "[Participant]", "category": "participant_name"})
        # Also scrub individual name parts (first name, last name)
        for part in participant_name.split():
            if len(part) > 2 and part in scrubbed:
                scrubbed = scrubbed.replace(part, "[Participant]")
                mappings.append({"original": part, "tag": "[Participant]", "category": "participant_name"})
        # Scrub common nicknames/abbreviations
        first_name = participant_name.split()[0] if participant_name.split() else ""
        if first_name:
            # Check for common nickname patterns (e.g., "Margs" for "Margaret")
            for word in scrubbed.split():
                clean_word = re.sub(r'[^a-zA-Z]', '', word)
                if len(clean_word) >= 4 and first_name[:3].lower() == clean_word[:3].lower() and clean_word.lower() != first_name.lower():
                    scrubbed = scrubbed.replace(word, "[Participant]", 1)
                    mappings.append({"original": clean_word, "tag": "[Participant]", "category": "participant_nickname"})
    
    # Scrub worker name
    if worker_name:
        if worker_name in scrubbed:
            scrubbed = scrubbed.replace(worker_name, "[Support Worker]")
            mappings.append({"original": worker_name, "tag": "[Support Worker]", "category": "worker_name"})
        for part in worker_name.split():
            if len(part) > 2 and part in scrubbed:
                scrubbed = scrubbed.replace(part, "[Support Worker]")
                mappings.append({"original": part, "tag": "[Support Worker]", "category": "worker_name"})
    
    # Scrub kinship/professional titles with names
    title_patterns = [
        r'(?i)\b(Aunty|Auntie|Uncle|Nan|Nanna|Pop)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
        r'(?i)\b(Dr|Doctor|Prof|Professor|Mr|Mrs|Ms|Nurse)\s*\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b',
    ]
    for pattern in title_patterns:
        for match in re.finditer(pattern, scrubbed):
            full = match.group(0)
            if '[' not in full:
                scrubbed = scrubbed.replace(full, "[Associate]", 1)
                mappings.append({"original": full, "tag": "[Associate]", "category": "associate_name"})
    
    # Scrub phone numbers
    phone_patterns = [
        r'\b04\d{2}\s?\d{3}\s?\d{3}\b',
        r'\b0[2-9]\d{2}\s?\d{3}\s?\d{3}\b',
    ]
    for pattern in phone_patterns:
        for match in re.finditer(pattern, scrubbed):
            phone = match.group(0)
            if '[' not in phone:
                scrubbed = scrubbed.replace(phone, "[Phone]", 1)
                mappings.append({"original": phone, "tag": "[Phone]", "category": "phone"})
    
    # Scrub addresses
    addr_pattern = r'\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Way|Crescent|Cr|Boulevard|Blvd)\b'
    for match in re.finditer(addr_pattern, scrubbed):
        addr = match.group(0)
        if '[' not in addr:
            scrubbed = scrubbed.replace(addr, "[Location]", 1)
            mappings.append({"original": addr, "tag": "[Location]", "category": "address"})
    
    # Scrub suburb names that follow addresses
    suburb_pattern = r'\[Location\]\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b'
    for match in re.finditer(suburb_pattern, scrubbed):
        suburb = match.group(1)
        if '[' not in suburb and len(suburb) > 3:
            scrubbed = scrubbed.replace(match.group(0), "[Location]", 1)
            mappings.append({"original": suburb, "tag": "[Location]", "category": "suburb"})
    
    return scrubbed, mappings


def restore_pii(text, mappings):
    """Restore PII from mappings back into text."""
    restored = text
    tag_map = {}
    for m in mappings:
        if m["tag"] not in tag_map:
            tag_map[m["tag"]] = m["original"]
    
    for tag, original in tag_map.items():
        restored = restored.replace(tag, original)
    
    return restored


# ===== API CALLS =====

def call_agent1(scrubbed_text, note_metadata):
    """Call Agent 1 (Rewrite + Scan) via OpenAI API."""
    # Build participant code from name
    name = note_metadata.get('participant_name', '')
    parts = name.split()
    if len(parts) >= 2:
        code = (parts[0][0] + parts[-1][0]).upper() + "-" + str(hash(name) % 1000).zfill(3)
    else:
        code = name[:2].upper() + "-001"
    
    worker = note_metadata.get('support_worker', '')
    if worker:
        wparts = worker.split()
        wcode = (wparts[0][0] + wparts[-1][0]).upper() + "-" + str(hash(worker) % 1000).zfill(3) if len(wparts) >= 2 else worker[:2].upper() + "-001"
    else:
        wcode = "Not provided"

    date_str = note_metadata.get('date', '') or 'Not provided'
    time_str = note_metadata.get('time', '') or 'Not provided'
    dur_str = note_metadata.get('duration', '') or 'Not provided'

    user_msg = f"""RAW PROGRESS NOTE:
---
METADATA (from case management system — verified facts, use these in the rewrite):
  Participant Code: {code}
  Support Worker Code: {wcode}
  Date: {date_str}
  Time: {time_str}
  Duration: {dur_str}

Note text (as written by the support worker):
{scrubbed_text}
---

Please rewrite this note to audit-prepared standard and scan for any red flags. Return your response as valid JSON."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENT1_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.3,
        max_tokens=2048,
    )
    
    raw_output = response.choices[0].message.content.strip()
    return parse_json_response(raw_output)


def call_agent2(original_scrubbed, rewritten_note, note_metadata, red_flags=None):
    """Call Agent 2 (Audit + Score) via OpenAI API."""
    # Build same codes
    name = note_metadata.get('participant_name', '')
    parts = name.split()
    if len(parts) >= 2:
        code = (parts[0][0] + parts[-1][0]).upper() + "-" + str(hash(name) % 1000).zfill(3)
    else:
        code = name[:2].upper() + "-001"
    
    worker = note_metadata.get('support_worker', '')
    if worker:
        wparts = worker.split()
        wcode = (wparts[0][0] + wparts[-1][0]).upper() + "-" + str(hash(worker) % 1000).zfill(3) if len(wparts) >= 2 else worker[:2].upper() + "-001"
    else:
        wcode = "Not provided"

    date_str = note_metadata.get('date', '') or 'Not provided'
    time_str = note_metadata.get('time', '') or 'Not provided'
    dur_str = note_metadata.get('duration', '') or 'Not provided'

    # Format red flags section
    if red_flags and len(red_flags) > 0:
        flags_text = "RED FLAGS DETECTED BY SCANNING AGENT (authoritative — if any flags listed, traffic light MUST be RED):\n"
        for rf in red_flags:
            flags_text += f"  - {rf.get('category', 'Unknown')}: {rf.get('description', '')}\n"
            if rf.get('keywords_matched'):
                flags_text += f"    Keywords: {', '.join(rf['keywords_matched'])}\n"
    else:
        flags_text = "RED FLAGS DETECTED BY SCANNING AGENT: None"

    user_msg = f"""ORIGINAL RAW NOTE (as written by the support worker):
---
{original_scrubbed}
---

METADATA FROM CASE MANAGEMENT SYSTEM (verified — NOT hallucinations):
  Participant Code: {code}
  Support Worker Code: {wcode}
  Date: {date_str}
  Time: {time_str}
  Duration: {dur_str}

{flags_text}

REWRITTEN NOTE (prepared by documentation assistant):
---
{rewritten_note}
---

Please audit this rewritten note against the original raw note and metadata. Check for hallucinations (only flag clinical details not in the raw note — metadata fields are verified), score against the 5-pillar rubric, and assign a traffic light. If red flags were detected above, traffic light MUST be RED. Return your response as valid JSON."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": AGENT2_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.3,
        max_tokens=2048,
    )
    
    raw_output = response.choices[0].message.content.strip()
    return parse_json_response(raw_output)


def parse_json_response(text):
    """Parse JSON from LLM output, handling code blocks."""
    match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    
    match = re.search(r'```\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    
    raise ValueError(f"Could not parse JSON from: {text[:200]}...")


# ===== TEST RUNNER =====

def run_tests():
    """Run all 5 sample notes through both agents and collect results."""
    results = []
    
    print("=" * 70)
    print("RiteDoc AI Agent Prompt Testing Suite")
    print(f"Model: {MODEL}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    for i, note in enumerate(SAMPLE_NOTES):
        print(f"\n{'─' * 70}")
        print(f"TEST {i+1}/5: {note['description']}")
        print(f"Participant: {note['participant_name']}")
        print(f"{'─' * 70}")
        
        # Step 1: PII Scrubbing
        print("\n[1] PII Scrubbing...")
        scrubbed_text, pii_mappings = scrub_pii(
            note["raw_text"],
            note["participant_name"],
            note["support_worker"]
        )
        print(f"  Original: {note['raw_text'][:80]}...")
        print(f"  Scrubbed: {scrubbed_text[:80]}...")
        print(f"  PII items scrubbed: {len(pii_mappings)}")
        for m in pii_mappings:
            print(f"    - {m['category']}: '{m['original']}' -> '{m['tag']}'")
        
        # Step 2: Agent 1 (Rewrite + Scan)
        print("\n[2] Agent 1: Rewrite + Red Flag Scan...")
        try:
            agent1_result = call_agent1(scrubbed_text, note)
            print(f"  Rewritten note length: {len(agent1_result.get('rewritten_note', ''))}")
            print(f"  Red flags found: {len(agent1_result.get('red_flags', []))}")
            for rf in agent1_result.get('red_flags', []):
                print(f"    - {rf['category']}: {rf.get('description', '')[:80]}")
            print(f"  Missing data items: {len(agent1_result.get('missing_data', []))}")
            for md in agent1_result.get('missing_data', []):
                print(f"    - {md['field_name']}: {md.get('reason', '')[:60]}")
            print(f"  Bracket flags: {len(agent1_result.get('bracket_flags', []))}")
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            agent1_result = {"rewritten_note": scrubbed_text, "red_flags": [], "missing_data": [], "bracket_flags": []}
        
        # Step 3: Agent 2 (Audit + Score)
        print("\n[3] Agent 2: Audit + Score...")
        try:
            agent2_result = call_agent2(scrubbed_text, agent1_result.get("rewritten_note", ""), note, red_flags=agent1_result.get("red_flags", []))
            print(f"  Hallucination check: {'PASS' if agent2_result.get('hallucination_check', False) else 'FAIL'}")
            if not agent2_result.get('hallucination_check', True):
                print(f"    Details: {agent2_result.get('hallucination_details', '')[:100]}")
            print(f"  Traffic light: {agent2_result.get('traffic_light', 'UNKNOWN')}")
            print(f"  Pillar scores:")
            for ps in agent2_result.get('pillar_scores', []):
                status = "MET" if ps.get('met', False) else "NOT MET"
                print(f"    {ps['pillar_id']}. {ps['pillar_name']}: {ps['score']}/3 ({status}) — {ps.get('feedback', '')[:60]}")
            print(f"  Audit notes: {agent2_result.get('audit_notes', '')[:100]}")
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()
            agent2_result = {"traffic_light": "ORANGE", "pillar_scores": [], "hallucination_check": True, "audit_notes": str(e)}
        
        # Step 4: PII Restoration
        print("\n[4] PII Restoration...")
        final_note = restore_pii(
            agent2_result.get("audited_note", agent1_result.get("rewritten_note", "")),
            pii_mappings
        )
        print(f"  Final note (first 150 chars): {final_note[:150]}...")
        
        # Step 5: Validation
        print("\n[5] Validation:")
        actual_traffic = agent2_result.get("traffic_light", "UNKNOWN")
        expected_traffic = note["expected_traffic_light"]
        actual_flags = len(agent1_result.get("red_flags", []))
        expected_flags = note["expected_red_flags"]
        
        traffic_pass = actual_traffic == expected_traffic
        flags_pass = (expected_flags == 0 and actual_flags == 0) or (expected_flags > 0 and actual_flags > 0)
        
        print(f"  Traffic light: Expected={expected_traffic}, Got={actual_traffic} {'PASS' if traffic_pass else 'FAIL'}")
        print(f"  Red flags: Expected>={expected_flags}, Got={actual_flags} {'PASS' if flags_pass else 'FAIL'}")
        
        # Check PII was scrubbed from the rewritten note
        pii_in_rewrite = False
        for m in pii_mappings:
            if m["original"] in agent1_result.get("rewritten_note", ""):
                pii_in_rewrite = True
                print(f"  WARNING: PII '{m['original']}' found in rewritten note (expected scrubbed)")
        
        pii_scrub_pass = not pii_in_rewrite
        print(f"  PII scrubbing: {'PASS' if pii_scrub_pass else 'FAIL'}")
        
        # Check bracket flags for missing data
        bracket_flags_present = "[" in agent1_result.get("rewritten_note", "") and "REQUIRED" in agent1_result.get("rewritten_note", "")
        if note["expected_traffic_light"] == "ORANGE":
            print(f"  Bracket flags in note: {'PASS' if bracket_flags_present else 'FAIL'} (expected for ORANGE)")
        
        hallucination_pass = agent2_result.get("hallucination_check", False)
        print(f"  Hallucination check: {'PASS' if hallucination_pass else 'FAIL'}")
        
        result = {
            "test_id": note["id"],
            "description": note["description"],
            "participant": note["participant_name"],
            "raw_note": note["raw_text"],
            "scrubbed_note": scrubbed_text,
            "pii_mappings": pii_mappings,
            "agent1_output": agent1_result,
            "agent2_output": agent2_result,
            "final_note": final_note,
            "expected_traffic_light": expected_traffic,
            "actual_traffic_light": actual_traffic,
            "traffic_light_pass": traffic_pass,
            "expected_red_flags": expected_flags,
            "actual_red_flags": actual_flags,
            "red_flags_pass": flags_pass,
            "pii_scrub_pass": pii_scrub_pass,
            "hallucination_pass": hallucination_pass,
            "overall_pass": traffic_pass and flags_pass and pii_scrub_pass,
        }
        results.append(result)
    
    # Summary
    print(f"\n{'=' * 70}")
    print("TEST SUMMARY")
    print(f"{'=' * 70}")
    
    total = len(results)
    passed = sum(1 for r in results if r["overall_pass"])
    
    for r in results:
        status = "PASS" if r["overall_pass"] else "FAIL"
        print(f"  [{status}] {r['test_id']}: {r['description']}")
        if not r["traffic_light_pass"]:
            print(f"         Traffic light mismatch: expected {r['expected_traffic_light']}, got {r['actual_traffic_light']}")
        if not r["red_flags_pass"]:
            print(f"         Red flags mismatch: expected {r['expected_red_flags']}, got {r['actual_red_flags']}")
        if not r["hallucination_pass"]:
            print(f"         Hallucination check failed: {r['agent2_output'].get('hallucination_details', '')[:80]}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    print(f"{'=' * 70}")
    
    return results


def save_results(results):
    """Save test results to JSON and Markdown files."""
    json_path = "/home/ubuntu/ritedoc/tests/test_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"\nJSON results saved to: {json_path}")
    
    md_path = "/home/ubuntu/ritedoc/tests/test_results.md"
    with open(md_path, "w") as f:
        f.write("# RiteDoc AI Agent Prompt Test Results\n\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n")
        f.write(f"**Model:** {MODEL}  \n")
        f.write(f"**Tests:** {len(results)}  \n\n")
        
        total = len(results)
        passed = sum(1 for r in results if r["overall_pass"])
        f.write(f"## Summary: {passed}/{total} tests passed\n\n")
        
        f.write("| Test | Description | Traffic Light | Red Flags | PII Scrub | Hallucination | Overall |\n")
        f.write("|------|-------------|---------------|-----------|-----------|---------------|--------|\n")
        for r in results:
            tl = "PASS" if r["traffic_light_pass"] else "FAIL"
            rf = "PASS" if r["red_flags_pass"] else "FAIL"
            pii = "PASS" if r["pii_scrub_pass"] else "FAIL"
            hal = "PASS" if r["hallucination_pass"] else "FAIL"
            overall = "PASS" if r["overall_pass"] else "FAIL"
            f.write(f"| {r['test_id']} | {r['description'][:50]} | {tl} (exp: {r['expected_traffic_light']}, got: {r['actual_traffic_light']}) | {rf} (exp: {r['expected_red_flags']}, got: {r['actual_red_flags']}) | {pii} | {hal} | {overall} |\n")
        
        f.write("\n---\n\n")
        
        for i, r in enumerate(results):
            f.write(f"## Test {i+1}: {r['description']}\n\n")
            f.write(f"**Participant:** {r['participant']}  \n")
            f.write(f"**Expected Traffic Light:** {r['expected_traffic_light']}  \n")
            f.write(f"**Actual Traffic Light:** {r['actual_traffic_light']}  \n")
            f.write(f"**Expected Red Flags:** {r['expected_red_flags']}  \n")
            f.write(f"**Actual Red Flags:** {r['actual_red_flags']}  \n\n")
            
            f.write("### Raw Note\n\n")
            f.write(f"> {r['raw_note']}\n\n")
            
            f.write("### Scrubbed Note\n\n")
            f.write(f"> {r['scrubbed_note']}\n\n")
            
            if r['pii_mappings']:
                f.write("### PII Mappings\n\n")
                f.write("| Original | Tag | Category |\n")
                f.write("|----------|-----|----------|\n")
                for m in r['pii_mappings']:
                    f.write(f"| {m['original']} | {m['tag']} | {m['category']} |\n")
                f.write("\n")
            
            f.write("### Agent 1 Output: Rewritten Note\n\n")
            f.write(f"{r['agent1_output'].get('rewritten_note', 'N/A')}\n\n")
            
            if r['agent1_output'].get('red_flags'):
                f.write("### Red Flags Detected\n\n")
                for rf in r['agent1_output']['red_flags']:
                    f.write(f"- **{rf['category']}**: {rf.get('description', '')}  \n")
                    f.write(f"  Keywords: {', '.join(rf.get('keywords_matched', []))}  \n\n")
            
            if r['agent1_output'].get('missing_data'):
                f.write("### Missing Data\n\n")
                for md in r['agent1_output']['missing_data']:
                    f.write(f"- **{md['field_name']}**: {md.get('reason', '')}  \n")
                    f.write(f"  Placeholder: `{md.get('placeholder', '')}`  \n\n")
            
            f.write("### Agent 2 Output: Audit Scores\n\n")
            a2 = r['agent2_output']
            f.write(f"**Hallucination Check:** {'PASS' if a2.get('hallucination_check', False) else 'FAIL'}  \n")
            if not a2.get('hallucination_check', True):
                f.write(f"**Hallucination Details:** {a2.get('hallucination_details', '')}  \n")
            f.write(f"**Traffic Light:** {a2.get('traffic_light', 'UNKNOWN')}  \n\n")
            
            if a2.get('pillar_scores'):
                f.write("| Pillar | Score | Met | Feedback |\n")
                f.write("|--------|-------|-----|----------|\n")
                for ps in a2['pillar_scores']:
                    met = "Yes" if ps.get('met', False) else "No"
                    f.write(f"| {ps['pillar_name']} | {ps['score']}/3 | {met} | {ps.get('feedback', '')[:80]} |\n")
                f.write("\n")
            
            f.write(f"**Audit Notes:** {a2.get('audit_notes', '')}\n\n")
            
            f.write("### Final Note (PII Restored)\n\n")
            f.write(f"{r['final_note']}\n\n")
            
            f.write("---\n\n")
    
    print(f"Markdown report saved to: {md_path}")


if __name__ == "__main__":
    print("Starting RiteDoc AI Agent Prompt Tests...")
    print(f"Using OpenAI API with model: {MODEL}")
    print()
    
    results = run_tests()
    save_results(results)
    
    all_passed = all(r["overall_pass"] for r in results)
    sys.exit(0 if all_passed else 1)
