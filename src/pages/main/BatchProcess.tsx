/**
 * BatchProcess — multi-screen batch processing flow.
 *
 * Screen 1: Import     — CSV drop zone, platform detection, note count
 * Screen 2: Processing — progress bar with batch-progress events
 * Screen 3: Wizard     — MissingDataWizard for [MISSING: ...] brackets
 * Screen 4: Results    — sorted note cards with review/copy actions
 *
 * ZERO DATA STORAGE:
 *   - Everything lives in React state only.
 *   - No localStorage, no sessionStorage, no database, no files.
 *   - Data is gone when the component unmounts or the app closes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
  getActiveCartridges,
  rewriteBatch,
  type BatchNoteInput,
  type BatchNoteResult,
  type Cartridge,
  type CsvParseResult,
  type RawNote,
  type RewriteMode,
} from "../../lib/commands";

import CsvDropZone from "../../components/CsvDropZone";
import BatchProgress from "../../components/BatchProgress";
import MissingDataWizard, {
  type ProcessedNote,
} from "../../components/MissingDataWizard";
import BatchResults from "../../components/BatchResults";

// ─────────────────────────────────────────────
//  Screen enum
// ─────────────────────────────────────────────

type Screen = "import" | "processing" | "wizard" | "results";

const MISSING_RE = /\[MISSING:\s*[^\]]+\]/;

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export default function BatchProcessPage() {
  // ── Shared state ──
  const [screen, setScreen] = useState<Screen>("import");
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [selectedCartridge, setSelectedCartridge] = useState<number | "">("");
  const [mode, setMode] = useState<RewriteMode>("deep");

  // ── Import state ──
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);

  // ── Processing state ──
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [currentNoteStatus, setCurrentNoteStatus] = useState<string>("");
  const [, setBatchStartTime] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  // ── Results state ──
  const [processedNotes, setProcessedNotes] = useState<ProcessedNote[]>([]);
  const [rawNotesMap, setRawNotesMap] = useState<
    Record<string, { raw_text: string; participant_name: string; date: string }>
  >({});

  // Timer ref for elapsed time
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load cartridges on mount ──
  useEffect(() => {
    getActiveCartridges()
      .then((active) => {
        setCartridges(active);
        if (active.length > 0) setSelectedCartridge(active[0].id);
      })
      .catch(console.error);
  }, []);

  // ── CSV import handler ──
  const handleCsvImport = useCallback((result: CsvParseResult) => {
    setCsvResult(result);
  }, []);

  // ── Start batch processing ──
  const handleStartBatch = useCallback(async () => {
    if (!csvResult || selectedCartridge === "") return;

    setScreen("processing");
    setProcessing(true);
    setProcessError(null);
    setProgressCurrent(0);
    setProgressTotal(csvResult.total_count);
    setCurrentNoteStatus("");
    setBatchStartTime(Date.now());
    setElapsedSeconds(0);

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setBatchStartTime((start) => {
        if (start > 0) {
          setElapsedSeconds(Math.round((Date.now() - start) / 1000));
        }
        return start;
      });
    }, 1000);

    // Build raw notes map for results view
    const rawMap: Record<
      string,
      { raw_text: string; participant_name: string; date: string }
    > = {};
    csvResult.notes.forEach((n: RawNote) => {
      rawMap[n.id] = {
        raw_text: n.raw_text,
        participant_name: n.participant_name,
        date: n.date,
      };
    });
    setRawNotesMap(rawMap);

    // Listen for batch-progress events
    let unlisten: UnlistenFn | null = null;
    try {
      unlisten = await listen<{
        current: number;
        total: number;
        current_note_status: string;
      }>("batch-progress", (event) => {
        setProgressCurrent(event.payload.current);
        setProgressTotal(event.payload.total);
        setCurrentNoteStatus(event.payload.current_note_status);
      });
    } catch {
      // Event listener not available (e.g. browser dev mode)
    }

    try {
      // Build batch input
      const batchInput: BatchNoteInput[] = csvResult.notes.map((n: RawNote) => ({
        id: n.id,
        raw_text: n.raw_text,
      }));

      const results: BatchNoteResult[] = await rewriteBatch(
        batchInput,
        selectedCartridge as number,
        mode
      );

      // Convert results to ProcessedNote[] for wizard and results
      const processed: ProcessedNote[] = results.map((r) => ({
        id: r.id,
        participant_name: rawMap[r.id]?.participant_name || r.id,
        date: rawMap[r.id]?.date || "",
        final_text: r.result.final_text,
        traffic_light: r.result.traffic_light,
        red_flag_keywords: r.result.red_flag_keywords,
        red_flag_categories: r.result.red_flag_categories,
        missing_pillars: r.result.missing_pillars,
        present_pillars: r.result.present_pillars,
        mode: r.result.mode,
      }));

      setProcessedNotes(processed);

      // Check if any notes have [MISSING: ...] brackets → show wizard
      const hasMissing = processed.some((n) => MISSING_RE.test(n.final_text));
      if (hasMissing) {
        setScreen("wizard");
      } else {
        setScreen("results");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Batch processing failed. Please try again.";
      setProcessError(message);
    } finally {
      setProcessing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (unlisten) unlisten();
    }
  }, [csvResult, selectedCartridge, mode]);

  // ── Wizard completion ──
  const handleWizardComplete = useCallback((updatedNotes: ProcessedNote[]) => {
    setProcessedNotes(updatedNotes);
    setScreen("results");
  }, []);

  // ── Start over ──
  const handleStartOver = useCallback(() => {
    setCsvResult(null);
    setProcessedNotes([]);
    setRawNotesMap({});
    setProgressCurrent(0);
    setProgressTotal(0);
    setCurrentNoteStatus("");
    setProcessError(null);
    setElapsedSeconds(0);
    setScreen("import");
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const isDeep = mode === "deep";

  // ─────────────────────────────────────────────
  //  Screen 1: Import
  // ─────────────────────────────────────────────

  if (screen === "import") {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Batch Process Notes</h1>
          <p>
            Import a CSV file from your care platform, and RiteDoc will
            rewrite every note through the compliance pipeline.
          </p>
        </div>

        {/* Cartridge + Mode selectors */}
        <div style={styles.configRow}>
          <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
            <label className="label">Service Cartridge</label>
            <select
              className="select"
              value={selectedCartridge}
              onChange={(e) =>
                setSelectedCartridge(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            >
              <option value="">No cartridge selected</option>
              {cartridges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Processing Mode</label>
            <div style={styles.modeToggle}>
              <ModeButton
                label="Quick"
                description="Single-pass"
                active={!isDeep}
                onClick={() => setMode("quick")}
              />
              <ModeButton
                label="Deep"
                description="3-stage"
                active={isDeep}
                onClick={() => setMode("deep")}
              />
            </div>
          </div>
        </div>

        {/* Drop zone */}
        <CsvDropZone onImport={handleCsvImport} />

        {/* Process button */}
        {csvResult && (
          <div style={styles.processSection}>
            <button
              className="btn btn-primary"
              disabled={selectedCartridge === ""}
              onClick={handleStartBatch}
              style={{ minWidth: 180 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 2L12 8L4 14V2Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              Process {csvResult.total_count} Notes
            </button>
          </div>
        )}

        {/* Privacy reminder */}
        <div style={styles.privacyReminder}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M7 1.5L2.5 4V7C2.5 10 4.5 12.5 7 13.5C9.5 12.5 11.5 10 11.5 7V4L7 1.5Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          All processing happens on this computer &mdash; your data never
          leaves your device.
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  Screen 2: Processing
  // ─────────────────────────────────────────────

  if (screen === "processing") {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Processing Notes</h1>
          <p>
            Running the {isDeep ? "3-stage compliance pipeline" : "single-pass rewrite"} on{" "}
            {progressTotal} notes. Please wait.
          </p>
        </div>

        <BatchProgress
          current={progressCurrent}
          total={progressTotal}
          currentNoteStatus={currentNoteStatus}
          elapsedSeconds={elapsedSeconds}
        />

        {processError && (
          <div style={styles.errorCard}>
            <p style={styles.errorTitle}>Processing failed</p>
            <p style={styles.errorText}>{processError}</p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleStartOver}
              style={{ marginTop: "0.5rem" }}
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  Screen 3: Missing Data Wizard
  // ─────────────────────────────────────────────

  if (screen === "wizard") {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Missing Data Wizard</h1>
          <p>
            Some notes are missing information. Fill in the details below, or
            skip if the information is not available.
          </p>
        </div>
        <MissingDataWizard
          notes={processedNotes}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────
  //  Screen 4: Results
  // ─────────────────────────────────────────────

  return (
    <div className="page">
      <div className="page-header">
        <h1>Batch Results</h1>
        <p>
          All {processedNotes.length} notes have been processed. Review each
          note below, then copy or export.
        </p>
      </div>
      <BatchResults
        notes={processedNotes}
        platform={csvResult?.platform || "CSV"}
        rawNotesMap={rawNotesMap}
        onStartOver={handleStartOver}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

function ModeButton({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem",
        border: "none",
        background: active ? "var(--blue-600)" : "var(--white)",
        color: active ? "var(--white)" : "var(--slate-600)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "0.125rem",
        transition: "background 0.15s ease, color 0.15s ease",
        minWidth: 90,
      }}
    >
      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.6875rem", opacity: 0.75 }}>{description}</span>
    </button>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  configRow: {
    display: "flex",
    gap: "1.25rem",
    alignItems: "flex-end",
    marginBottom: "1.5rem",
    flexWrap: "wrap" as const,
  },
  modeToggle: {
    display: "flex",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--slate-200)",
    overflow: "hidden",
    width: "fit-content",
  },
  processSection: {
    marginTop: "1.25rem",
    display: "flex",
    justifyContent: "center",
  },
  privacyReminder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    fontSize: "0.75rem",
    color: "var(--slate-400)",
    marginTop: "1.5rem",
  },
  errorCard: {
    marginTop: "1.25rem",
    padding: "1rem 1.25rem",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-md)",
    textAlign: "center" as const,
  },
  errorTitle: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "#991b1b",
    margin: "0 0 0.375rem",
  },
  errorText: {
    fontSize: "0.8125rem",
    color: "#7f1d1d",
    margin: 0,
    whiteSpace: "pre-wrap" as const,
  },
};
