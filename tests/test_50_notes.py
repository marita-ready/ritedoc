#!/usr/bin/env python3
"""
RiteDoc — 50-Note Pipeline Test Suite
Tests all 50 synthetic dirty notes through both Standard and Turbo modes
using OpenAI API (gpt-4.1-mini) as a stand-in for local Nanoclaw/llama.cpp.

Records: traffic light accuracy, red flag detection, PII scrubbing, hallucinations, timing.
"""

import csv
import json
import os
import re
import sys
import time
from datetime import datetime

from openai import OpenAI

client = OpenAI()
MODEL = "gpt-4.1-mini"

# ===== Load cartridges =====
CARTRIDGE_DIR = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "cartridges")

def load_json(filename):
    path = os.path.join(CARTRIDGE_DIR, filename)
    with open(path, "r") as f:
        return json.load(f)

RED_FLAGS_V2 = load_json("red_flags_v2.json")
RUBRIC_V2 = load_json("rubric_v2.json")
POLICIES = load_json("policies.json")
SYSTEM_PROMPTS = load_json("system_prompts.json")

# Extract agent prompts
AGENT_PROMPTS = {a["id"]: a["prompt"] for a in SYSTEM_PROMPTS["agents"]}

# ===== PII Scrubber (Python mirror of Rust implementation) =====

KINSHIP_TITLES = [
    "Aunty", "Auntie", "Aunt", "Uncle", "Nan", "Nanna", "Nanny",
    "Pop", "Poppy", "Grandma", "Grandpa", "Grandmother", "Grandfather",
    "Sis", "Bro", "Cuz", "Cousin", "Mum", "Mom", "Dad",
    "Brother", "Sister", "Niece", "Nephew", "Son", "Daughter",
    "Mother", "Father", "Wife", "Husband", "Partner",
]

MEDICAL_TITLES = [
    "Dr", "Dr.", "Doctor", "Prof", "Prof.", "Professor",
    "Nurse", "Physio", "Physiotherapist", "OT", "Psychologist",
    "Psychiatrist", "Therapist", "Counsellor", "Counselor",
]

VIC_SUBURBS = [
    "Fitzroy", "Collingwood", "Richmond", "Carlton", "Brunswick",
    "St Kilda", "Prahran", "South Yarra", "Toorak", "Hawthorn",
    "Kew", "Malvern", "Camberwell", "Box Hill", "Glen Waverley",
    "Dandenong", "Frankston", "Geelong", "Ballarat", "Bendigo",
    "Shepparton", "Warrnambool", "Mildura", "Melbourne",
]

FACILITY_SUFFIXES = ["Hospital", "Clinic", "Medical Centre", "Medical Center", "Surgery"]

def scrub_pii(text, participant_name="", worker_name=""):
    """Scrub PII from text, return (scrubbed_text, pii_items_found)"""
    scrubbed = text
    pii_items = []

    # Participant name
    if participant_name:
        for name_part in [participant_name] + [p for p in participant_name.split() if len(p) > 2]:
            pattern = re.compile(re.escape(name_part), re.IGNORECASE)
            if pattern.search(scrubbed):
                pii_items.append(("participant", name_part))
                scrubbed = pattern.sub("[Participant]", scrubbed)

    # Worker name
    if worker_name:
        for name_part in [worker_name] + [p for p in worker_name.split() if len(p) > 2]:
            pattern = re.compile(re.escape(name_part), re.IGNORECASE)
            if pattern.search(scrubbed):
                pii_items.append(("worker", name_part))
                scrubbed = pattern.sub("[Support Worker]", scrubbed)

    # Medical professionals
    for title in MEDICAL_TITLES:
        pattern = re.compile(
            rf"(?i)\b{re.escape(title)}\s*\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
        )
        for m in pattern.finditer(scrubbed):
            if "[" not in m.group(0):
                pii_items.append(("medical_professional", m.group(0)))
        scrubbed = pattern.sub(lambda m: "[Medical Professional]" if "[" not in m.group(0) else m.group(0), scrubbed)

    # Facilities
    for suffix in FACILITY_SUFFIXES:
        pattern = re.compile(
            rf"(?i)\b(?:the\s+)?(?:[A-Z][a-z]+\s+){{1,4}}{re.escape(suffix)}\b"
        )
        for m in pattern.finditer(scrubbed):
            if "[" not in m.group(0):
                pii_items.append(("facility", m.group(0)))
        scrubbed = pattern.sub(lambda m: "[Facility]" if "[" not in m.group(0) else m.group(0), scrubbed)

    # Kinship titles + names
    for title in KINSHIP_TITLES:
        pattern = re.compile(
            rf"(?i)\b{re.escape(title)}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"
        )
        for m in pattern.finditer(scrubbed):
            if "[" not in m.group(0):
                pii_items.append(("associate", m.group(0)))
        scrubbed = pattern.sub(lambda m: "[Associate]" if "[" not in m.group(0) else m.group(0), scrubbed)

    # Phone numbers
    phone_patterns = [
        r"\b(?:\+?61\s?)?0?4\d{2}\s?\d{3}\s?\d{3}\b",
        r"\b(?:\+?61\s?)?0[2-9]\s?\d{4}\s?\d{4}\b",
    ]
    for pp in phone_patterns:
        pattern = re.compile(pp)
        for m in pattern.finditer(scrubbed):
            if "[" not in m.group(0):
                pii_items.append(("phone", m.group(0)))
        scrubbed = pattern.sub(lambda m: "[Phone]" if "[" not in m.group(0) else m.group(0), scrubbed)

    # Email
    email_pattern = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
    for m in email_pattern.finditer(scrubbed):
        pii_items.append(("email", m.group(0)))
    scrubbed = email_pattern.sub("[Email]", scrubbed)

    # Victorian suburbs
    for suburb in VIC_SUBURBS:
        pattern = re.compile(rf"\b{re.escape(suburb)}\b")
        if pattern.search(scrubbed):
            if "[" not in suburb:
                pii_items.append(("location", suburb))
                scrubbed = pattern.sub("[Location]", scrubbed)

    return scrubbed, pii_items


# ===== Agent System Prompts =====

STANDARD_AGENT1_PROMPT = """You are RiteDoc Standard Agent 1. Your task is to rewrite raw support worker notes into professional, objective, and audit-ready language while simultaneously scanning for critical incidents.

INSTRUCTIONS:
1. REWRITE: Transform the raw input into a professional progress note. Write in third person, past tense, professional clinical language. Use plain, accessible English.
2. RED FLAG SCAN: Scan the note against these 12 categories:
   - Unauthorised Restrictive Practice
   - Medication Error / Missed Medication
   - Injury / Fall / Medical Emergency
   - Abuse / Neglect / Exploitation
   - Missing Consent / Capacity Concerns
   - Property Damage / Financial Irregularity
   - Behavioural Incident
   - Worker Safety / WHS Concerns
   - Suicidal Ideation / Self-Harm
   - Absconding / Missing Person
   - Sexual Safety Concerns
   - Environmental Hazard
3. NO HALLUCINATION: Do not invent details. If information is missing, use bracket flags like [GOAL LINK REQUIRED — explanation].
4. USE metadata fields (date, time, duration, participant code, worker code) — these are verified system data.
5. End every note with a safety statement.

OUTPUT FORMAT — respond with valid JSON only:
{
  "rewritten_note": "The full rewritten note text",
  "red_flags": [
    {"category": "Category name", "description": "Plain English description", "keywords_matched": ["phrase"], "severity": "HIGH or CRITICAL or MEDIUM"}
  ],
  "missing_data": [
    {"field_name": "Name", "reason": "Why needed", "placeholder": "[FIELD REQUIRED — explanation]"}
  ],
  "bracket_flags": ["[FLAG TEXT]"]
}

Return ONLY valid JSON. No additional text."""

STANDARD_AGENT2_PROMPT = """You are RiteDoc Standard Agent 2. Your task is to audit the rewritten note and assign a compliance score.

INSTRUCTIONS:
1. AUDIT: Evaluate against the 5 pillars (Goal Linkage, Participant Voice, Measurable Outcomes, Support Delivered, Risk & Safety).
2. SCORE: Assign internal score (0-3) for each pillar. DO NOT display scores to user.
3. TRAFFIC LIGHT:
   - RED: ANY red flags detected → MUST be RED regardless of scores
   - ORANGE: No red flags but any pillar below 2, or bracket flags exist
   - GREEN: All 5 pillars score 2+ AND no red flags AND no bracket flags
4. CHECK FOR HALLUCINATIONS: Verify every fact in the rewrite exists in the original or metadata.

OUTPUT FORMAT — respond with valid JSON only:
{
  "audited_note": "The final note text",
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
  "audit_notes": "Brief summary"
}

CRITICAL: If red flags are present, traffic light MUST be RED.
Return ONLY valid JSON."""

TURBO_AGENT1_PROMPT = """You are RiteDoc Turbo Agent 1. Your sole task is to rewrite raw support worker notes into professional, objective, and audit-ready language.

INSTRUCTIONS:
1. REWRITE: Transform the raw input into a professional progress note. Write in third person, past tense, professional clinical language.
2. NO HALLUCINATION: Do not invent details. If information is missing, use bracket flags.
3. USE metadata fields provided — these are verified system data.
4. End every note with a safety statement.

OUTPUT FORMAT — respond with valid JSON only:
{
  "rewritten_note": "The full rewritten note text",
  "missing_data": [
    {"field_name": "Name", "reason": "Why needed", "placeholder": "[FIELD REQUIRED — explanation]"}
  ],
  "bracket_flags": ["[FLAG TEXT]"]
}

Return ONLY valid JSON."""

TURBO_AGENT2_PROMPT = """You are RiteDoc Turbo Agent 2. Your sole task is to scan notes for critical incidents and compliance breaches.

Scan against these 12 red flag categories:
- Unauthorised Restrictive Practice
- Medication Error / Missed Medication
- Injury / Fall / Medical Emergency
- Abuse / Neglect / Exploitation
- Missing Consent / Capacity Concerns
- Property Damage / Financial Irregularity
- Behavioural Incident
- Worker Safety / WHS Concerns
- Suicidal Ideation / Self-Harm
- Absconding / Missing Person
- Sexual Safety Concerns
- Environmental Hazard

OUTPUT FORMAT — respond with valid JSON only:
{
  "red_flags": [
    {"category": "Category name", "description": "Plain English description", "keywords_matched": ["phrase"], "severity": "HIGH or CRITICAL or MEDIUM"}
  ]
}

If no red flags found, return {"red_flags": []}.
Return ONLY valid JSON."""

TURBO_AGENT3_PROMPT = STANDARD_AGENT2_PROMPT.replace("Standard Agent 2", "Turbo Agent 3")


# ===== API Helpers =====

def call_agent(system_prompt, user_message, max_retries=3):
    """Call OpenAI API with retry logic"""
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                max_tokens=2048,
            )
            raw = response.choices[0].message.content.strip()
            return parse_json_response(raw)
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
            else:
                return {"error": str(e), "raw": ""}
    return {"error": "Max retries exceeded"}


def parse_json_response(text):
    """Extract and parse JSON from LLM response"""
    # Try ```json blocks
    match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try ``` blocks
    match = re.search(r"```\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try raw JSON
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    return {"error": "Failed to parse JSON", "raw": text}


def build_user_message(scrubbed_text, note_id, participant_code, worker_code, date, time_str, duration):
    """Build the user message for agents"""
    return f"""RAW PROGRESS NOTE:
---
METADATA (from case management system — verified facts, use these in the rewrite):
  Participant Code: {participant_code}
  Support Worker Code: {worker_code}
  Date: {date}
  Time: {time_str}
  Duration: {duration}

Note text (as written by the support worker):
{scrubbed_text}
---

Please process this note. Return your response as valid JSON."""


def build_audit_message(original_scrubbed, rewritten, red_flags, participant_code, worker_code, date, time_str, duration):
    """Build audit message for Agent 2/3"""
    flags_text = "RED FLAGS DETECTED BY SCANNING AGENT: None"
    if red_flags:
        flags_text = "RED FLAGS DETECTED BY SCANNING AGENT (authoritative — if any flags listed, traffic light MUST be RED):\n"
        for rf in red_flags:
            flags_text += f"  - {rf.get('category', 'Unknown')}: {rf.get('description', '')}\n"

    return f"""ORIGINAL RAW NOTE (as written by the support worker):
---
{original_scrubbed}
---

METADATA FROM CASE MANAGEMENT SYSTEM (verified — NOT hallucinations):
  Participant Code: {participant_code}
  Support Worker Code: {worker_code}
  Date: {date}
  Time: {time_str}
  Duration: {duration}

{flags_text}

REWRITTEN NOTE (prepared by documentation assistant):
---
{rewritten}
---

Please audit this rewritten note against the original raw note and metadata. Check for hallucinations, score against the 5-pillar rubric, and assign a traffic light. If red flags were detected above, traffic light MUST be RED. Return your response as valid JSON."""


# ===== Pipeline Runners =====

def run_standard_pipeline(note_id, raw_text, participant_name="", worker_name=""):
    """Standard Mode: 2 agents (Agent 1: Rewrite+Scan, Agent 2: Audit+Score)"""
    start = time.time()

    # PII scrub
    scrubbed_text, pii_items = scrub_pii(raw_text, participant_name, worker_name)

    p_code = f"P-{note_id:03d}"
    w_code = f"W-{note_id:03d}"

    # Agent 1: Rewrite + Scan
    user_msg = build_user_message(scrubbed_text, note_id, p_code, w_code, "2026-03-20", "9:00 AM", "2 hours")
    agent1_result = call_agent(STANDARD_AGENT1_PROMPT, user_msg)

    if "error" in agent1_result:
        return {
            "note_id": note_id,
            "mode": "Standard",
            "error": agent1_result.get("error", "Unknown"),
            "time_ms": int((time.time() - start) * 1000),
        }

    rewritten = agent1_result.get("rewritten_note", "")
    red_flags = agent1_result.get("red_flags", [])
    missing_data = agent1_result.get("missing_data", [])
    bracket_flags = agent1_result.get("bracket_flags", [])

    # Agent 2: Audit + Score
    audit_msg = build_audit_message(scrubbed_text, rewritten, red_flags, p_code, w_code, "2026-03-20", "9:00 AM", "2 hours")
    agent2_result = call_agent(STANDARD_AGENT2_PROMPT, audit_msg)

    if "error" in agent2_result:
        return {
            "note_id": note_id,
            "mode": "Standard",
            "error": agent2_result.get("error", "Unknown"),
            "time_ms": int((time.time() - start) * 1000),
        }

    elapsed = int((time.time() - start) * 1000)

    return {
        "note_id": note_id,
        "mode": "Standard",
        "scrubbed_text": scrubbed_text,
        "pii_items": pii_items,
        "pii_count": len(pii_items),
        "rewritten_note": rewritten,
        "red_flags": red_flags,
        "red_flag_count": len(red_flags),
        "missing_data": missing_data,
        "bracket_flags": bracket_flags,
        "traffic_light": agent2_result.get("traffic_light", "UNKNOWN"),
        "pillar_scores": agent2_result.get("pillar_scores", []),
        "hallucination_check": agent2_result.get("hallucination_check", None),
        "hallucination_details": agent2_result.get("hallucination_details", ""),
        "audit_notes": agent2_result.get("audit_notes", ""),
        "time_ms": elapsed,
        "error": None,
    }


def run_turbo_pipeline(note_id, raw_text, participant_name="", worker_name=""):
    """Turbo Mode: 3 agents (Agent 1: Rewrite, Agent 2: Scan, Agent 3: Audit+Score)"""
    start = time.time()

    scrubbed_text, pii_items = scrub_pii(raw_text, participant_name, worker_name)

    p_code = f"P-{note_id:03d}"
    w_code = f"W-{note_id:03d}"

    # Turbo Agent 1: Rewrite only
    user_msg = build_user_message(scrubbed_text, note_id, p_code, w_code, "2026-03-20", "9:00 AM", "2 hours")
    agent1_result = call_agent(TURBO_AGENT1_PROMPT, user_msg)

    if "error" in agent1_result:
        return {
            "note_id": note_id,
            "mode": "Turbo",
            "error": agent1_result.get("error", "Unknown"),
            "time_ms": int((time.time() - start) * 1000),
        }

    rewritten = agent1_result.get("rewritten_note", "")
    missing_data = agent1_result.get("missing_data", [])
    bracket_flags = agent1_result.get("bracket_flags", [])

    # Turbo Agent 2: Scan only
    scan_msg = f"""ORIGINAL RAW NOTE:
---
{scrubbed_text}
---

REWRITTEN NOTE:
---
{rewritten}
---

Scan both notes for red flags. Return valid JSON."""

    agent2_result = call_agent(TURBO_AGENT2_PROMPT, scan_msg)
    red_flags = agent2_result.get("red_flags", []) if "error" not in agent2_result else []

    # Turbo Agent 3: Audit + Score
    audit_msg = build_audit_message(scrubbed_text, rewritten, red_flags, p_code, w_code, "2026-03-20", "9:00 AM", "2 hours")
    agent3_result = call_agent(TURBO_AGENT3_PROMPT, audit_msg)

    if "error" in agent3_result:
        return {
            "note_id": note_id,
            "mode": "Turbo",
            "error": agent3_result.get("error", "Unknown"),
            "time_ms": int((time.time() - start) * 1000),
        }

    elapsed = int((time.time() - start) * 1000)

    return {
        "note_id": note_id,
        "mode": "Turbo",
        "scrubbed_text": scrubbed_text,
        "pii_items": pii_items,
        "pii_count": len(pii_items),
        "rewritten_note": rewritten,
        "red_flags": red_flags,
        "red_flag_count": len(red_flags),
        "missing_data": missing_data,
        "bracket_flags": bracket_flags,
        "traffic_light": agent3_result.get("traffic_light", "UNKNOWN"),
        "pillar_scores": agent3_result.get("pillar_scores", []),
        "hallucination_check": agent3_result.get("hallucination_check", None),
        "hallucination_details": agent3_result.get("hallucination_details", ""),
        "audit_notes": agent3_result.get("audit_notes", ""),
        "time_ms": elapsed,
        "error": None,
    }


# ===== Load Test Data =====

def load_test_notes():
    """Load the 50 synthetic dirty notes"""
    csv_path = os.path.join(os.path.dirname(__file__), "..", "testing", "synthetic_dirty_notes.csv")
    notes = []
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            notes.append({
                "id": int(row["ID"]),
                "raw_text": row["Raw_Note"],
                "expected_traffic_light": row["Expected_Traffic_Light"],
                "expected_red_flag_count": int(row["Expected_Red_Flag_Count"]),
                "notes": row["Notes"],
            })
    return notes


# ===== Evaluate Results =====

def evaluate_result(result, expected):
    """Evaluate a single result against expected values"""
    if result.get("error"):
        return {
            "traffic_light_correct": False,
            "red_flag_correct": False,
            "pii_scrubbed": False,
            "hallucination_free": False,
        }

    # Traffic light accuracy
    actual_tl = result.get("traffic_light", "UNKNOWN").upper()
    expected_tl = expected["expected_traffic_light"].upper()
    tl_correct = actual_tl == expected_tl

    # Red flag detection
    actual_rf = result.get("red_flag_count", 0)
    expected_rf = expected["expected_red_flag_count"]
    # Consider correct if: expected > 0 and actual > 0, or expected == 0 and actual == 0
    rf_correct = (expected_rf > 0 and actual_rf > 0) or (expected_rf == 0 and actual_rf == 0)

    # PII scrubbing check
    pii_items = result.get("pii_items", [])
    raw_text = expected["raw_text"]
    # Check if known PII entities in notes field were caught
    pii_scrubbed = True
    notes_text = expected.get("notes", "")
    if "PII:" in notes_text:
        # Extract expected PII items
        pii_section = notes_text.split("PII:")[1].strip().rstrip(".")
        expected_pii = [p.strip() for p in pii_section.split(",")]
        for ep in expected_pii:
            # Check if any PII item matches
            found = any(ep.lower() in str(pi).lower() for pi in pii_items)
            if not found:
                pii_scrubbed = False

    # Hallucination check
    # hallucination_check=True means "check passed, no hallucinations found"
    # hallucination_check=False means "hallucinations were detected"
    hall_check = result.get("hallucination_check", True)
    hall_details = result.get("hallucination_details", "")
    # If check is True and details don't indicate problems, it's clean
    if hall_check is True:
        hallucination_free = True
        # But if details text mentions hallucination found, override
        if hall_details and any(w in hall_details.lower() for w in ["hallucination found", "fabricated", "invented", "not present in", "not supported"]):
            hallucination_free = False
    else:
        hallucination_free = False

    return {
        "traffic_light_correct": tl_correct,
        "red_flag_correct": rf_correct,
        "pii_scrubbed": pii_scrubbed,
        "hallucination_free": hallucination_free,
        "actual_traffic_light": actual_tl,
        "expected_traffic_light": expected_tl,
        "actual_red_flags": actual_rf,
        "expected_red_flags": expected_rf,
    }


# ===== Main Test Runner =====

def run_tests(mode="standard", max_notes=50):
    """Run the test suite"""
    notes = load_test_notes()[:max_notes]
    results = []
    evaluations = []

    print(f"\n{'='*60}")
    print(f"RiteDoc Pipeline Test — {mode.upper()} Mode")
    print(f"Testing {len(notes)} notes with {MODEL}")
    print(f"{'='*60}\n")

    for i, note in enumerate(notes):
        note_id = note["id"]
        print(f"Processing note {note_id}/{len(notes)}...", end=" ", flush=True)

        try:
            if mode == "standard":
                result = run_standard_pipeline(note_id, note["raw_text"])
            else:
                result = run_turbo_pipeline(note_id, note["raw_text"])

            evaluation = evaluate_result(result, note)
            results.append(result)
            evaluations.append(evaluation)

            status = "✓" if not result.get("error") else "✗"
            tl = result.get("traffic_light", "ERR")
            expected_tl = note["expected_traffic_light"]
            tl_match = "✓" if evaluation.get("traffic_light_correct") else "✗"
            time_ms = result.get("time_ms", 0)

            print(f"{status} TL:{tl}(exp:{expected_tl}){tl_match} RF:{result.get('red_flag_count',0)} PII:{result.get('pii_count',0)} {time_ms}ms")

        except Exception as e:
            print(f"✗ Error: {e}")
            results.append({"note_id": note_id, "mode": mode, "error": str(e), "time_ms": 0})
            evaluations.append({
                "traffic_light_correct": False,
                "red_flag_correct": False,
                "pii_scrubbed": False,
                "hallucination_free": False,
            })

        # Brief pause to avoid rate limiting
        time.sleep(0.5)

    return results, evaluations, notes


def print_summary(evaluations, results, mode):
    """Print test summary"""
    total = len(evaluations)
    errors = sum(1 for r in results if r.get("error"))
    successful = total - errors

    tl_correct = sum(1 for e in evaluations if e.get("traffic_light_correct"))
    rf_correct = sum(1 for e in evaluations if e.get("red_flag_correct"))
    pii_ok = sum(1 for e in evaluations if e.get("pii_scrubbed"))
    no_hallucination = sum(1 for e in evaluations if e.get("hallucination_free"))

    times = [r.get("time_ms", 0) for r in results if not r.get("error")]
    avg_time = sum(times) / len(times) if times else 0
    total_time = sum(times)

    print(f"\n{'='*60}")
    print(f"RESULTS SUMMARY — {mode.upper()} Mode")
    print(f"{'='*60}")
    print(f"Total notes:          {total}")
    print(f"Successful:           {successful}")
    print(f"Errors:               {errors}")
    print(f"")
    print(f"Traffic Light Accuracy: {tl_correct}/{successful} ({tl_correct/successful*100:.1f}%)" if successful else "N/A")
    print(f"Red Flag Detection:     {rf_correct}/{successful} ({rf_correct/successful*100:.1f}%)" if successful else "N/A")
    print(f"PII Scrubbing:          {pii_ok}/{successful} ({pii_ok/successful*100:.1f}%)" if successful else "N/A")
    print(f"Hallucination-Free:     {no_hallucination}/{successful} ({no_hallucination/successful*100:.1f}%)" if successful else "N/A")
    print(f"")
    print(f"Avg processing time:  {avg_time:.0f}ms")
    print(f"Total processing time: {total_time/1000:.1f}s")
    print(f"{'='*60}\n")

    return {
        "mode": mode,
        "total": total,
        "successful": successful,
        "errors": errors,
        "traffic_light_accuracy": tl_correct / successful * 100 if successful else 0,
        "red_flag_accuracy": rf_correct / successful * 100 if successful else 0,
        "pii_accuracy": pii_ok / successful * 100 if successful else 0,
        "hallucination_free_pct": no_hallucination / successful * 100 if successful else 0,
        "avg_time_ms": avg_time,
        "total_time_s": total_time / 1000,
    }


def save_results(all_results, all_evaluations, all_notes, summaries):
    """Save detailed results to JSON"""
    output = {
        "test_date": datetime.now().isoformat(),
        "model": MODEL,
        "summaries": summaries,
        "detailed_results": [],
    }

    for results, evaluations, notes, mode in all_results:
        for result, evaluation, note in zip(results, evaluations, notes):
            output["detailed_results"].append({
                "note_id": note["id"],
                "mode": mode,
                "raw_text": note["raw_text"],
                "expected_traffic_light": note["expected_traffic_light"],
                "expected_red_flag_count": note["expected_red_flag_count"],
                "expected_notes": note["notes"],
                "actual_traffic_light": result.get("traffic_light", "ERROR"),
                "actual_red_flag_count": result.get("red_flag_count", 0),
                "red_flags": result.get("red_flags", []),
                "pii_count": result.get("pii_count", 0),
                "pii_items": [(cat, val) for cat, val in result.get("pii_items", [])],
                "pillar_scores": result.get("pillar_scores", []),
                "hallucination_check": result.get("hallucination_check"),
                "hallucination_details": result.get("hallucination_details", ""),
                "audit_notes": result.get("audit_notes", ""),
                "rewritten_note": result.get("rewritten_note", ""),
                "time_ms": result.get("time_ms", 0),
                "error": result.get("error"),
                "evaluation": evaluation,
            })

    output_path = os.path.join(os.path.dirname(__file__), "..", "testing", "test_results_50.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2, default=str)
    print(f"Detailed results saved to {output_path}")
    return output_path


if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "both"
    max_notes = int(sys.argv[2]) if len(sys.argv) > 2 else 50

    all_results_data = []
    summaries = []

    if mode_arg in ("standard", "both"):
        std_results, std_evals, std_notes = run_tests("standard", max_notes)
        std_summary = print_summary(std_evals, std_results, "standard")
        summaries.append(std_summary)
        all_results_data.append((std_results, std_evals, std_notes, "standard"))

    if mode_arg in ("turbo", "both"):
        turbo_results, turbo_evals, turbo_notes = run_tests("turbo", max_notes)
        turbo_summary = print_summary(turbo_evals, turbo_results, "turbo")
        summaries.append(turbo_summary)
        all_results_data.append((turbo_results, turbo_evals, turbo_notes, "turbo"))

    save_results(all_results_data, [], [], summaries)
    print("\nAll tests complete!")
