/**
 * BatchResults — results view for batch-processed notes.
 *
 * Shows note cards sorted: RED first, then ORANGE, then GREEN.
 * Reviewed counter, platform badge, and "Copy All" button.
 *
 * ZERO DATA STORAGE — all state from props + local UI state only.
 */

import { useCallback, useMemo, useState } from "react";
import NoteCard from "./NoteCard";
import type { ProcessedNote } from "./MissingDataWizard";

interface BatchResultsProps {
  notes: ProcessedNote[];
  platform: string;
  /** Original raw notes keyed by id, for side-by-side display */
  rawNotesMap: Record<string, { raw_text: string; participant_name: string; date: string }>;
  onStartOver: () => void;
}

const SORT_ORDER: Record<string, number> = { red: 0, orange: 1, green: 2 };

export default function BatchResults({
  notes,
  platform,
  rawNotesMap,
  onStartOver,
}: BatchResultsProps) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [copiedAll, setCopiedAll] = useState(false);

  // Sort: RED → ORANGE → GREEN
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      const orderA = SORT_ORDER[a.traffic_light] ?? 2;
      const orderB = SORT_ORDER[b.traffic_light] ?? 2;
      return orderA - orderB;
    });
  }, [notes]);

  // Counts
  const redCount = notes.filter((n) => n.traffic_light === "red").length;
  const orangeCount = notes.filter((n) => n.traffic_light === "orange").length;
  const greenCount = notes.filter((n) => n.traffic_light === "green").length;

  const handleMarkReviewed = useCallback((id: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCopyAll = useCallback(async () => {
    const allText = sortedNotes
      .map((n) => {
        const raw = rawNotesMap[n.id];
        const name = raw?.participant_name || n.participant_name || n.id;
        const date = raw?.date || n.date || "";
        return `--- ${name}${date ? ` (${date})` : ""} [${n.traffic_light.toUpperCase()}] ---\n${n.final_text}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(allText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [sortedNotes, rawNotesMap]);

  return (
    <div>
      {/* Header bar */}
      <div style={styles.headerBar}>
        <div style={styles.headerLeft}>
          <span style={styles.platformBadge}>{platform}</span>
          <span style={styles.noteCount}>{notes.length} notes</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.reviewedCounter}>
            {reviewedIds.size} of {notes.length} reviewed
          </span>
        </div>
      </div>

      {/* Summary chips */}
      <div style={styles.summaryRow}>
        {redCount > 0 && (
          <span style={{ ...styles.summaryChip, ...styles.redChip }}>
            {redCount} Red
          </span>
        )}
        {orangeCount > 0 && (
          <span style={{ ...styles.summaryChip, ...styles.orangeChip }}>
            {orangeCount} Orange
          </span>
        )}
        {greenCount > 0 && (
          <span style={{ ...styles.summaryChip, ...styles.greenChip }}>
            {greenCount} Green
          </span>
        )}

        <div style={{ flex: 1 }} />

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleCopyAll}
        >
          {copiedAll ? (
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
              Copied All
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
              Copy All Notes
            </>
          )}
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onStartOver}
        >
          New Batch
        </button>
      </div>

      {/* Note cards */}
      <div style={styles.cardList}>
        {sortedNotes.map((note) => {
          const raw = rawNotesMap[note.id];
          return (
            <NoteCard
              key={note.id}
              id={note.id}
              participantName={
                raw?.participant_name || note.participant_name || note.id
              }
              date={raw?.date || note.date || ""}
              rawText={raw?.raw_text || ""}
              finalText={note.final_text}
              trafficLight={note.traffic_light}
              redFlagKeywords={note.red_flag_keywords || []}
              redFlagCategories={
                (note.red_flag_categories as { category: string; keywords: string[] }[]) || []
              }
              missingPillars={
                (note.missing_pillars as { pillar: string; prompt_question: string }[]) || []
              }
              onMarkReviewed={handleMarkReviewed}
              isReviewed={reviewedIds.has(note.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  headerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.75rem",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  platformBadge: {
    display: "inline-block",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--blue-700)",
    background: "var(--blue-50)",
    border: "1px solid var(--blue-200)",
    borderRadius: "var(--radius-full)",
    padding: "0.125rem 0.625rem",
  },
  noteCount: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--slate-700)",
  },
  reviewedCounter: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--slate-500)",
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "1rem",
    flexWrap: "wrap" as const,
  },
  summaryChip: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    padding: "0.125rem 0.5rem",
    borderRadius: "var(--radius-full)",
  },
  redChip: {
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
  },
  orangeChip: {
    color: "#92400e",
    background: "#fffbeb",
    border: "1px solid #fde68a",
  },
  greenChip: {
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #86efac",
  },
  cardList: {
    display: "flex",
    flexDirection: "column" as const,
  },
};
