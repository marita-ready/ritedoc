/**
 * BatchProgress — animated progress bar for batch note processing.
 *
 * Shows: "Processing 3 of 20 notes..."
 * Displays the current note's traffic light status as it arrives.
 * Smooth animated progress bar fill.
 *
 * ZERO DATA STORAGE — purely presentational, all state from props.
 */

interface BatchProgressProps {
  current: number;
  total: number;
  /** Traffic light status of the most recently processed note */
  currentNoteStatus?: string;
  /** Elapsed time in seconds (optional, for time estimate) */
  elapsedSeconds?: number;
}

export default function BatchProgress({
  current,
  total,
  currentNoteStatus,
  elapsedSeconds,
}: BatchProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current >= total;

  // Time estimate
  let timeEstimate = "";
  if (elapsedSeconds && current > 0 && !isComplete) {
    const remaining = Math.round((elapsedSeconds / current) * (total - current));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    timeEstimate = mins > 0
      ? `~${mins}m ${secs}s remaining`
      : `~${secs}s remaining`;
  }

  return (
    <div style={styles.container}>
      <div className="card card-padded" style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          {!isComplete && (
            <div className="loading-spinner" style={{ width: 20, height: 20 }} />
          )}
          <p style={styles.title}>
            {isComplete
              ? "Processing complete!"
              : `Processing ${current} of ${total} notes...`}
          </p>
        </div>

        {/* Progress bar */}
        <div style={styles.barTrack}>
          <div
            style={{
              ...styles.barFill,
              width: `${pct}%`,
              background: isComplete ? "#16a34a" : "var(--blue-500)",
            }}
          />
        </div>

        {/* Sub-info row */}
        <div style={styles.subRow}>
          <span style={styles.pctText}>{pct}%</span>

          {currentNoteStatus && !isComplete && (
            <span style={styles.statusChip}>
              <span
                style={{
                  ...styles.statusDot,
                  background: statusColor(currentNoteStatus),
                }}
              />
              Last: {currentNoteStatus.toUpperCase()}
            </span>
          )}

          {timeEstimate && (
            <span style={styles.timeText}>{timeEstimate}</span>
          )}
        </div>

        {/* Privacy reminder */}
        <p style={styles.privacy}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M6 1L2 3.5V6C2 8.5 3.7 10.7 6 11.5C8.3 10.7 10 8.5 10 6V3.5L6 1Z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          All processing happens on this computer — your data never leaves your device.
        </p>
      </div>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "red":
      return "#dc2626";
    case "orange":
      return "#f59e0b";
    case "green":
      return "#16a34a";
    default:
      return "var(--slate-300)";
  }
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 560,
    margin: "0 auto",
  },
  card: {
    textAlign: "center" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.625rem",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.0625rem",
    fontWeight: 600,
    color: "var(--slate-700)",
    margin: 0,
  },
  barTrack: {
    width: "100%",
    height: 8,
    background: "var(--slate-100)",
    borderRadius: "var(--radius-full)",
    overflow: "hidden",
    marginBottom: "0.75rem",
  },
  barFill: {
    height: "100%",
    borderRadius: "var(--radius-full)",
    transition: "width 0.4s ease",
  },
  subRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap" as const,
    marginBottom: "1rem",
  },
  pctText: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--slate-500)",
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--slate-500)",
    background: "var(--slate-50)",
    border: "1px solid var(--slate-200)",
    borderRadius: "var(--radius-full)",
    padding: "0.125rem 0.5rem",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  timeText: {
    fontSize: "0.75rem",
    color: "var(--slate-400)",
  },
  privacy: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    fontSize: "0.75rem",
    color: "var(--slate-400)",
    margin: 0,
  },
};
