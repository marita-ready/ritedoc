import { useEffect, useRef, useState } from "react";
import {
  getActiveCartridges,
  rewriteNote,
  type Cartridge,
  type RewriteMode,
  type RewriteResult,
} from "../../lib/commands";
import MissingDataWizard, {
  type ProcessedNote,
} from "../../components/MissingDataWizard";

// ─────────────────────────────────────────────
//  Regex to detect [MISSING: ...] brackets
// ─────────────────────────────────────────────

const MISSING_RE = /\[MISSING:\s*[^\]]+\]/;

export default function RewriteNotePage() {
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [selectedCartridge, setSelectedCartridge] = useState<number | "">("");
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState<RewriteMode>("deep");
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // ── Wizard state ──
  // When the pipeline returns an ORANGE note (has [MISSING: ...] brackets),
  // we show the wizard before displaying results.
  const [wizardNotes, setWizardNotes] = useState<ProcessedNote[] | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    loadCartridges();
  }, []);

  async function loadCartridges() {
    try {
      const active = await getActiveCartridges();
      setCartridges(active);
      if (active.length > 0) {
        setSelectedCartridge(active[0].id);
      }
    } catch (err) {
      console.error("Failed to load cartridges:", err);
    }
  }

  async function handleRewrite() {
    if (!rawText.trim() || selectedCartridge === "") return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCopied(false);
    setShowDetails(false);
    setShowWizard(false);
    setWizardNotes(null);

    try {
      const pipelineResult = await rewriteNote(
        rawText.trim(),
        selectedCartridge as number,
        mode
      );

      // Check if the result has [MISSING: ...] brackets → show wizard
      if (MISSING_RE.test(pipelineResult.final_text)) {
        const noteForWizard: ProcessedNote = {
          id: "single-note",
          final_text: pipelineResult.final_text,
          traffic_light: pipelineResult.traffic_light,
          red_flag_keywords: pipelineResult.red_flag_keywords,
          // Store the full result so we can restore it after the wizard
          _pipelineResult: pipelineResult,
        };
        setWizardNotes([noteForWizard]);
        setShowWizard(true);
      } else {
        // No missing fields — show results directly
        setResult(pipelineResult);
        setTimeout(() => {
          outputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ── Wizard completion callback ──
  function handleWizardComplete(updatedNotes: ProcessedNote[]) {
    setShowWizard(false);
    setWizardNotes(null);

    if (updatedNotes.length > 0) {
      const updated = updatedNotes[0];
      // Reconstruct the full RewriteResult with the wizard-updated text and traffic light
      const originalResult = (updated._pipelineResult as RewriteResult) || {};
      const finalResult: RewriteResult = {
        ...originalResult,
        final_text: updated.final_text,
        traffic_light: updated.traffic_light,
      };
      setResult(finalResult);
      setTimeout(() => {
        outputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }

  function handleClear() {
    setRawText("");
    setResult(null);
    setError(null);
    setCopied(false);
    setShowDetails(false);
    setShowWizard(false);
    setWizardNotes(null);
  }

  async function handleCopy() {
    if (!result?.final_text) return;
    try {
      await navigator.clipboard.writeText(result.final_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available in all contexts */
    }
  }

  const isDeep = mode === "deep";

  // ── If wizard is active, render it instead of the normal page ──
  if (showWizard && wizardNotes) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Missing Data Wizard</h1>
          <p>
            Some information is missing from the rewritten note. Fill in the
            details below, or skip if the information is not available.
          </p>
        </div>
        <MissingDataWizard
          notes={wizardNotes}
          onComplete={handleWizardComplete}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rewrite Note</h1>
        <p>
          Select a service cartridge, paste your raw observations, and click
          Rewrite to generate an audit-ready progress note.
        </p>
      </div>

      {/* Cartridge selector + Mode toggle row */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          alignItems: "flex-end",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
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
            disabled={loading}
          >
            <option value="">No cartridge selected</option>
            {cartridges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mode toggle */}
        <div>
          <label className="label">Processing Mode</label>
          <div
            style={{
              display: "flex",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--slate-200)",
              overflow: "hidden",
              width: "fit-content",
            }}
          >
            <ModeButton
              label="Quick"
              description="Single-pass rewrite"
              active={!isDeep}
              disabled={loading}
              onClick={() => setMode("quick")}
            />
            <ModeButton
              label="Deep"
              description="3-stage pipeline"
              active={isDeep}
              disabled={loading}
              onClick={() => setMode("deep")}
            />
          </div>
        </div>
      </div>

      {/* Mode description */}
      <div
        style={{
          fontSize: "0.8125rem",
          color: "var(--slate-400)",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.5 5.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="6.5" cy="4" r="0.6" fill="currentColor" />
        </svg>
        {isDeep
          ? "Deep mode runs a 3-stage compliance pipeline: analysis → rewrite → quality review. More thorough, takes longer."
          : "Quick mode runs a single-pass rewrite. Faster, best for straightforward notes."}
      </div>

      {/* Raw text input */}
      <div style={{ marginBottom: "1rem" }}>
        <label className="label">Raw Notes</label>
        <textarea
          className="textarea"
          style={{ minHeight: 200 }}
          placeholder="Type or paste your raw observations here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          className="btn btn-primary"
          disabled={!rawText.trim() || selectedCartridge === "" || loading}
          onClick={handleRewrite}
        >
          {loading ? (
            <>
              <span className="spinner-inline" />
              {isDeep ? "Running pipeline..." : "Rewriting..."}
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 14L5.5 13L13.5 5C14.05 4.45 14.05 3.55 13.5 3L13 2.5C12.45 1.95 11.55 1.95 11 2.5L3 10.5L2 14Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              Rewrite
            </>
          )}
        </button>
        {(rawText || result || error) && !loading && (
          <button className="btn btn-secondary" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          className="card card-padded"
          style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}
        >
          <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
          <p
            style={{
              fontWeight: 600,
              color: "var(--slate-700)",
              margin: "0 0 0.375rem",
            }}
          >
            {isDeep ? "Running 3-stage compliance pipeline..." : "Rewriting your note..."}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--slate-400)",
              margin: 0,
            }}
          >
            {isDeep
              ? "Stage 1: Compliance analysis → Stage 2: Rewrite → Stage 3: Quality review. This may take a moment."
              : "Applying cartridge compliance rules. This may take a moment."}
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          className="card card-padded"
          style={{
            borderColor: "#fca5a5",
            background: "#fef2f2",
          }}
        >
          <p
            style={{
              fontWeight: 600,
              color: "#991b1b",
              margin: "0 0 0.5rem",
              fontSize: "0.9375rem",
            }}
          >
            Rewrite failed
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#7f1d1d",
              margin: 0,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* Output area */}
      {result && !loading && (
        <div ref={outputRef}>
          {/* Traffic light badge */}
          <div style={{ marginBottom: "0.75rem" }}>
            <TrafficLightBadge status={result.traffic_light} />
          </div>

          {/* Final output card */}
          <div className="card card-padded" style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--slate-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Audit-Ready Output
                </span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 500,
                    padding: "0.125rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    background: result.mode === "quick" ? "var(--slate-100)" : "var(--blue-50)",
                    color: result.mode === "quick" ? "var(--slate-500)" : "var(--blue-600)",
                    border: `1px solid ${result.mode === "quick" ? "var(--slate-200)" : "var(--blue-200)"}`,
                  }}
                >
                  {result.mode === "quick" ? "Quick" : "Deep"} mode
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {result.mode === "deep" && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? "Hide Details" : "Show Pipeline Details"}
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M3 7L5.5 9.5L11 4"
                          stroke="var(--success)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect
                          x="4"
                          y="4"
                          width="8"
                          height="8"
                          rx="1.5"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M2 10V3C2 2.45 2.45 2 3 2H10"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                background: "var(--slate-50)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "var(--slate-700)",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.final_text}
            </div>
          </div>

          {/* Pipeline details (Deep mode only, collapsible) */}
          {result.mode === "deep" && showDetails && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <DetailCard
                title="Stage 1 — Compliance Analysis"
                content={result.compliance_analysis}
              />
              <DetailCard
                title="Stage 2 — Initial Draft"
                content={result.draft_text}
              />
              <DetailCard
                title="Stage 3 — Review Notes"
                content={result.review_notes}
              />
            </div>
          )}
        </div>
      )}
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
  disabled,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.5rem 1rem",
        border: "none",
        background: active ? "var(--blue-600)" : "var(--white)",
        color: active ? "var(--white)" : "var(--slate-600)",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.125rem",
        transition: "background 0.15s ease, color 0.15s ease",
        minWidth: 90,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "0.6875rem", opacity: 0.75 }}>{description}</span>
    </button>
  );
}

function DetailCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="card card-padded">
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "var(--slate-400)",
          margin: "0 0 0.5rem",
        }}
      >
        {title}
      </p>
      <div
        style={{
          background: "var(--slate-50)",
          borderRadius: "var(--radius-md)",
          padding: "0.75rem",
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          color: "var(--slate-600)",
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </div>
    </div>
  );
}

/** Traffic light status badge */
function TrafficLightBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; border: string; color: string; label: string }> = {
    green: {
      bg: "#f0fdf4",
      border: "#86efac",
      color: "#166534",
      label: "GREEN — Audit Ready",
    },
    orange: {
      bg: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
      label: "ORANGE — Missing Information",
    },
    red: {
      bg: "#fef2f2",
      border: "#fca5a5",
      color: "#991b1b",
      label: "RED — Red Flags Detected",
    },
  };

  const c = config[status] || config.green;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "0.25rem 0.75rem",
        borderRadius: "var(--radius-full)",
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: c.color,
          flexShrink: 0,
        }}
      />
      {c.label}
    </span>
  );
}
