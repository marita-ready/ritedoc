/**
 * MissingDataWizard — walks the worker through each [MISSING: ...] bracket
 * in the processed notes array, one note / one field at a time.
 *
 * ZERO DATA STORAGE:
 *   - Everything lives in React state/memory only.
 *   - No localStorage, no sessionStorage, no database, no files.
 *   - Data is gone when the component unmounts or the app closes.
 *
 * Props:
 *   notes       — array of processed notes (each must have `id`, `final_text`,
 *                 `traffic_light`, and optional metadata fields)
 *   onComplete  — called with the updated notes array when the wizard finishes
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface ProcessedNote {
  id: string;
  participant_name?: string;
  date?: string;
  final_text: string;
  traffic_light: string; // "green" | "orange" | "red"
  red_flag_keywords?: string[];
  [key: string]: unknown;
}

interface WizardStep {
  noteIndex: number;
  noteId: string;
  participantName: string;
  date: string;
  fieldName: string;
  /** The full bracket text, e.g. "[MISSING: Participant Goals]" */
  bracketText: string;
}

// ─────────────────────────────────────────────
//  Regex
// ─────────────────────────────────────────────

const MISSING_RE = /\[MISSING:\s*([^\]]+)\]/g;

/** Extract all [MISSING: ...] fields from a text string. */
function extractMissingFields(text: string): { fieldName: string; bracketText: string }[] {
  const results: { fieldName: string; bracketText: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MISSING_RE.source, MISSING_RE.flags);
  while ((match = re.exec(text)) !== null) {
    results.push({
      fieldName: match[1].trim(),
      bracketText: match[0],
    });
  }
  return results;
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

interface MissingDataWizardProps {
  notes: ProcessedNote[];
  onComplete: (updatedNotes: ProcessedNote[]) => void;
}

export default function MissingDataWizard({ notes, onComplete }: MissingDataWizardProps) {
  // ── Build the flat list of wizard steps ──
  const steps = useMemo<WizardStep[]>(() => {
    const list: WizardStep[] = [];
    notes.forEach((note, noteIndex) => {
      const fields = extractMissingFields(note.final_text);
      fields.forEach(({ fieldName, bracketText }) => {
        list.push({
          noteIndex,
          noteId: note.id,
          participantName: note.participant_name || `Note ${noteIndex + 1}`,
          date: note.date || "",
          fieldName,
          bracketText,
        });
      });
    });
    return list;
  }, [notes]);

  // ── Working copy of notes (in-memory only) ──
  const [workingNotes, setWorkingNotes] = useState<ProcessedNote[]>(() =>
    notes.map((n) => ({ ...n }))
  );
  // Keep a ref in sync so advance() always reads the latest state
  const workingNotesRef = useRef(workingNotes);
  useEffect(() => {
    workingNotesRef.current = workingNotes;
  }, [workingNotes]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // If there are no steps at all, complete immediately
  useEffect(() => {
    if (steps.length === 0) {
      onComplete(workingNotes);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus textarea on step change
  useEffect(() => {
    setInputValue("");
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  // ── Derived values ──
  const step = steps[currentStepIndex] as WizardStep | undefined;
  const isLastStep = currentStepIndex >= steps.length - 1;

  // Count unique notes that have missing fields
  const noteIndicesWithMissing = useMemo(
    () => [...new Set(steps.map((s) => s.noteIndex))],
    [steps]
  );
  const totalNotesWithMissing = noteIndicesWithMissing.length;

  // Current note number (1-indexed) and field number within that note
  const currentNoteNumber = step
    ? noteIndicesWithMissing.indexOf(step.noteIndex) + 1
    : 0;
  const fieldsForCurrentNote = step
    ? steps.filter((s) => s.noteIndex === step.noteIndex)
    : [];
  const currentFieldNumber = step
    ? fieldsForCurrentNote.indexOf(step) + 1
    : 0;
  const totalFieldsForCurrentNote = fieldsForCurrentNote.length;

  // ── Finish the wizard — reads from ref for latest state ──
  const finish = useCallback(() => {
    const finalNotes = reEvaluateTrafficLights(workingNotesRef.current);
    onComplete(finalNotes);
  }, [onComplete]);

  // ── Advance to next step or finish ──
  const advance = useCallback(() => {
    if (isLastStep) {
      // Use setTimeout(0) so the setWorkingNotes from handleUpdate
      // is flushed before we read from the ref.
      setTimeout(() => finish(), 0);
    } else {
      setCurrentStepIndex((i) => i + 1);
    }
  }, [isLastStep, finish]);

  // ── Handle "Update" — replace the bracket with the worker's input ──
  const handleUpdate = useCallback(() => {
    if (!step || !inputValue.trim()) return;

    setWorkingNotes((prev) => {
      const updated = [...prev];
      const note = { ...updated[step.noteIndex] };
      note.final_text = note.final_text.replace(step.bracketText, inputValue.trim());
      updated[step.noteIndex] = note;
      return updated;
    });

    advance();
  }, [step, inputValue, advance]);

  // ── Handle "Not Available At This Time" — skip, leave bracket ──
  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  // ── Guard: no steps ──
  if (steps.length === 0 || !step) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Progress bar */}
      <div style={styles.progressBarTrack}>
        <div
          style={{
            ...styles.progressBarFill,
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Progress text */}
      <p style={styles.progressText}>
        Note {currentNoteNumber} of {totalNotesWithMissing}
        {totalFieldsForCurrentNote > 1 && (
          <span style={styles.fieldProgress}>
            {" "}&mdash; Field {currentFieldNumber} of {totalFieldsForCurrentNote}
          </span>
        )}
      </p>

      {/* Card */}
      <div className="card card-padded" style={styles.card}>
        {/* Note context */}
        <div style={styles.noteContext}>
          <div style={styles.contextRow}>
            <span style={styles.contextLabel}>Participant</span>
            <span style={styles.contextValue}>{step.participantName}</span>
          </div>
          {step.date && (
            <div style={styles.contextRow}>
              <span style={styles.contextLabel}>Date</span>
              <span style={styles.contextValue}>{step.date}</span>
            </div>
          )}
        </div>

        {/* Missing field prompt */}
        <div style={styles.promptSection}>
          <div style={styles.orangeBadge}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M7 4.5V7.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="7" cy="9.5" r="0.75" fill="#f59e0b" />
            </svg>
            <span>Missing Data</span>
          </div>
          <p style={styles.promptText}>
            This note is missing: <strong>{step.fieldName}</strong>
          </p>
        </div>

        {/* Textarea */}
        <div style={styles.inputSection}>
          <label style={styles.inputLabel} htmlFor="wizard-input">
            Enter the {step.fieldName.toLowerCase()}:
          </label>
          <textarea
            ref={textareaRef}
            id="wizard-input"
            className="textarea"
            style={styles.textarea}
            placeholder={`Type the ${step.fieldName.toLowerCase()} here...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey && inputValue.trim()) {
                handleUpdate();
              }
            }}
          />
        </div>

        {/* Buttons */}
        <div style={styles.buttonRow}>
          <button
            className="btn btn-primary"
            disabled={!inputValue.trim()}
            onClick={handleUpdate}
            style={styles.updateBtn}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 8L6.5 11.5L13 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Update
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSkip}
            style={styles.skipBtn}
          >
            Not Available At This Time
          </button>
        </div>
      </div>

      {/* Step counter */}
      <p style={styles.stepCounter}>
        Step {currentStepIndex + 1} of {steps.length} total fields
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Traffic light re-evaluation
// ─────────────────────────────────────────────

/**
 * After the wizard, re-evaluate traffic lights:
 *   - RED notes stay RED regardless.
 *   - If note still has [MISSING: ...] brackets → stays ORANGE.
 *   - If all brackets filled and no red flags → flips to GREEN.
 */
function reEvaluateTrafficLights(notes: ProcessedNote[]): ProcessedNote[] {
  return notes.map((note) => {
    // RED stays RED
    if (note.traffic_light === "red") {
      return note;
    }

    const re = new RegExp(MISSING_RE.source, MISSING_RE.flags);
    const stillHasMissing = re.test(note.final_text);

    if (stillHasMissing) {
      return { ...note, traffic_light: "orange" };
    }

    // All brackets filled — flip to green (unless there are red flag keywords)
    const hasRedFlags =
      Array.isArray(note.red_flag_keywords) && note.red_flag_keywords.length > 0;
    if (hasRedFlags) {
      return { ...note, traffic_light: "red" };
    }

    return { ...note, traffic_light: "green" };
  });
}

// ─────────────────────────────────────────────
//  Styles (inline, using CSS variables)
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 640,
    margin: "0 auto",
    padding: "1.5rem 0",
    animation: "page-enter 0.18s ease both",
  },
  progressBarTrack: {
    width: "100%",
    height: 4,
    background: "var(--slate-200)",
    borderRadius: "var(--radius-full)",
    overflow: "hidden",
    marginBottom: "0.75rem",
  },
  progressBarFill: {
    height: "100%",
    background: "var(--blue-500)",
    borderRadius: "var(--radius-full)",
    transition: "width 0.3s ease",
  },
  progressText: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--slate-700)",
    margin: "0 0 1.25rem",
  },
  fieldProgress: {
    fontWeight: 400,
    color: "var(--slate-400)",
  },
  card: {
    marginBottom: "1rem",
  },
  noteContext: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap" as const,
    marginBottom: "1.25rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid var(--slate-100)",
  },
  contextRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
  },
  contextLabel: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--slate-400)",
  },
  contextValue: {
    fontSize: "0.9375rem",
    fontWeight: 500,
    color: "var(--slate-800)",
  },
  promptSection: {
    marginBottom: "1.25rem",
  },
  orangeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "var(--radius-full)",
    padding: "0.25rem 0.75rem",
    marginBottom: "0.75rem",
  },
  promptText: {
    fontSize: "1.0625rem",
    color: "var(--slate-700)",
    margin: 0,
    lineHeight: 1.5,
  },
  inputSection: {
    marginBottom: "1.25rem",
  },
  inputLabel: {
    display: "block",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--slate-700)",
    marginBottom: "0.375rem",
  },
  textarea: {
    minHeight: 120,
  },
  buttonRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
  },
  updateBtn: {
    minWidth: 120,
  },
  skipBtn: {
    color: "var(--slate-500)",
    fontSize: "0.8125rem",
  },
  stepCounter: {
    fontSize: "0.75rem",
    color: "var(--slate-400)",
    textAlign: "center" as const,
    margin: 0,
  },
};
