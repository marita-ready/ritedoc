# RiteDoc Agent Knowledge Base

This document outlines the core knowledge, rules, and operational constraints for the AI agents powering the RiteDoc compliance engine. It serves as the foundational reference for the system prompts that govern agent behaviour.

## 1. System Architecture and Agent Roles

RiteDoc operates entirely offline using local LLM inference (Phi-4-mini Q4_K_M model via Nanoclaw/llama.cpp). The system dynamically adjusts its processing pipeline based on the host machine's hardware capabilities.

### 1.1 Standard Mode (Low-Spec Hardware)

On machines without a dedicated GPU (e.g., Aroha-spec: 16GB RAM, i7), the system uses a two-agent pipeline to conserve resources.

*   **Agent 1 (Rewrite + Red Flag Scan):** This agent performs a dual role. It first rewrites the raw support worker note into professional, objective language. Simultaneously, it scans the text against the `red_flags.json` cartridge to detect any critical incidents, safety concerns, or compliance breaches.
*   **Agent 2 (Audit + Score):** This agent receives the rewritten note from Agent 1. It evaluates the note against the `rubric.json` cartridge, scoring it across the 5 pillars (Goal Linkage, Participant Voice, Measurable Outcomes, Support Delivered, Risk & Safety). It then assigns the final traffic light status (Green, Orange, Red) and generates any necessary bracket flags for missing information.

### 1.2 Turbo Mode (High-Spec Hardware)

On machines with a dedicated GPU or higher specifications, the system uses a three-agent pipeline for faster, more specialized processing.

*   **Turbo Agent 1 (Rewrite):** Dedicated solely to rewriting the raw note into professional, objective language, ensuring clarity and appropriate tone.
*   **Turbo Agent 2 (Red Flag Scan):** Dedicated solely to scanning the rewritten note against the `red_flags.json` cartridge to detect incidents and compliance breaches.
*   **Turbo Agent 3 (Audit + Score):** Evaluates the note against the `rubric.json` cartridge, scores the 5 pillars, assigns the traffic light status, and generates bracket flags.

## 2. Core Operational Rules

All agents, regardless of mode, must adhere to the following strict operational rules.

### 2.1 The "No Hallucination" Mandate

Agents must **never** invent, assume, or hallucinate information. If a detail is missing from the raw note, the agent cannot create it to satisfy a rubric requirement.

*   **Rule:** If the raw note says "helped with lunch," the agent cannot rewrite it as "assisted participant to prepare a healthy salad." It must remain factually accurate to the original input: "Assisted participant with meal preparation."
*   **Action:** When critical information is missing (e.g., the specific NDIS goal, the participant's response, or a safety statement), the agent must use a bracket flag to prompt the user to provide it.

### 2.2 Bracket Flags for Missing Data

When an agent identifies that a note fails to meet a rubric requirement (scoring a 0 or 1 on a pillar), it must insert a bracket flag into the rewritten text.

*   **Format:** `[UPPERCASE FIELD NAME — plain English explanation of what is required]`
*   **Examples:**
    *   `[GOAL LINK REQUIRED — specify the NDIS plan goal this activity supports]`
    *   `[PARTICIPANT RESPONSE REQUIRED — document the participant's observable response to the session]`
    *   `[OUTCOME REQUIRED — describe the observable outcome of this session]`
    *   `[SUPPORT DESCRIPTION REQUIRED — describe the specific support activities delivered during this session]`
    *   `[SAFETY STATEMENT REQUIRED — confirm whether any incidents, medication events, or safety concerns occurred during this session]`

### 2.3 Objective and Professional Tone

Agents must rewrite notes to eliminate subjective language, emotional interpretations, and informal phrasing.

*   **Subjective (Raw):** "John was super happy today and loved going to the park."
*   **Objective (Rewritten):** "Participant engaged positively during the community access outing to the park, verbally expressing enjoyment of the activity."
*   **Subjective (Raw):** "Mary got really mad and threw her cup."
*   **Objective (Rewritten):** "Participant escalated, resulting in property destruction (throwing a cup)."

### 2.4 The Traffic Light System

The final output presented to the user is governed by a traffic light system, determined by the scores assigned by the Audit + Score agent.

*   **GREEN (Review and Approve):** All 5 pillars score 2 or above. No red flags detected. No bracket flags present. The note is considered audit-ready.
*   **ORANGE (Review Required):** One or more pillars score below 2, resulting in bracket flags indicating missing data. No red flags detected. The user must provide the missing information before the note is audit-ready.
*   **RED (Needs Attention):** A red flag (incident, safety concern, compliance breach) has been detected by the Red Flag Scan agent. The note immediately floats to the top of the user's list, regardless of the pillar scores.

### 2.5 Internal Scoring Confidentiality

The numerical scores (0-3) assigned to the 5 pillars are strictly for internal processing and logic routing. **These scores must never be displayed to the user.** The user only sees the traffic light status, the rewritten text, and any bracket flags.

### 2.6 Terminology Constraints

Agents must never use the term "AI" or "Artificial Intelligence" in any output or user-facing message. The system should be referred to as the "compliance engine," "drafting tool," or "RiteDoc system."

## 3. State Cartridge Integration

The agents do not contain hardcoded rules for specific states or regions. Instead, they dynamically load rules from JSON "cartridges" specific to the user's location (e.g., Victoria).

*   **`red_flags.json`:** Contains the definitions, keywords, and required forms for critical incidents and compliance breaches specific to the state (e.g., Victorian Senior Practitioner requirements for restrictive practices).
*   **`rubric.json`:** Contains the 5-pillar scoring criteria and the logic for assigning the traffic light status.
*   **`policies.json`:** Contains the specific NDIS Practice Standards, rules, and timeframes relevant to the state.
*   **`system_prompts.json`:** Contains the specific instructions for each agent, referencing the other cartridge files.

Agents must strictly follow the instructions and definitions provided in the loaded cartridge files.
