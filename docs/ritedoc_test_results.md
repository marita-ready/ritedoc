# RiteDoc AI Agent Prompt Test Results

**Date:** 2026-04-01 07:06:51  
**Model:** gpt-4.1-mini  
**Tests:** 5  

## Summary: 5/5 tests passed

| Test | Description | Traffic Light | Red Flags | PII Scrub | Hallucination | Overall |
|------|-------------|---------------|-----------|-----------|---------------|--------|
| test_001 | Good note — has goal reference, participant voice, | PASS (exp: GREEN, got: GREEN) | PASS (exp: 0, got: 0) | PASS | PASS | PASS |
| test_002 | Poor note — missing date, time, goal, participant  | PASS (exp: ORANGE, got: ORANGE) | PASS (exp: 0, got: 0) | PASS | PASS | PASS |
| test_003 | Red flag — medication error (wrong dose) | PASS (exp: RED, got: RED) | PASS (exp: 1, got: 1) | PASS | PASS | PASS |
| test_004 | Good note — strong participant voice, goal linkage | PASS (exp: GREEN, got: GREEN) | PASS (exp: 0, got: 0) | PASS | PASS | PASS |
| test_005 | Red flags — behavioural incident (throwing cup, ag | PASS (exp: RED, got: RED) | PASS (exp: 2, got: 2) | PASS | PASS | PASS |

---

## Test 1: Good note — has goal reference, participant voice, measurable outcomes

**Participant:** Margaret Kennedy  
**Expected Traffic Light:** GREEN  
**Actual Traffic Light:** GREEN  
**Expected Red Flags:** 0  
**Actual Red Flags:** 0  

### Raw Note

> Went to Margs place this morning for her usual session. Helped her with breakfast - she made toast and eggs mostly by herself, I just helped with the stove. Then we did some cleaning, vacuumed the lounge and she wiped down the kitchen. She said she wants to keep doing this every week cos she feels more confident. Goal 2 daily living. No issues.

### Scrubbed Note

> Went to [Participant] place this morning for her usual session. Helped her with breakfast - she made toast and eggs mostly by herself, I just helped with the stove. Then we did some cleaning, vacuumed the lounge and she wiped down the kitchen. She said she wants to keep doing this every week cos she feels more confident. Goal 2 daily living. No issues.

### PII Mappings

| Original | Tag | Category |
|----------|-----|----------|
| Margs | [Participant] | participant_nickname |

### Agent 1 Output: Rewritten Note

Date: 17 March 2026
Time: 9:00 AM
Duration: 2 hours
Participant Code: MK-817
Support Worker Code: SJ-068

Support was provided at the participant's residence during the scheduled session. Assistance was given with breakfast preparation; the participant independently prepared toast and eggs, with support provided only for stove use. Following breakfast, the participant engaged in household cleaning activities, including vacuuming the lounge and wiping down the kitchen surfaces. The participant expressed a desire to continue these weekly activities as they contribute to increased confidence. This session supported Goal 2: Daily Living Skills. No incidents, medication events, or safety concerns were observed or reported during this session.

### Agent 2 Output: Audit Scores

**Hallucination Check:** PASS  
**Traffic Light:** GREEN  

| Pillar | Score | Met | Feedback |
|--------|-------|-----|----------|
| Goal Linkage | 2/3 | Yes | Specific goal referenced as 'Goal 2 daily living' from the original note, though |
| Participant Voice | 2/3 | Yes | Participant's preference documented ('wants to keep doing this every week') but  |
| Measurable Outcomes | 2/3 | Yes | Specific observable outcomes described (participant made toast and eggs mostly i |
| Support Delivered | 2/3 | Yes | Clear description of support activities (help with stove, assistance during brea |
| Risk & Safety | 2/3 | Yes | Specific safety statement confirming no incidents or medication events during th |

**Audit Notes:** The rewritten note accurately reflects the original raw note and metadata with no hallucinations. It references a specific goal, captures participant preferences, describes measurable outcomes and support delivered, and includes a specific safety statement. All pillars score 2 or above, and no red flags were detected, resulting in a green traffic light.

### Final Note (PII Restored)

Date: 17 March 2026
Time: 9:00 AM
Duration: 2 hours
Participant Code: MK-817
Support Worker Code: SJ-068

Support was provided at the participant's residence during the scheduled session. Assistance was given with breakfast preparation; the participant independently prepared toast and eggs, with support provided only for stove use. Following breakfast, the participant engaged in household cleaning activities, including vacuuming the lounge and wiping down the kitchen surfaces. The participant expressed a desire to continue these weekly activities as they contribute to increased confidence. This session supported Goal 2: Daily Living Skills. No incidents, medication events, or safety concerns were observed or reported during this session.

---

## Test 2: Poor note — missing date, time, goal, participant voice, measurable outcomes

**Participant:** David Chen  
**Expected Traffic Light:** ORANGE  
**Actual Traffic Light:** ORANGE  
**Expected Red Flags:** 0  
**Actual Red Flags:** 0  

### Raw Note

> Took David to the shops. He picked out some groceries. Went ok.

### Scrubbed Note

> Took [Participant] to the shops. He picked out some groceries. Went ok.

### PII Mappings

| Original | Tag | Category |
|----------|-----|----------|
| David | [Participant] | participant_name |

### Agent 1 Output: Rewritten Note

[DATE REQUIRED — date of the session is needed] [TIME REQUIRED — time of the session is needed] [DURATION REQUIRED — duration of the session is needed]
Participant DC-596 was accompanied to the shops by support worker MT-192. The participant selected groceries independently during the outing. The session proceeded without incident.
Participant feedback and measurable outcomes were not documented. [PARTICIPANT VOICE REQUIRED — participant's response or feedback during the session is needed] [MEASURABLE OUTCOMES REQUIRED — specific outcomes related to participant goals are needed] [GOAL LINKAGE REQUIRED — connection to participant's goals should be included]
No incidents, medication events, or safety concerns were observed or reported during this session.

### Missing Data

- **Date**: Date of the session is required for audit and record-keeping purposes.  
  Placeholder: `[DATE REQUIRED — date of the session is needed]`  

- **Time**: Time of the session is required for accurate documentation.  
  Placeholder: `[TIME REQUIRED — time of the session is needed]`  

- **Duration**: Duration of the session is needed to understand the length of support provided.  
  Placeholder: `[DURATION REQUIRED — duration of the session is needed]`  

- **Participant Voice**: Participant's response or feedback during the session is necessary to reflect engagement and experience.  
  Placeholder: `[PARTICIPANT VOICE REQUIRED — participant's response or feedback during the session is needed]`  

- **Measurable Outcomes**: Specific outcomes related to participant goals are needed to evaluate progress.  
  Placeholder: `[MEASURABLE OUTCOMES REQUIRED — specific outcomes related to participant goals are needed]`  

- **Goal Linkage**: Linking the support provided to participant goals is essential for audit and planning.  
  Placeholder: `[GOAL LINKAGE REQUIRED — connection to participant's goals should be included]`  

### Agent 2 Output: Audit Scores

**Hallucination Check:** PASS  
**Traffic Light:** ORANGE  

| Pillar | Score | Met | Feedback |
|--------|-------|-----|----------|
| Goal Linkage | 0/3 | No | No reference to any participant goal or goal area is made in the rewritten note. |
| Participant Voice | 0/3 | No | No participant perspective, preferences, or direct quotes are documented. |
| Measurable Outcomes | 1/3 | No | General statement that the session proceeded without incident is present but no  |
| Support Delivered | 2/3 | Yes | Clear description that participant was accompanied to the shops and selected gro |
| Risk & Safety | 2/3 | Yes | Specific statement confirming no incidents, medication events, or safety concern |

**Audit Notes:** The rewritten note contains no hallucinations and accurately reflects the original raw note and metadata. However, it lacks any linkage to participant goals and does not capture participant voice or detailed measurable outcomes. Support delivered and risk & safety are adequately described. Missing critical information such as date, time, and duration, and the absence of participant voice and goal linkage result in an ORANGE rating.

### Final Note (PII Restored)

[DATE REQUIRED — date of the session is needed] [TIME REQUIRED — time of the session is needed] [DURATION REQUIRED — duration of the session is needed]
Participant DC-596 was accompanied to the shops by support worker MT-192. The participant selected groceries independently during the outing. The session proceeded without incident.
Participant feedback and measurable outcomes were not documented. [PARTICIPANT VOICE REQUIRED — participant's response or feedback during the session is needed] [MEASURABLE OUTCOMES REQUIRED — specific outcomes related to participant goals are needed] [GOAL LINKAGE REQUIRED — connection to participant's goals should be included]
No incidents, medication events, or safety concerns were observed or reported during this session.

---

## Test 3: Red flag — medication error (wrong dose)

**Participant:** Patricia Lam  
**Expected Traffic Light:** RED  
**Actual Traffic Light:** RED  
**Expected Red Flags:** 1  
**Actual Red Flags:** 1  

### Raw Note

> Evening shift with Patricia. Was giving her meds and realised I gave her the wrong dose of her blood pressure tablet - gave her 10mg instead of 5mg. Noticed straight away after she took it. Called the on-call nurse Aunty Rose who said to monitor her for 2 hours. Patricia seemed fine, no adverse effects. Stayed extra time to monitor. Reported to supervisor Dr Smith on phone 0412 345 678.

### Scrubbed Note

> Evening shift with [Participant]. Was giving her meds and realised I gave her the wrong dose of her blood pressure tablet - gave her 10mg instead of 5mg. Noticed straight away after she took it. Called the on-call nurse [Associate] said to monitor her for 2 hours. [Participant] seemed fine, no adverse effects. Stayed extra time to monitor. Reported to supervisor [Associate] phone [Phone].

### PII Mappings

| Original | Tag | Category |
|----------|-----|----------|
| Patricia | [Participant] | participant_name |
| Aunty Rose who | [Associate] | associate_name |
| Dr Smith on | [Associate] | associate_name |
| 0412 345 678 | [Phone] | phone |

### Agent 1 Output: Rewritten Note

Date: 18 March 2026
Time: 6:30 PM
Duration: 1 hour

Support was provided to participant PL-160 during the evening shift. The support worker JW-466 administered medication but identified an error in dosage: the participant received 10mg of her blood pressure tablet instead of the prescribed 5mg. Upon recognizing the error immediately after administration, the support worker contacted the on-call nurse, Associate, and followed instructions to monitor the participant for two hours. The participant reportedly showed no adverse effects during this period. The support worker extended the monitoring time accordingly and reported the incident to the supervisor, Associate, via phone.

Participant response: The participant appeared stable and did not exhibit any negative reactions to the incorrect medication dose.

Measurable outcomes: The participant remained stable with no adverse effects observed during the monitoring period following the medication error.

Goal linkage: [GOAL LINKAGE REQUIRED — connection to participant's medication management or health goals]

Safety statement: A medication administration error occurred; however, the participant was monitored closely with no adverse effects noted. The incident was reported to appropriate clinical staff and supervisor. No further safety concerns were observed during this session.

### Red Flags Detected

- **Medication Error / Missed Medication**: A medication dosage error occurred when the participant was given double the prescribed dose of a blood pressure tablet.  
  Keywords: gave her the wrong dose of her blood pressure tablet - gave her 10mg instead of 5mg  

### Missing Data

- **Goal linkage**: To demonstrate how this support session relates to the participant's NDIS goals, particularly regarding medication management or health maintenance.  
  Placeholder: `[GOAL LINKAGE REQUIRED — connection to participant's medication management or health goals]`  

### Agent 2 Output: Audit Scores

**Hallucination Check:** PASS  
**Traffic Light:** RED  

| Pillar | Score | Met | Feedback |
|--------|-------|-----|----------|
| Goal Linkage | 0/3 | No | No specific or vague reference to any NDIS plan goal or goal area was made; the  |
| Participant Voice | 1/3 | No | The participant's condition was described by the worker's observation ('appeared |
| Measurable Outcomes | 2/3 | Yes | Specific observable outcomes were described, including the participant showing n |
| Support Delivered | 2/3 | Yes | Clear description of support activities including medication administration, err |
| Risk & Safety | 3/3 | Yes | Comprehensive safety assessment covering the medication error, monitoring period |

**Audit Notes:** The rewritten note accurately reflects the original raw note and metadata with no hallucinations. However, a critical red flag was detected due to the medication dosage error, which mandates a RED traffic light. The note lacks goal linkage and participant voice is minimal, but safety and support delivery are well documented.

### Final Note (PII Restored)

Date: 18 March 2026
Time: 6:30 PM
Duration: 1 hour

Support was provided to participant PL-160 during the evening shift. The support worker JW-466 administered medication but identified an error in dosage: the participant received 10mg of her blood pressure tablet instead of the prescribed 5mg. Upon recognizing the error immediately after administration, the support worker contacted the on-call nurse, Associate, and followed instructions to monitor the participant for two hours. The participant reportedly showed no adverse effects during this period. The support worker extended the monitoring time accordingly and reported the incident to the supervisor, Associate, via phone.

Participant response: The participant appeared stable and did not exhibit any negative reactions to the incorrect medication dose.

Measurable outcomes: The participant remained stable with no adverse effects observed during the monitoring period following the medication error.

Goal linkage: [GOAL LINKAGE REQUIRED — connection to participant's medication management or health goals]

Safety statement: A medication administration error occurred; however, the participant was monitored closely with no adverse effects noted. The incident was reported to appropriate clinical staff and supervisor. No further safety concerns were observed during this session.

---

## Test 4: Good note — strong participant voice, goal linkage, measurable outcomes

**Participant:** Thomas Nguyen  
**Expected Traffic Light:** GREEN  
**Actual Traffic Light:** GREEN  
**Expected Red Flags:** 0  
**Actual Red Flags:** 0  

### Raw Note

> Community access with Thomas today. Went to the community garden at 42 Smith Street Footscray. He was really into it - planted some tomatoes and talked to the other gardeners. He asked if we could come back next week. Working on Goal 1 community connections. Thomas said he enjoyed meeting new people and wants to join the Wednesday group too. No safety concerns.

### Scrubbed Note

> Community access with [Participant] today. Went to the community garden at [Location]. He was really into it - planted some tomatoes and talked to the other gardeners. He asked if we could come back next week. Working on Goal 1 community connections. [Participant] said he enjoyed meeting new people and wants to join the Wednesday group too. No safety concerns.

### PII Mappings

| Original | Tag | Category |
|----------|-----|----------|
| Thomas | [Participant] | participant_name |
| 42 Smith Street | [Location] | address |
| Footscray | [Location] | suburb |

### Agent 1 Output: Rewritten Note

Date: 19 March 2026
Time: 2:00 PM
Duration: 2.5 hours

Support was provided to participant TN-466 to facilitate community access. The session took place at a community garden located at [Location]. The participant engaged in planting tomatoes and interacted positively with other gardeners. The participant expressed enjoyment in the activity and requested to return the following week. This support session was linked to Goal 1: Community Connections. The participant reported that they enjoyed meeting new people and expressed interest in joining the Wednesday group as well. No incidents, medication events, or safety concerns were observed or reported during this session.

### Missing Data

- **Location**: The specific location of the community garden is needed for audit and safety documentation.  
  Placeholder: `[LOCATION REQUIRED — specify the community garden location]`  

### Agent 2 Output: Audit Scores

**Hallucination Check:** PASS  
**Traffic Light:** GREEN  

| Pillar | Score | Met | Feedback |
|--------|-------|-----|----------|
| Goal Linkage | 3/3 | Yes | The note specifically references 'Goal 1: Community Connections' as linked to th |
| Participant Voice | 3/3 | Yes | Direct quotes and participant expressions are documented, such as enjoyment and  |
| Measurable Outcomes | 2/3 | Yes | Specific observable outcomes are described, including planting tomatoes and inte |
| Support Delivered | 2/3 | Yes | Clear description of support activities is provided, including community access  |
| Risk & Safety | 2/3 | Yes | Specific safety statement confirms no incidents, medication events, or safety co |

**Audit Notes:** The rewritten note accurately reflects the original raw note and metadata with no hallucinations detected. It clearly links the session to a specific NDIS goal, includes participant voice with direct quotes, describes specific outcomes and support activities, and provides a specific safety statement. All pillars score 2 or above, and no red flags are present, resulting in a GREEN traffic light.

### Final Note (PII Restored)

Date: 19 March 2026
Time: 2:00 PM
Duration: 2.5 hours

Support was provided to participant TN-466 to facilitate community access. The session took place at a community garden located at 42 Smith Street. The participant engaged in planting tomatoes and interacted positively with other gardeners. The participant expressed enjoyment in the activity and requested to return the following week. This support session was linked to Goal 1: Community Connections. The participant reported that they enjoyed meeting new people and expressed interest in joining the Wednesday group as well. No incidents, medication events, or safety concerns were observed or reported during this session.

---

## Test 5: Red flags — behavioural incident (throwing cup, aggression) AND abuse/neglect indicators (unexplained bruise, named perpetrator)

**Participant:** Sandra Reeves  
**Expected Traffic Light:** RED  
**Actual Traffic Light:** RED  
**Expected Red Flags:** 2  
**Actual Red Flags:** 2  

### Raw Note

> Morning session with Sandra. She was very agitated when I arrived and refused to do her morning routine. She started yelling and threw a cup at the wall. I tried to calm her down but she wouldn't listen. Eventually she settled after about 20 mins. We then did some light cleaning together. She didn't want to talk much after that. I noticed a bruise on her arm that wasn't there last visit - she said Uncle Jim did it. I'm concerned about this. Reported to my coordinator.

### Scrubbed Note

> Morning session with [Participant]. She was very agitated when I arrived and refused to do her morning routine. She started yelling and threw a cup at the wall. I tried to calm her down but she wouldn't listen. Eventually she settled after about 20 mins. We then did some light cleaning together. She didn't want to talk much after that. I noticed a bruise on her arm that wasn't there last visit - she said [Associate] it. I'm concerned about this. Reported to my coordinator.

### PII Mappings

| Original | Tag | Category |
|----------|-----|----------|
| Sandra | [Participant] | participant_name |
| Uncle Jim did | [Associate] | associate_name |

### Agent 1 Output: Rewritten Note

Date: 20 March 2026
Time: 10:00 AM
Duration: 3 hours
Participant Code: SR-873
Support Worker Code: KM-076

Support was provided to the participant during a morning session. Upon arrival, the participant was observed to be very agitated and refused to engage in her morning routine. The participant exhibited verbal agitation by yelling and demonstrated physical agitation by throwing a cup at the wall. The support worker attempted to de-escalate the participant's distress, which took approximately 20 minutes before the participant settled. Following this, the participant and support worker completed light cleaning tasks together. The participant was minimally communicative after the incident.

The participant's voice was limited; however, she acknowledged the presence of a bruise on her arm, which was not present during the previous visit. The participant attributed the bruise to an individual identified as [Associate]. The support worker expressed concern regarding this injury and reported the matter to their coordinator.

Measurable outcomes include the participant's eventual de-escalation and participation in light cleaning activities. Goal linkage is [GOAL LINKAGE REQUIRED — specify which NDIS goals this session supports].

Safety statement: The participant sustained a bruise of unknown cause that was reported to the support worker and escalated to the coordinator for further action. No other incidents, medication events, or safety concerns were observed or reported during this session.

### Red Flags Detected

- **Abuse / Neglect / Exploitation indicators**: A new bruise was observed on the participant's arm, and the participant indicated it was caused by an associate, raising concerns about potential abuse.  
  Keywords: I noticed a bruise on her arm that wasn't there last visit - she said [Associate] it, I'm concerned about this  

- **Behavioural Incident requiring reporting**: The participant exhibited significant agitation, yelling, and threw a cup at the wall, requiring de-escalation efforts.  
  Keywords: She was very agitated, started yelling, threw a cup at the wall, I tried to calm her down  

### Missing Data

- **Goal linkage**: Linkage to specific NDIS goals is required to demonstrate how the support session contributes to the participant's plan.  
  Placeholder: `[GOAL LINKAGE REQUIRED — specify which NDIS goals this session supports]`  

### Agent 2 Output: Audit Scores

**Hallucination Check:** PASS  
**Traffic Light:** RED  

| Pillar | Score | Met | Feedback |
|--------|-------|-----|----------|
| Goal Linkage | 0/3 | No | No specific NDIS plan goal is referenced; the note includes a placeholder for go |
| Participant Voice | 2/3 | Yes | Participant's perspective is documented through her acknowledgment of the bruise |
| Measurable Outcomes | 2/3 | Yes | Specific observable outcomes are described, including participant's de-escalatio |
| Support Delivered | 2/3 | Yes | Clear description of support activities such as de-escalation efforts and assist |
| Risk & Safety | 3/3 | Yes | Comprehensive safety assessment including observation of a new bruise, participa |

**Audit Notes:** The rewritten note accurately reflects the original raw note and metadata with no hallucinations. It documents participant agitation, the behavioral incident, and the discovery of a new bruise attributed to an associate, which are serious red flags requiring reporting. The note lacks specific goal linkage, but participant voice, measurable outcomes, support delivered, and risk & safety are adequately documented. Due to the presence of red flags related to potential abuse and behavioral incidents, the overall traffic light status is RED, indicating urgent attention is needed.

### Final Note (PII Restored)

Date: 20 March 2026
Time: 10:00 AM
Duration: 3 hours
Participant Code: SR-873
Support Worker Code: KM-076

Support was provided to the participant during a morning session. Upon arrival, the participant was observed to be very agitated and refused to engage in her morning routine. The participant exhibited verbal agitation by yelling and demonstrated physical agitation by throwing a cup at the wall. The support worker attempted to de-escalate the participant's distress, which took approximately 20 minutes before the participant settled. Following this, the participant and support worker completed light cleaning tasks together. The participant was minimally communicative after the incident.

The participant's voice was limited; however, she acknowledged the presence of a bruise on her arm, which was not present during the previous visit. The participant attributed the bruise to an individual identified as Uncle Jim did. The support worker expressed concern regarding this injury and reported the matter to their coordinator.

Measurable outcomes include the participant's eventual de-escalation and participation in light cleaning activities. Goal linkage is [GOAL LINKAGE REQUIRED — specify which NDIS goals this session supports].

Safety statement: The participant sustained a bruise of unknown cause that was reported to the support worker and escalated to the coordinator for further action. No other incidents, medication events, or safety concerns were observed or reported during this session.

---

