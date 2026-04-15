/**
 * NoteCard — individual note card for the batch results view.
 *
 * Shows:
 *   - Traffic light dot + badge
 *   - Participant name and date
 *   - Expandable raw note vs rewritten note (stacked)
 *   - ORANGE: [MISSING: ...] brackets highlighted in orange italic
 *   - RED: red flag keywords highlighted, categories shown
 *   - Copy button for the rewritten note
 *
 * ZERO DATA STORAGE — purely presentational.
 */

import { useCallback, useState } from "react";
import type { IncidentPackage as IncidentPackageType } from "../lib/commands";
import IncidentPackageView from "./IncidentPackage";

interface NoteCardProps {
  id: string;
  participantName: string;
  date: string;
  rawText: string;
  finalText: string;
  trafficLight: string;
  redFlagKeywords: string[];
  redFlagCategories: { category: string; keywords: string[] }[];
  missingPillars: { pillar: string; prompt_question: string }[];
  incidentPackage?: IncidentPackageType;
  onMarkReviewed?: (id: string) => void;
  isReviewed?: boolean;
}

const MISSING_RE = /(\[MISSING:\s*[^\]]+\])/g;

export default function NoteCard({
  id,
  participantName,
  date,
  rawText,
  finalText,
  trafficLight,
  redFlagKeywords,
  redFlagCategories,
  missingPillars,
  incidentPackage,
  onMarkReviewed,
  isReviewed,
}: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = trafficLight.toLowerCase();
  const borderColor = STATUS_COLORS[status]?.border || "var(--slate-200)";

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [finalText]);

  // Render final text with [MISSING: ...] brackets highlighted
  function renderFinalText(text: string) {
    const parts = text.split(MISSING_RE);
    return parts.map((part, i) => {
      if (MISSING_RE.test(part)) {
        MISSING_RE.lastIndex = 0;
        return (
          <span key={i} style={styles.missingBracket}>
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }

  // Render final text with red flag keywords highlighted
  function renderWithRedFlags(text: string) {
    if (redFlagKeywords.length === 0) return renderFinalText(text);

    // First split on missing brackets, then highlight keywords within non-bracket parts
    const bracketParts = text.split(MISSING_RE);
    return bracketParts.map((part, i) => {
      if (MISSING_RE.test(part)) {
        MISSING_RE.lastIndex = 0;
        return (
          <span key={i} style={styles.missingBracket}>
            {part}
          </span>
        );
      }
      // Highlight red flag keywords in this segment
      return <span key={i}>{highlightKeywords(part, redFlagKeywords)}</span>;
    });
  }

  const preview =
    finalText.length > 140 ? finalText.substring(0, 140) + "..." : finalText;

  return (
    <div
      className="card"
      style={{
        ...styles.card,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Header — always visible, clickable to expand */}
      <div
        style={styles.header}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(!expanded);
        }}
      >
        <div style={styles.headerLeft}>
          <span
            style={{
              ...styles.dot,
              background: STATUS_COLORS[status]?.dot || "var(--slate-300)",
            }}
          />
          <div style={styles.headerMeta}>
            <p style={styles.participantName}>{participantName}</p>
            {date && <p style={styles.dateText}>{date}</p>}
          </div>
        </div>

        <div style={styles.headerRight}>
          <StatusBadge status={status} />
          {isReviewed && (
            <span style={styles.reviewedBadge}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="#16a34a"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Reviewed
            </span>
          )}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              flexShrink: 0,
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="var(--slate-400)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Preview (collapsed) */}
      {!expanded && (
        <p style={styles.preview}>{preview}</p>
      )}

      {/* Expanded body */}
      {expanded && (
        <div style={styles.body}>
          {/* Red flag alerts */}
          {status === "red" && redFlagCategories.length > 0 && (
            <div style={styles.redFlagSection}>
              {redFlagCategories.map((cat, i) => (
                <div key={i} style={styles.redFlagAlert}>
                  <span style={styles.redFlagIcon}>&#9888;</span>
                  <div>
                    <p style={styles.redFlagTitle}>
                      Red Flag: {cat.category}
                    </p>
                    <p style={styles.redFlagKeywords}>
                      Keywords: {cat.keywords.map((k) => `"${k}"`).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Missing pillars (orange notes) */}
          {status === "orange" && missingPillars.length > 0 && (
            <div style={styles.missingPillarsSection}>
              <p style={styles.missingPillarsTitle}>Missing Compliance Pillars</p>
              <div style={styles.pillarsGrid}>
                {missingPillars.map((p, i) => (
                  <span key={i} style={styles.pillarChip}>
                    {p.pillar}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rewritten note */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <p style={styles.sectionLabel}>Rewritten Note</p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
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
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect
                        x="3.5"
                        y="3.5"
                        width="6.5"
                        height="6.5"
                        rx="1"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <path
                        d="M2 8.5V2.5C2 2.22 2.22 2 2.5 2H8.5"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div style={styles.noteBox}>
              {status === "red"
                ? renderWithRedFlags(finalText)
                : renderFinalText(finalText)}
            </div>
          </div>

          {/* Incident Package (RED notes only — Filter 5 output) */}
          {status === "red" && incidentPackage && (
            <IncidentPackageView pkg={incidentPackage} />
          )}

          {/* Raw note */}
          <div style={styles.section}>
            <p style={styles.sectionLabel}>Original Note</p>
            <div style={{ ...styles.noteBox, ...styles.rawNoteBox }}>
              {rawText}
            </div>
          </div>

          {/* Actions */}
          {onMarkReviewed && (
            <div style={styles.actions}>
              <button
                className={`btn ${isReviewed ? "btn-secondary" : "btn-primary"} btn-sm`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkReviewed(id);
                }}
              >
                {isReviewed ? "Undo Review" : "Mark as Reviewed"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  StatusBadge sub-component
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_COLORS[status] || STATUS_COLORS.green;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "0.6875rem",
        fontWeight: 600,
        padding: "0.125rem 0.5rem",
        borderRadius: "var(--radius-full)",
        background: config.bg,
        border: `1px solid ${config.badgeBorder}`,
        color: config.text,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: config.dot,
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────
//  Keyword highlighting helper
// ─────────────────────────────────────────────

function highlightKeywords(text: string, keywords: string[]): React.ReactNode[] {
  if (keywords.length === 0) return [text];

  // Build a regex that matches any of the keywords (case-insensitive)
  const escaped = keywords.map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);

  return parts.map((part, i) => {
    if (re.test(part)) {
      re.lastIndex = 0;
      return (
        <mark key={i} style={styles.redHighlight}>
          {part}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─────────────────────────────────────────────
//  Status colours
// ─────────────────────────────────────────────

const STATUS_COLORS: Record<
  string,
  { dot: string; border: string; bg: string; badgeBorder: string; text: string; label: string }
> = {
  red: {
    dot: "#dc2626",
    border: "#fca5a5",
    bg: "#fef2f2",
    badgeBorder: "#fca5a5",
    text: "#991b1b",
    label: "RED",
  },
  orange: {
    dot: "#f59e0b",
    border: "#fde68a",
    bg: "#fffbeb",
    badgeBorder: "#fde68a",
    text: "#92400e",
    label: "ORANGE",
  },
  green: {
    dot: "#16a34a",
    border: "#86efac",
    bg: "#f0fdf4",
    badgeBorder: "#86efac",
    text: "#166534",
    label: "GREEN",
  },
};

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 0,
    overflow: "hidden",
    marginBottom: "0.75rem",
    transition: "box-shadow 0.15s ease",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.875rem 1rem",
    cursor: "pointer",
    gap: "0.75rem",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    minWidth: 0,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  headerMeta: {
    minWidth: 0,
  },
  participantName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--slate-800)",
    margin: 0,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dateText: {
    fontSize: "0.75rem",
    color: "var(--slate-400)",
    margin: "0.0625rem 0 0",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flexShrink: 0,
  },
  reviewedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.6875rem",
    fontWeight: 500,
    color: "#16a34a",
    background: "#f0fdf4",
    border: "1px solid #86efac",
    borderRadius: "var(--radius-full)",
    padding: "0.125rem 0.5rem",
  },
  preview: {
    fontSize: "0.8125rem",
    color: "var(--slate-500)",
    margin: 0,
    padding: "0 1rem 0.875rem 2.625rem",
    lineHeight: 1.5,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  body: {
    padding: "0 1rem 1rem",
    borderTop: "1px solid var(--slate-100)",
  },
  redFlagSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
    marginTop: "0.75rem",
    marginBottom: "0.75rem",
  },
  redFlagAlert: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.625rem 0.75rem",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-md)",
  },
  redFlagIcon: {
    fontSize: "1rem",
    flexShrink: 0,
  },
  redFlagTitle: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#991b1b",
    margin: 0,
  },
  redFlagKeywords: {
    fontSize: "0.75rem",
    color: "#7f1d1d",
    margin: "0.125rem 0 0",
  },
  missingPillarsSection: {
    marginTop: "0.75rem",
    marginBottom: "0.75rem",
    padding: "0.625rem 0.75rem",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "var(--radius-md)",
  },
  missingPillarsTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#92400e",
    margin: "0 0 0.375rem",
  },
  pillarsGrid: {
    display: "flex",
    gap: "0.375rem",
    flexWrap: "wrap" as const,
  },
  pillarChip: {
    fontSize: "0.6875rem",
    fontWeight: 500,
    color: "#78350f",
    background: "#fef3c7",
    borderRadius: "var(--radius-full)",
    padding: "0.125rem 0.5rem",
  },
  section: {
    marginTop: "0.75rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.375rem",
  },
  sectionLabel: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--slate-400)",
    margin: 0,
  },
  noteBox: {
    background: "var(--slate-50)",
    borderRadius: "var(--radius-md)",
    padding: "0.75rem",
    fontSize: "0.8125rem",
    lineHeight: 1.7,
    color: "var(--slate-700)",
    whiteSpace: "pre-wrap" as const,
  },
  rawNoteBox: {
    background: "var(--white)",
    border: "1px solid var(--slate-100)",
    color: "var(--slate-500)",
    fontSize: "0.75rem",
  },
  missingBracket: {
    color: "#b45309",
    fontStyle: "italic" as const,
    fontWeight: 500,
    background: "#fffbeb",
    borderRadius: 3,
    padding: "0 0.125rem",
  },
  redHighlight: {
    background: "#fee2e2",
    color: "#991b1b",
    fontWeight: 600,
    borderRadius: 2,
    padding: "0 0.125rem",
  },
  actions: {
    marginTop: "0.75rem",
    display: "flex",
    gap: "0.5rem",
  },
};
