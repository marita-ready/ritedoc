//! Pre-loaded NDIS service type cartridge configurations.
//!
//! Each cartridge contains production-ready compliance rules, required fields,
//! format templates, tone guidelines, prohibited terms, and example outputs
//! based on the NDIS Practice Standards and Quality Indicators.
//!
//! This module is called once during database initialisation to seed the
//! cartridges table if it is empty.

use crate::db::Database;

// ─────────────────────────────────────────────
//  Public seed function
// ─────────────────────────────────────────────

/// Seed the cartridges table with the 8 default NDIS service type cartridges.
/// This is a no-op if cartridges already exist.
pub fn seed_default_cartridges(db: &Database) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM cartridges", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Ok(()); // Already seeded
    }

    for c in DEFAULT_CARTRIDGES.iter() {
        conn.execute(
            "INSERT INTO cartridges (name, service_type, description, config_json, is_active) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![c.name, c.service_type, c.description, c.config_json, 1i32],
        )
        .map_err(|e| format!("Failed to seed cartridge '{}': {}", c.name, e))?;
    }

    Ok(())
}

// ─────────────────────────────────────────────
//  Cartridge seed data
// ─────────────────────────────────────────────

struct CartridgeSeed {
    name: &'static str,
    service_type: &'static str,
    description: &'static str,
    config_json: &'static str,
}

static DEFAULT_CARTRIDGES: &[CartridgeSeed] = &[
    // ── 1. Daily Living (SIL/SDA) ──────────────────────────────────────────
    CartridgeSeed {
        name: "Daily Living (SIL/SDA)",
        service_type: "daily_living_sil",
        description: "Supported Independent Living and Specialist Disability Accommodation shift notes and daily living support documentation",
        config_json: r#"{
  "service_type": "Daily Living (SIL/SDA)",
  "compliance_rules": [
    "Note must reference the participant's NDIS plan goals and how the support provided aligns with those goals (NDIS Practice Standard 1.1)",
    "All personal care and daily living supports must be documented with the level of assistance provided (e.g., verbal prompt, physical assist, independent)",
    "Any changes in the participant's condition, mood, or behaviour must be documented objectively",
    "Medication administration must be recorded separately in the medication register; progress notes must reference any medication-related observations only",
    "Any incident, near-miss, or restrictive practice must be documented and cross-referenced with the incident reporting system",
    "Notes must use person-centred language that reflects the participant's strengths and choices",
    "Support must be documented in the context of building or maintaining the participant's independence and capacity",
    "Shift handover information must be clearly communicated and documented",
    "Any refusal of support must be documented respectfully, including the participant's stated reason where known",
    "Notes must be completed within 24 hours of the support being delivered (NDIS Quality and Safeguards Commission requirement)"
  ],
  "required_fields": [
    "Date and time of support",
    "Support worker name and role",
    "Participant name (or identifier)",
    "NDIS goals addressed during this support",
    "Activities undertaken and level of assistance provided",
    "Participant's mood, engagement, and wellbeing observations",
    "Any incidents, behaviours of concern, or health changes",
    "Outcomes observed or progress toward goals",
    "Any follow-up actions required",
    "Handover notes (if applicable)"
  ],
  "format_template": "DATE/TIME: [Date and shift time]\nSUPPORT WORKER: [Name, Role]\nPARTICIPANT: [Name/Identifier]\n\nSUPPORT PROVIDED:\n[Describe activities and level of assistance — use objective, measurable language]\n\nGOALS ADDRESSED:\n[Reference specific NDIS plan goals and how today's support contributed]\n\nPARTICIPANT WELLBEING:\n[Objective observations about mood, engagement, health, and communication]\n\nOUTCOMES / PROGRESS:\n[Observed outcomes, skill development, or maintenance of independence]\n\nINCIDENTS / CONCERNS:\n[Any incidents, near-misses, behaviour observations, or health changes — or 'Nil to report']\n\nFOLLOW-UP ACTIONS:\n[Any actions required by next shift, team leader, or allied health — or 'Nil required']\n\nHANDOVER NOTES:\n[Key information for incoming support worker — or 'Nil']",
  "tone_guidelines": [
    "Use person-centred, strengths-based language (e.g., 'John chose to...' not 'John was made to...')",
    "Write in third person, past tense",
    "Use objective, observable language — avoid subjective interpretations",
    "Avoid clinical jargon unless quoting a health professional's advice",
    "Reflect the participant's dignity and autonomy in all descriptions",
    "Use respectful language when documenting refusals or challenging behaviour"
  ],
  "prohibited_terms": [
    "aggressive", "violent", "noncompliant", "refused to cooperate", "manipulative",
    "attention-seeking", "difficult", "challenging behaviour" (replace with specific description),
    "normal", "fine", "good day" (too vague — use specific observations),
    "client" (use participant's name or 'the participant'),
    "suffers from", "afflicted with", "wheelchair-bound", "confined to"
  ],
  "example_output": "DATE/TIME: 14 April 2025, Morning Shift (07:00–14:00)\nSUPPORT WORKER: Sarah M., Support Worker\nPARTICIPANT: James T.\n\nSUPPORT PROVIDED:\nJames completed his morning routine with verbal prompting for sequencing steps. He independently showered and dressed, selecting his own clothing. Support worker provided standby assistance during meal preparation; James prepared his own breakfast (toast and coffee) with minimal guidance. James attended his scheduled community outing to the library, choosing books independently.\n\nGOALS ADDRESSED:\nToday's support addressed James's NDIS goal of 'increasing independence in daily living tasks.' James demonstrated increased confidence in meal preparation, requiring one fewer prompt than the previous shift.\n\nPARTICIPANT WELLBEING:\nJames presented as calm and engaged throughout the shift. He communicated his preferences clearly and expressed enthusiasm about the library visit. No signs of distress or health concerns observed.\n\nOUTCOMES / PROGRESS:\nJames successfully completed his morning routine with reduced prompting, indicating progress toward his independence goal. He selected and borrowed two books independently at the library.\n\nINCIDENTS / CONCERNS:\nNil to report.\n\nFOLLOW-UP ACTIONS:\nPlease ensure James's library books are returned by 28 April 2025.\n\nHANDOVER NOTES:\nJames mentioned he would like to cook dinner tonight. Please support him to do so with minimal assistance as per his support plan."
}"#,
    },

    // ── 2. Community Participation ─────────────────────────────────────────
    CartridgeSeed {
        name: "Community Participation",
        service_type: "community_participation",
        description: "Support for social and community engagement, recreational activities, and building community connections",
        config_json: r#"{
  "service_type": "Community Participation",
  "compliance_rules": [
    "Notes must document the specific community activity and the participant's active involvement and choices made (NDIS Practice Standard 2.1)",
    "Documentation must reflect how the activity supports the participant's social inclusion and community connection goals",
    "Any barriers to participation encountered must be documented along with strategies used",
    "Notes must capture the participant's expressed preferences and decisions regarding the activity",
    "Social interactions and relationship-building opportunities must be documented",
    "Any safety considerations or risk management strategies applied during community access must be noted",
    "Transport arrangements and any transport-related observations must be documented",
    "Notes must reflect how the support builds the participant's capacity for future independent community access",
    "Cultural and linguistic considerations must be respected and documented where relevant",
    "Notes must be completed within 24 hours of the support being delivered"
  ],
  "required_fields": [
    "Date and time of activity",
    "Support worker name",
    "Participant name or identifier",
    "Activity/venue attended",
    "Participant's choices and decisions during the activity",
    "Social interactions and community connections made",
    "NDIS goals addressed",
    "Participant's engagement level and mood",
    "Any barriers encountered and strategies used",
    "Capacity building outcomes",
    "Safety observations"
  ],
  "format_template": "DATE/TIME: [Date and time]\nSUPPORT WORKER: [Name]\nPARTICIPANT: [Name/Identifier]\nACTIVITY: [Activity name and venue]\n\nPARTICIPATION SUMMARY:\n[Describe the activity and the participant's active involvement and choices]\n\nGOALS ADDRESSED:\n[Reference specific NDIS plan goals and how this activity contributed]\n\nSOCIAL CONNECTIONS:\n[Document interactions with community members, friendships, or new connections]\n\nPARTICIPANT ENGAGEMENT:\n[Objective observations about mood, enthusiasm, and engagement level]\n\nCAPACITY BUILDING:\n[Skills practised, confidence demonstrated, or steps toward greater independence]\n\nBARRIERS / STRATEGIES:\n[Any access barriers encountered and how they were addressed — or 'Nil']\n\nSAFETY OBSERVATIONS:\n[Any safety considerations managed — or 'Nil to report']\n\nFOLLOW-UP:\n[Next steps, upcoming activities, or actions required — or 'Nil']",
  "tone_guidelines": [
    "Emphasise the participant's agency, choices, and active participation",
    "Use language that reflects genuine community inclusion, not supervised outings",
    "Document the participant as a community member, not a service recipient",
    "Highlight social connections and relationships, not just task completion",
    "Use strengths-based language that celebrates participation and effort"
  ],
  "prohibited_terms": [
    "taken to", "brought to" (use 'attended' or 'visited'),
    "behaved well", "was good" (too vague and patronising),
    "client", "consumer" (use participant's name),
    "allowed to", "permitted to" (use 'chose to', 'decided to'),
    "supervised", "monitored" (use 'supported', 'accompanied'),
    "normal outing", "routine trip" (be specific about the activity)
  ],
  "example_output": "DATE/TIME: 14 April 2025, 10:00–14:00\nSUPPORT WORKER: Maria K.\nPARTICIPANT: Aisha R.\nACTIVITY: Weekly art class, Northside Community Centre\n\nPARTICIPATION SUMMARY:\nAisha attended her weekly art class at Northside Community Centre. She chose to work on a watercolour landscape, selecting her own colours and composition independently. Aisha engaged with the class facilitator to ask questions about technique, demonstrating growing confidence in self-advocacy.\n\nGOALS ADDRESSED:\nThis activity addressed Aisha's NDIS goal of 'building social connections and participating in community activities of her choice.' Aisha also worked toward her goal of 'developing creative skills and self-expression.'\n\nSOCIAL CONNECTIONS:\nAisha exchanged contact details with another class participant, Sarah, to arrange a coffee catch-up. She engaged in conversation with three other class members about their artwork.\n\nPARTICIPANT ENGAGEMENT:\nAisha was enthusiastic and focused throughout the two-hour class. She expressed satisfaction with her completed artwork and asked to display it at the centre.\n\nCAPACITY BUILDING:\nAisha independently managed her materials and cleaned up her workspace without prompting, demonstrating increased independence in structured community settings.\n\nBARRIERS / STRATEGIES:\nThe usual parking area was unavailable due to construction. Support worker used the alternative car park two blocks away; Aisha managed the additional walk without difficulty.\n\nSAFETY OBSERVATIONS:\nNil to report.\n\nFOLLOW-UP:\nAisha has requested to attend the centre's photography workshop next month. Please check availability and book in advance."
}"#,
    },

    // ── 3. Therapeutic Supports ────────────────────────────────────────────
    CartridgeSeed {
        name: "Therapeutic Supports",
        service_type: "therapeutic_supports",
        description: "Allied health and therapeutic intervention notes including OT, physiotherapy, speech pathology, psychology, and other therapeutic services",
        config_json: r#"{
  "service_type": "Therapeutic Supports",
  "compliance_rules": [
    "Notes must document the specific therapeutic intervention delivered and the clinical rationale (NDIS Practice Standard 3.1)",
    "Progress toward therapy goals must be measured and documented using objective, observable criteria",
    "Any standardised assessment tools used must be named and results documented",
    "Notes must reference the participant's current therapy plan and how the session aligns with plan goals",
    "Participant consent for the intervention must be documented or referenced",
    "Any modifications to the therapy plan arising from the session must be documented",
    "Home program instructions or recommendations given to the participant or carer must be documented",
    "Referrals to other services or professionals must be documented with rationale",
    "Notes must be completed and signed by the treating clinician within the timeframe specified by the relevant professional registration body",
    "Any contraindications, precautions, or adverse responses must be documented immediately"
  ],
  "required_fields": [
    "Date and duration of session",
    "Clinician name, profession, and registration number",
    "Participant name and NDIS number (or identifier)",
    "Session type (assessment, intervention, review, telehealth)",
    "Therapy goals addressed",
    "Interventions delivered and clinical rationale",
    "Participant's response and engagement",
    "Objective measures of progress",
    "Recommendations and home program",
    "Plan for next session",
    "Any referrals or communications with other team members"
  ],
  "format_template": "DATE: [Date]\nDURATION: [Session length]\nCLINICIAN: [Name, Profession, Registration No.]\nPARTICIPANT: [Name/Identifier]\nSESSION TYPE: [Assessment / Intervention / Review / Telehealth]\n\nTHERAPY GOALS ADDRESSED:\n[List specific therapy plan goals targeted in this session]\n\nINTERVENTIONS DELIVERED:\n[Describe specific techniques, activities, or strategies used and clinical rationale]\n\nPARTICIPANT RESPONSE:\n[Objective observations of engagement, effort, and response to intervention]\n\nPROGRESS MEASURES:\n[Quantifiable or observable progress indicators — baseline vs current performance]\n\nRECOMMENDATIONS / HOME PROGRAM:\n[Instructions for participant, carer, or support worker between sessions]\n\nNEXT SESSION PLAN:\n[Goals and planned interventions for next session]\n\nCOMMUNICATIONS / REFERRALS:\n[Any communications with team members, GP, or referrals made — or 'Nil']",
  "tone_guidelines": [
    "Use clinical, professional language appropriate to the discipline",
    "Document objectively using measurable outcomes where possible",
    "Use person-centred language that respects the participant's expertise in their own experience",
    "Avoid overly technical jargon that would not be understood by the participant or their support network",
    "Document the participant's active role in their therapy, not just passive receipt of treatment"
  ],
  "prohibited_terms": [
    "patient" (use 'participant' or person's name),
    "non-compliant with home program" (document specific barriers instead),
    "failed to", "unable to" (use 'requires further support to', 'is working toward'),
    "chronic", "permanent" (unless clinically confirmed — use 'ongoing' or 'long-standing'),
    "refused treatment" (document specific context and participant's stated reasons)
  ],
  "example_output": "DATE: 14 April 2025\nDURATION: 60 minutes\nCLINICIAN: Dr. Priya S., Occupational Therapist, AHPRA Reg. OCC0012345\nPARTICIPANT: Michael B.\nSESSION TYPE: Intervention\n\nTHERAPY GOALS ADDRESSED:\n1. Improve upper limb strength and coordination for self-care tasks\n2. Develop compensatory strategies for meal preparation\n\nINTERVENTIONS DELIVERED:\nGraded upper limb strengthening exercises using resistance bands (3 sets × 10 repetitions, medium resistance). Practiced compensatory meal preparation strategies using adaptive equipment (dycem mat, angled cutting board). Cognitive rehearsal of task sequencing for breakfast preparation.\n\nPARTICIPANT RESPONSE:\nMichael engaged actively throughout the session. He completed all exercises with good effort and reported mild fatigue in his right hand by the third set. He demonstrated enthusiasm for the adaptive equipment and successfully prepared a sandwich using the new strategies.\n\nPROGRESS MEASURES:\nGrip strength (right): 18kg (baseline 14kg, 4 weeks ago). Michael completed meal preparation task in 12 minutes (baseline 22 minutes). Error rate in task sequencing: 1 (baseline 4).\n\nRECOMMENDATIONS / HOME PROGRAM:\nMichael to complete resistance band exercises twice daily (morning and evening), 3 sets × 10 repetitions. Adaptive equipment to be used for all meal preparation. Support worker to provide verbal prompting only for sequencing — no physical assistance unless requested.\n\nNEXT SESSION PLAN:\nProgress to heavy resistance band. Introduce stovetop cooking with adaptive strategies. Review home program adherence.\n\nCOMMUNICATIONS / REFERRALS:\nEmail sent to Michael's support coordinator regarding adaptive equipment funding request. Copy placed on file."
}"#,
    },

    // ── 4. Behaviour Support ───────────────────────────────────────────────
    CartridgeSeed {
        name: "Behaviour Support",
        service_type: "behaviour_support",
        description: "Behaviour support plan implementation notes, restrictive practice documentation, and incident reporting aligned to the NDIS Behaviour Support Rules",
        config_json: r#"{
  "service_type": "Behaviour Support",
  "compliance_rules": [
    "All behaviours of concern must be documented using objective, observable, and measurable language — no subjective interpretations (NDIS Behaviour Support Rules 2018)",
    "Any use of a regulated restrictive practice must be documented in real time, including the specific practice used, duration, and the behaviour that triggered it",
    "Restrictive practice documentation must reference the authorised behaviour support plan and the specific authorisation",
    "Antecedent-Behaviour-Consequence (ABC) format must be used for all behaviour incident documentation",
    "Post-incident support provided to the participant must be documented",
    "Any injury to the participant or others must be documented and cross-referenced with the incident report",
    "Notes must document the effectiveness of proactive strategies used prior to the behaviour escalating",
    "Any debrief with the participant following an incident must be documented",
    "Patterns or trends in behaviour must be noted to inform behaviour support plan review",
    "All restrictive practice use must be reported to the NDIS Quality and Safeguards Commission within required timeframes"
  ],
  "required_fields": [
    "Date and time of incident/observation",
    "Support worker name",
    "Participant name or identifier",
    "Antecedent: what happened immediately before the behaviour",
    "Behaviour: objective description of what was observed (frequency, duration, intensity)",
    "Consequence: what happened as a result, including support worker response",
    "Restrictive practices used (if any): type, duration, authorisation reference",
    "Proactive strategies attempted",
    "Post-incident support provided",
    "Participant's current state at end of documentation",
    "Follow-up actions required"
  ],
  "format_template": "DATE/TIME: [Date and time of incident]\nSUPPORT WORKER: [Name]\nPARTICIPANT: [Name/Identifier]\n\nANTECEDENT:\n[What was happening immediately before — environment, activity, interactions, triggers]\n\nBEHAVIOUR OBSERVED:\n[Objective description: what was seen/heard, duration, frequency, intensity — NO interpretation]\n\nCONSEQUENCE / SUPPORT WORKER RESPONSE:\n[Immediate response, strategies used, outcome of response]\n\nPROACTIVE STRATEGIES USED:\n[Strategies from the behaviour support plan attempted prior to escalation]\n\nRESTRICTIVE PRACTICE (if applicable):\nType: [e.g., mechanical restraint, physical restraint, environmental restraint, chemical restraint, seclusion]\nDuration: [Start time to end time]\nAuthorisation Reference: [BSP reference number or 'Not applicable']\nJustification: [Immediate risk that necessitated the practice]\n\nPOST-INCIDENT SUPPORT:\n[How the participant was supported following the incident — debrief, comfort, medical attention]\n\nPARTICIPANT'S CURRENT STATE:\n[Objective observations at time of writing]\n\nFOLLOW-UP ACTIONS:\n[Incident report lodged, supervisor notified, BSP review requested, etc.]",
  "tone_guidelines": [
    "Use strictly objective, observable language — document what was seen and heard, not interpreted",
    "Avoid language that assigns intent, motivation, or character to behaviour",
    "Maintain the participant's dignity in all descriptions",
    "Use clinical, precise language for behaviour descriptions",
    "Document support worker responses as professional and measured, not reactive"
  ],
  "prohibited_terms": [
    "aggressive" (describe specific actions instead, e.g., 'struck the table with an open hand'),
    "violent", "attacked", "went crazy", "lost it",
    "manipulative", "attention-seeking", "deliberately",
    "tantrum", "meltdown" (use objective descriptions),
    "out of control", "uncontrollable",
    "for no reason" (always document antecedents),
    "noncompliant", "refused to cooperate"
  ],
  "example_output": "DATE/TIME: 14 April 2025, 14:35\nSUPPORT WORKER: David L.\nPARTICIPANT: Thomas W.\n\nANTECEDENT:\nThomas had been engaged in a structured art activity for approximately 40 minutes. The support worker informed Thomas that the activity would conclude in 5 minutes as per the daily schedule. Thomas had not been given a prior 10-minute warning (deviation from usual routine). The room had three other participants present; noise level was moderate.\n\nBEHAVIOUR OBSERVED:\nFollowing the 5-minute warning, Thomas placed both hands over his ears and began vocalising loudly (duration: approximately 3 minutes). He then stood abruptly, knocking his chair backward, and moved toward the exit door, striking the door frame once with his right hand (open palm). Thomas remained at the door, vocalising, for a further 4 minutes.\n\nCONSEQUENCE / SUPPORT WORKER RESPONSE:\nSupport worker moved to within 2 metres of Thomas, used a calm, low tone, and offered Thomas a choice: to continue the art activity for 10 more minutes or to move to the quiet room. Thomas chose the quiet room. Support worker accompanied Thomas to the quiet room. Vocalisation ceased within 2 minutes of entering the quiet room.\n\nPROACTIVE STRATEGIES USED:\nTransition warning was provided (5 minutes); however, the 10-minute prior warning was inadvertently omitted. Visual schedule was not referenced prior to transition. These are documented as contributing factors for BSP review.\n\nRESTRICTIVE PRACTICE:\nNot applicable. No restrictive practices were used.\n\nPOST-INCIDENT SUPPORT:\nThomas was offered water and a preferred sensory item (weighted blanket) in the quiet room. After 10 minutes, Thomas verbally indicated he was 'okay' and requested to return to the art activity. Support worker accompanied Thomas back to the activity room.\n\nPARTICIPANT'S CURRENT STATE:\nAt time of writing (15:20), Thomas is engaged in the art activity, presenting as calm. No visible signs of distress.\n\nFOLLOW-UP ACTIONS:\nIncident report lodged (Ref: INC-2025-0414-001). Behaviour support practitioner notified via email. Team leader informed. BSP review requested to address transition warning protocol."
}"#,
    },

    // ── 5. Early Childhood Intervention ───────────────────────────────────
    CartridgeSeed {
        name: "Early Childhood Intervention",
        service_type: "early_childhood",
        description: "Early childhood early intervention (ECEI) support notes for children aged 0–9, including family-centred practice documentation",
        config_json: r#"{
  "service_type": "Early Childhood Intervention",
  "compliance_rules": [
    "Notes must reflect family-centred practice principles — the family is the primary decision-maker and the child's natural environment is the primary context (NDIS Early Childhood Approach)",
    "Documentation must capture the child's participation in natural environments (home, childcare, community) not just clinic-based activities",
    "Progress must be documented in relation to the child's functional outcomes and family priorities, not deficit-based milestones",
    "Family strengths, strategies, and capacity building must be documented",
    "Any coaching provided to parents/carers must be documented with specific strategies discussed",
    "Notes must reference the child's NDIS Early Childhood plan goals and outcomes framework",
    "Cultural and family context must be respected and reflected in documentation",
    "Any concerns about the child's development or safety must be documented and escalated appropriately",
    "Collaboration with other services (childcare, kindergarten, health) must be documented",
    "Notes must be completed within 24 hours of the session"
  ],
  "required_fields": [
    "Date and duration of session",
    "Practitioner name and discipline",
    "Child's name (or identifier) and age",
    "Family members/carers present",
    "Session setting (home, childcare, clinic, community)",
    "NDIS outcomes addressed",
    "Child's participation and engagement",
    "Family priorities and concerns discussed",
    "Strategies coached to family/carers",
    "Child's functional progress",
    "Recommendations and next steps",
    "Plan for next session"
  ],
  "format_template": "DATE: [Date]\nDURATION: [Session length]\nPRACTITIONER: [Name, Discipline]\nCHILD: [Name/Identifier, Age]\nFAMILY PRESENT: [Names and relationship]\nSETTING: [Home / Childcare / Clinic / Community]\n\nNDIS OUTCOMES ADDRESSED:\n[Reference specific NDIS Early Childhood outcomes targeted]\n\nSESSION SUMMARY:\n[Description of activities and child's participation in natural context]\n\nCHILD'S ENGAGEMENT AND PROGRESS:\n[Objective observations of the child's participation, skills demonstrated, and functional progress]\n\nFAMILY PRIORITIES AND DISCUSSION:\n[Family concerns, priorities, and questions discussed during the session]\n\nCOACHING PROVIDED TO FAMILY:\n[Specific strategies, techniques, or approaches discussed and demonstrated with family]\n\nRECOMMENDATIONS:\n[Strategies for family to embed in daily routines; referrals; equipment recommendations]\n\nNEXT SESSION PLAN:\n[Goals and planned activities for next session; any preparation needed from family]",
  "tone_guidelines": [
    "Use family-centred, strengths-based language that positions the family as the expert on their child",
    "Refer to the child by name, not as 'the child' or 'the client'",
    "Celebrate the child's strengths and progress, not just areas of need",
    "Use accessible language that families can understand and engage with",
    "Document the family's active role and contributions, not just the practitioner's actions",
    "Avoid medicalised or deficit-focused language"
  ],
  "prohibited_terms": [
    "delayed", "behind", "abnormal" (use 'developing at their own pace', 'emerging skills'),
    "patient", "client" (use child's name or 'the child'),
    "non-compliant", "uncooperative" (describe specific behaviour objectively),
    "mother failed to", "parent did not" (use collaborative language),
    "chronic", "permanent disability" (unless clinically appropriate),
    "cannot", "will never" (use 'is working toward', 'with support can')
  ],
  "example_output": "DATE: 14 April 2025\nDURATION: 60 minutes\nPRACTITIONER: Emma T., Speech Pathologist\nCHILD: Liam C., 3 years 4 months\nFAMILY PRESENT: Sarah C. (mother), Tom C. (father)\nSETTING: Family home\n\nNDIS OUTCOMES ADDRESSED:\n1. Communication: Liam uses words and gestures to communicate wants and needs\n2. Social participation: Liam engages in play with family members\n\nSESSION SUMMARY:\nSession was conducted in the family's living room during Liam's usual play time. Activities included bubbles, a favourite puzzle, and a picture book chosen by Liam. All activities were embedded in Liam's natural play routine as coached in previous sessions.\n\nCHILD'S ENGAGEMENT AND PROGRESS:\nLiam spontaneously used 8 single words during the session (up from 4 in the previous session two weeks ago). He used 'more' and 'up' functionally and consistently. Liam initiated joint attention by bringing the puzzle to his father and vocalising, demonstrating emerging social communication. He engaged in shared book reading for approximately 6 minutes.\n\nFAMILY PRIORITIES AND DISCUSSION:\nSarah and Tom shared that Liam has been using 'more' at mealtimes at home, which they found encouraging. They asked about strategies to support Liam's communication during bath time. Tom noted Liam seems more interested in books since the last session.\n\nCOACHING PROVIDED TO FAMILY:\nDiscussed and demonstrated 'expectant pause' strategy during bath time — pause after naming objects and wait 3–5 seconds for Liam to vocalise or gesture before providing the item. Modelled commenting on bath activities using single words (e.g., 'splash', 'wet', 'bubbles'). Both parents practised the strategy during a brief bath-time role play.\n\nRECOMMENDATIONS:\nContinue embedding expectant pause in bath time, mealtimes, and play. Introduce 2-word combinations when Liam is consistently using single words (e.g., 'more bubbles'). No new referrals at this stage.\n\nNEXT SESSION PLAN:\nReview bath-time strategy implementation. Introduce turn-taking games to support social communication. Session at childcare to observe and coach Liam's communication in peer context."
}"#,
    },

    // ── 6. Support Coordination ────────────────────────────────────────────
    CartridgeSeed {
        name: "Support Coordination",
        service_type: "support_coordination",
        description: "Support coordination and specialist support coordination case notes, plan implementation documentation, and provider liaison records",
        config_json: r#"{
  "service_type": "Support Coordination",
  "compliance_rules": [
    "Notes must document specific actions taken to implement the participant's NDIS plan and the outcomes of those actions (NDIS Practice Standard 5.1)",
    "All provider contacts, referrals, and service agreements must be documented with dates and outcomes",
    "Notes must reflect the participant's informed decision-making and consent in all coordination activities",
    "Any barriers to plan implementation must be documented with strategies used to address them",
    "Notes must document capacity building activities — how the participant is being supported to self-manage or coordinate their own supports over time",
    "Any plan review preparation activities must be documented with evidence of outcomes achieved",
    "Crisis support or urgent coordination activities must be documented with full context and actions taken",
    "Notes must document the participant's progress toward their stated goals",
    "Any complaints, concerns, or safeguarding issues must be documented and escalated appropriately",
    "Time spent on coordination activities must be accurately recorded for NDIS billing compliance"
  ],
  "required_fields": [
    "Date and duration of coordination activity",
    "Support coordinator name",
    "Participant name and NDIS number (or identifier)",
    "Type of activity (phone call, meeting, email, research, provider liaison)",
    "NDIS goals addressed",
    "Actions taken and outcomes",
    "Participant's decisions and informed consent",
    "Providers contacted and outcomes",
    "Barriers identified and strategies used",
    "Capacity building activities",
    "Next steps and follow-up actions"
  ],
  "format_template": "DATE: [Date]\nDURATION: [Time spent on activity]\nCOORDINATOR: [Name]\nPARTICIPANT: [Name/Identifier, NDIS No.]\nACTIVITY TYPE: [Phone call / Meeting / Email / Research / Provider liaison / Other]\n\nNDIS GOALS ADDRESSED:\n[Reference specific plan goals relevant to today's coordination activity]\n\nACTIONS TAKEN:\n[Detailed account of coordination activities undertaken]\n\nOUTCOMES:\n[Results of actions taken — services secured, barriers resolved, decisions made]\n\nPARTICIPANT DECISIONS AND CONSENT:\n[Document participant's informed choices and any consent provided]\n\nPROVIDER CONTACTS:\n[Providers contacted, purpose, and outcome of each contact]\n\nBARRIERS AND STRATEGIES:\n[Any barriers to plan implementation and how they were addressed — or 'Nil']\n\nCAPACITY BUILDING:\n[How the participant was supported to build skills or confidence in managing their own supports]\n\nNEXT STEPS:\n[Specific follow-up actions, deadlines, and responsible parties]",
  "tone_guidelines": [
    "Use professional, clear language that documents coordination activities accurately",
    "Centre the participant's voice and decisions throughout",
    "Document the coordinator's role as facilitating the participant's choices, not directing them",
    "Be specific about actions, contacts, and outcomes — avoid vague summaries",
    "Use language that reflects the participant's capacity and growing independence"
  ],
  "prohibited_terms": [
    "client" (use participant's name),
    "told the participant to" (use 'discussed options with', 'provided information about'),
    "managed" (use 'coordinated', 'facilitated'),
    "noncompliant with plan" (document specific barriers instead),
    "difficult to engage" (document specific context and strategies used)
  ],
  "example_output": "DATE: 14 April 2025\nDURATION: 45 minutes\nCOORDINATOR: Rachel P.\nPARTICIPANT: Nina H., NDIS No. 430XXXXXXX\nACTIVITY TYPE: Phone call (participant) + Provider liaison (email)\n\nNDIS GOALS ADDRESSED:\n1. Increase participation in community activities\n2. Develop independent living skills\n\nACTIONS TAKEN:\nContacted Nina by phone to discuss progress with her new support worker placement and to review her upcoming plan review preparation. Discussed Nina's satisfaction with current supports and identified her priority goals for the review. Emailed three community participation providers to request service availability and pricing for Nina's preferred activity (swimming lessons).\n\nOUTCOMES:\nNina confirmed she is satisfied with her current support worker and would like to continue the arrangement. She identified 'learning to swim' as her top priority for the next plan period. Two of three providers responded with availability; one (AquaFit) can commence within two weeks at a rate within Nina's plan budget.\n\nPARTICIPANT DECISIONS AND CONSENT:\nNina provided verbal consent to share her contact details with AquaFit for an enrolment call. She confirmed she would like to attend a trial session before committing. Nina made all decisions regarding provider selection independently.\n\nPROVIDER CONTACTS:\n- AquaFit Disability Swimming: Available from 28 April, $85/session, NDIS registered. Nina's details shared with consent.\n- CommunitySwim: Waitlist of 6 weeks — not suitable for Nina's timeline.\n- BlueLane Aquatics: No response received; follow up required.\n\nBARRIERS AND STRATEGIES:\nNina expressed concern about transport to the pool. Discussed options including taxi subsidy, support worker transport, and public transport training. Nina would like to explore public transport training as a capacity building option aligned with her independence goals.\n\nCAPACITY BUILDING:\nDiscussed Nina's interest in eventually self-managing her community participation supports. Provided information about plan management options and self-management. Nina will consider and discuss with her family before the plan review.\n\nNEXT STEPS:\n1. Follow up BlueLane Aquatics by 17 April (Rachel P.)\n2. Confirm AquaFit trial session date with Nina by 18 April (Rachel P.)\n3. Research public transport training providers for Nina's area by 21 April (Rachel P.)\n4. Schedule plan review preparation meeting with Nina for week of 28 April (Rachel P.)"
}"#,
    },

    // ── 7. Respite / Short Term Accommodation ─────────────────────────────
    CartridgeSeed {
        name: "Respite / Short Term Accommodation",
        service_type: "respite_sta",
        description: "Short Term Accommodation (STA) and respite care documentation including shift notes, handover records, and family communication",
        config_json: r#"{
  "service_type": "Respite / Short Term Accommodation",
  "compliance_rules": [
    "Notes must document the participant's experience during the STA stay, not just task completion (NDIS Practice Standard 1.2)",
    "All personal care, medication, and daily living supports must be documented with level of assistance provided",
    "Any changes from the participant's usual routine or support plan must be documented with rationale",
    "Family/carer communication and handover must be documented, including information shared at arrival and departure",
    "Participant's expressed preferences, enjoyment, and any concerns during the stay must be documented",
    "Any incidents, health changes, or behaviours of concern must be documented and communicated to family/carers and the participant's primary provider",
    "Notes must reflect the participant's goals for the STA stay (e.g., social connection, skill development, carer respite)",
    "Medication administration must be documented in the medication register; progress notes reference observations only",
    "Sleep patterns, appetite, and general wellbeing must be documented for multi-day stays",
    "Discharge summary must be completed at the end of the stay"
  ],
  "required_fields": [
    "Date and shift time",
    "Support worker name",
    "Participant name or identifier",
    "Day number of STA stay",
    "Activities undertaken and participant's engagement",
    "Personal care and daily living supports provided",
    "Meals and appetite",
    "Sleep (for overnight shifts)",
    "Participant's mood and wellbeing",
    "Any incidents or health changes",
    "Family/carer communication",
    "Handover notes"
  ],
  "format_template": "DATE/TIME: [Date and shift time]\nSUPPORT WORKER: [Name]\nPARTICIPANT: [Name/Identifier]\nSTA DAY: [Day X of Y]\n\nACTIVITIES AND ENGAGEMENT:\n[Activities during shift and participant's enjoyment and participation]\n\nPERSONAL CARE AND DAILY LIVING:\n[Supports provided and level of assistance — objective and specific]\n\nMEALS AND APPETITE:\n[Meals provided, appetite observations, any dietary concerns]\n\nSLEEP (overnight shifts):\n[Sleep pattern, any overnight observations]\n\nPARTICIPANT WELLBEING:\n[Mood, communication, social engagement, and general wellbeing observations]\n\nINCIDENTS / HEALTH CHANGES:\n[Any incidents, health observations, or behaviour changes — or 'Nil to report']\n\nFAMILY / CARER COMMUNICATION:\n[Any contact with family or carers, information shared — or 'Nil']\n\nHANDOVER NOTES:\n[Key information for incoming support worker or for discharge]",
  "tone_guidelines": [
    "Write notes that a family member could read and feel reassured about their loved one's care",
    "Document the participant's enjoyment and positive experiences, not just care tasks",
    "Use warm, professional language that reflects genuine person-centred care",
    "Be specific about the participant's engagement and choices",
    "Document any homesickness or adjustment concerns sensitively and professionally"
  ],
  "prohibited_terms": [
    "client", "resident" (use participant's name),
    "settled" (too vague — describe specific behaviour),
    "good night", "good day" (be specific about observations),
    "no issues" (use 'Nil to report' or specific observations),
    "as usual", "routine" (document specifically for STA context)
  ],
  "example_output": "DATE/TIME: 14 April 2025, Evening Shift (16:00–22:00)\nSUPPORT WORKER: Jenny W.\nPARTICIPANT: Oliver S.\nSTA DAY: Day 2 of 5\n\nACTIVITIES AND ENGAGEMENT:\nOliver participated in an afternoon walk to the local park with two other STA residents and two support workers. He engaged enthusiastically with the ducks at the pond and requested to feed them. Oliver chose to watch a movie (The Lion King) after dinner and sang along to several songs, appearing relaxed and happy.\n\nPERSONAL CARE AND DAILY LIVING:\nOliver completed his evening shower independently with verbal prompting for sequencing (three prompts required). He selected his own pyjamas and prepared his bed independently. Support worker provided standby assistance for toothbrushing; Oliver completed the task independently after demonstration.\n\nMEALS AND APPETITE:\nOliver ate a full dinner (pasta bolognaise) and requested a second serving. He had a glass of milk before bed as per his usual routine. Good appetite noted.\n\nSLEEP:\nOliver was in bed by 21:00. He requested his weighted blanket, which was provided. No overnight disturbances reported by night staff.\n\nPARTICIPANT WELLBEING:\nOliver appeared settled and content throughout the shift. He spoke about his family several times and showed support worker photos on his phone. He expressed that he was 'having fun' and asked if he could come back 'next time.'\n\nINCIDENTS / HEALTH CHANGES:\nNil to report.\n\nFAMILY / CARER COMMUNICATION:\nOliver's mother called at 18:30. Support worker confirmed Oliver was well and enjoying his stay. Oliver spoke with his mother for approximately 5 minutes and appeared happy after the call.\n\nHANDOVER NOTES:\nOliver has requested pancakes for breakfast. He prefers to sleep with his bedroom door slightly ajar. Weighted blanket is in the top drawer of his wardrobe."
}"#,
    },

    // ── 8. Employment Support ──────────────────────────────────────────────
    CartridgeSeed {
        name: "Employment Support",
        service_type: "employment_support",
        description: "Supported employment and employment assistance notes including job coaching, workplace support, and employment skill development",
        config_json: r#"{
  "service_type": "Employment Support",
  "compliance_rules": [
    "Notes must document specific employment-related activities and the participant's progress toward their employment goals (NDIS Practice Standard 6.1)",
    "Any workplace accommodations or adjustments discussed or implemented must be documented",
    "Employer contacts and communications must be documented with outcomes",
    "Notes must reflect the participant's employment rights and the support worker's role in facilitating — not directing — employment decisions",
    "Job coaching activities must be documented with specific skills targeted and the participant's response",
    "Any workplace incidents or concerns must be documented and escalated to the employer and the participant's support coordinator",
    "Notes must document the participant's growing independence and reduced need for support over time",
    "Any barriers to employment participation must be documented with strategies used",
    "Vocational assessment activities must be documented with findings and recommendations",
    "Notes must be completed within 24 hours of the support being delivered"
  ],
  "required_fields": [
    "Date and duration of support",
    "Employment support worker name",
    "Participant name or identifier",
    "Workplace or activity setting",
    "Employment goals addressed",
    "Activities and tasks supported",
    "Skills demonstrated and level of independence",
    "Employer/colleague interactions",
    "Barriers encountered and strategies used",
    "Progress toward employment goals",
    "Follow-up actions"
  ],
  "format_template": "DATE: [Date]\nDURATION: [Support hours]\nSUPPORT WORKER: [Name]\nPARTICIPANT: [Name/Identifier]\nSETTING: [Workplace name / Job search activity / Vocational training]\n\nEMPLOYMENT GOALS ADDRESSED:\n[Reference specific NDIS employment goals targeted today]\n\nACTIVITIES SUPPORTED:\n[Specific tasks, duties, or activities the participant was supported with]\n\nSKILLS AND INDEPENDENCE:\n[Skills demonstrated, level of independence, and comparison to previous performance]\n\nEMPLOYER / WORKPLACE INTERACTIONS:\n[Any interactions with employer, supervisor, or colleagues and outcomes]\n\nBARRIERS AND STRATEGIES:\n[Any workplace or participation barriers and how they were addressed — or 'Nil']\n\nPROGRESS TOWARD GOALS:\n[Observable progress indicators and any milestones reached]\n\nFOLLOW-UP ACTIONS:\n[Actions required before next session — or 'Nil']",
  "tone_guidelines": [
    "Use language that positions the participant as a valued worker, not a supported person in a workplace",
    "Document the participant's competence and growing independence",
    "Avoid language that highlights disability in a workplace context",
    "Document employer and colleague interactions respectfully and professionally",
    "Reflect the participant's employment aspirations and motivation"
  ],
  "prohibited_terms": [
    "client", "disabled worker" (use participant's name or 'the participant')",
    "can't do", "unable to" (use 'is developing skills in', 'with support can'),
    "supervised" (use 'supported', 'coached'),
    "placed at" (use 'works at', 'is employed at'),
    "special needs" (avoid entirely in employment context),
    "tolerance" (employers don't 'tolerate' — they 'support' or 'accommodate')"
  ],
  "example_output": "DATE: 14 April 2025\nDURATION: 3 hours (09:00–12:00)\nSUPPORT WORKER: Marcus T.\nPARTICIPANT: Zara M.\nSETTING: Fresh Harvest Café, Northside\n\nEMPLOYMENT GOALS ADDRESSED:\n1. Develop barista skills to increase hours and independence at Fresh Harvest Café\n2. Build confidence in customer service interactions\n\nACTIVITIES SUPPORTED:\nZara completed her regular Monday morning shift. She prepared coffee orders independently for the first 45 minutes of the shift, with job coach present but not intervening. Support worker provided one verbal prompt regarding milk temperature calibration. Zara handled three customer interactions independently, including one complaint about order wait time, which she managed professionally.\n\nSKILLS AND INDEPENDENCE:\nZara completed 18 of 20 coffee orders without prompting (up from 14 of 20 three weeks ago). She independently managed the morning rush period (09:30–10:30) with minimal support. Her customer greeting script is now fully internalised — no prompting required. Milk temperature calibration remains an area for development (2 prompts required today).\n\nEMPLOYER / WORKPLACE INTERACTIONS:\nZara's supervisor, Brendan, provided positive verbal feedback on Zara's customer service during the shift. Brendan confirmed he would like to discuss increasing Zara's hours to 4 days per week. Support worker arranged a meeting with Brendan for 21 April to discuss the transition plan.\n\nBARRIERS AND STRATEGIES:\nZara reported feeling anxious about the increased hours discussion. Support worker discussed Zara's rights regarding workplace adjustments and the option to trial increased hours before committing. Zara agreed to attend the meeting with support worker present.\n\nPROGRESS TOWARD GOALS:\nZara is consistently demonstrating barista competency at a level that supports increased hours. Her customer service confidence has increased markedly over the past month. She is on track to reduce job coaching frequency to fortnightly by June.\n\nFOLLOW-UP ACTIONS:\n1. Confirm meeting with Brendan for 21 April (Marcus T.)\n2. Prepare Zara for the hours discussion — review her employment rights and preferences (next session, 17 April)\n3. Notify support coordinator of proposed hours increase for plan review consideration (Marcus T., by 16 April)"
}"#,
    },
];
