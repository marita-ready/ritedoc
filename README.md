# RiteDoc — Technology-Assisted Documentation Drafting

**RiteDoc** is an offline desktop application for NDIS support workers that processes progress notes using local AI. It rewrites messy, abbreviated notes to audit-prepared standard, scans for red flags, and scores against a 5-pillar quality rubric — all without any data leaving the computer.

## Key Features

- **100% Offline** — No internet required, no data leaves the computer. PII is scrubbed before AI processing and restored after.
- **Adaptive AI Pipeline** — Two-agent system: Agent 1 rewrites and scans for red flags; Agent 2 audits for hallucinations and scores quality.
- **5-Pillar Scoring Rubric** — Goal Linkage, Participant Voice, Measurable Outcomes, Support Delivered, Risk & Safety.
- **Traffic Light System** — GREEN (audit-ready), ORANGE (missing data), RED (needs attention / red flags).
- **Multi-Platform CSV Import** — Auto-detects ShiftCare, Brevity, Lumary, Astalty, SupportAbility, and generic CSV formats.
- **Red Flag Detection** — Scans for 8 categories: restrictive practices, medication errors, injuries, abuse/neglect, consent issues, property damage, behavioural incidents, WHS concerns.
- **State Cartridge System** — Configurable red flag rules and rubric criteria per Australian state (VIC included).

## Architecture

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Tauri 2.0 |
| Backend | Rust |
| Frontend | HTML/CSS/JS (Shadcn/ui aesthetic) |
| Local AI | llama.cpp via Rust bindings |
| AI Model | Phi-4-mini Q4_K_M (GGUF) |

## Project Structure

```
ritedoc/
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs            # Entry point
│   │   ├── lib.rs             # Module root + Tauri setup
│   │   ├── models.rs          # Data models
│   │   ├── csv_parser.rs      # Multi-platform CSV parser
│   │   ├── pii_scrubber.rs    # PII detection and scrubbing
│   │   ├── llm_integration.rs # LLM engine + agent prompts
│   │   ├── pipeline.rs        # Processing pipeline
│   │   └── commands.rs        # Tauri commands (IPC)
│   ├── cartridges/
│   │   ├── red_flags.json     # VIC state red flag rules
│   │   └── rubric.json        # VIC state rubric criteria
│   ├── Cargo.toml
│   └── tauri.conf.json
├── frontend/                   # Web frontend
│   ├── index.html             # All 5 screens
│   ├── css/styles.css         # Shadcn/ui-inspired styles
│   └── js/app.js              # Application logic
├── tests/
│   ├── test_agent_prompts.py  # AI agent prompt test suite
│   ├── test_results.json      # Test results (JSON)
│   └── test_results.md        # Test results (Markdown)
└── package.json
```

## Screens

1. **Home** — Welcome screen with hardware detection and model status
2. **Import / Processing** — CSV file selection, platform detection, processing progress
3. **Missing Data Modal** — Form to fill in bracket-flagged missing information
4. **Results** — Rolling delivery of processed notes with traffic light indicators
5. **Batch Summary** — Overview of batch results with export options

## AI Pipeline

### Agent 1: Rewrite + Red Flag Scan
- Rewrites raw notes to audit-prepared standard (third person, past tense, professional language)
- Inserts bracket flags for missing data: `[GOAL LINK REQUIRED — specify the NDIS plan goal]`
- Scans for 8 categories of red flags with keyword matching

### Agent 2: Audit + Score
- Checks rewritten note against original for hallucinations
- Scores against 5-pillar rubric (0-3 per pillar)
- Assigns traffic light: GREEN (all pillars ≥ 2, no flags), ORANGE (missing data), RED (red flags)

## Development

### Prerequisites
- Rust toolchain (rustup)
- Node.js 18+
- System dependencies for Tauri (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

### Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Testing AI Prompts
```bash
# Requires OPENAI_API_KEY environment variable
python3 tests/test_agent_prompts.py
```

## Local LLM Setup

1. Download the Phi-4-mini Q4_K_M GGUF model
2. Place it in the `models/` directory
3. The app will auto-detect and load the model on startup

## License

Proprietary — All rights reserved.

## Disclaimer

> RiteDoc is a technology-assisted documentation drafting tool. All outputs are drafts that require human review before use. RiteDoc does not provide clinical, legal, or compliance advice.
