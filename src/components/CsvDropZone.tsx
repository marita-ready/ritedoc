/**
 * CsvDropZone — Drag-and-drop CSV file import component.
 *
 * Accepts .csv files only. On file drop/select, calls the `import_csv`
 * Tauri command and reports the parsed result to the parent.
 *
 * ZERO DATA STORAGE — file path is used transiently, nothing persisted.
 */

import { useCallback, useRef, useState } from "react";
import { importCsv, type CsvParseResult } from "../lib/commands";

interface CsvDropZoneProps {
  onImport: (result: CsvParseResult) => void;
}

export default function CsvDropZone({ onImport }: CsvDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please select a CSV file (.csv)");
        return;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        // In Tauri, File objects from drag-and-drop have a `path` property
        // that gives the native filesystem path.
        const filePath = (file as File & { path?: string }).path || file.name;
        const parsed = await importCsv(filePath);
        setResult(parsed);
        onImport(parsed);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : "Failed to parse CSV file. Please check the file format.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [onImport]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  // If already imported, show the result summary
  if (result) {
    return (
      <div style={styles.resultCard} className="card card-padded">
        <div style={styles.resultHeader}>
          <div style={styles.successIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="2" />
              <path
                d="M8 12L11 15L16 9"
                stroke="#16a34a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p style={styles.resultTitle}>CSV Imported Successfully</p>
            <p style={styles.resultSubtitle}>
              Ready to process {result.total_count} notes
            </p>
          </div>
        </div>

        <div style={styles.resultDetails}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Platform</span>
            <span style={styles.platformBadge}>{result.platform} detected</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Notes Found</span>
            <span style={styles.detailValue}>{result.total_count}</span>
          </div>
        </div>

        {result.warnings.length > 0 && (
          <div style={styles.warningsBox}>
            <p style={styles.warningsTitle}>Warnings</p>
            {result.warnings.map((w, i) => (
              <p key={i} style={styles.warningText}>
                {w}
              </p>
            ))}
          </div>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setResult(null);
            setError(null);
          }}
          style={{ marginTop: "0.75rem" }}
        >
          Choose a different file
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          ...styles.dropZone,
          ...(dragging ? styles.dropZoneDragging : {}),
          ...(loading ? styles.dropZoneLoading : {}),
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !loading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />

        {loading ? (
          <div style={styles.loadingContent}>
            <div className="loading-spinner" />
            <p style={styles.dropText}>Parsing CSV file...</p>
          </div>
        ) : (
          <>
            <div style={styles.dropIcon}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect
                  x="8"
                  y="6"
                  width="24"
                  height="28"
                  rx="3"
                  stroke="var(--blue-400)"
                  strokeWidth="2"
                />
                <path
                  d="M14 18H26M14 23H22M14 28H20"
                  stroke="var(--blue-300)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M20 6V14H28"
                  stroke="var(--blue-400)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p style={styles.dropText}>
              Drag and drop your CSV file here
            </p>
            <p style={styles.dropSubtext}>
              or{" "}
              <span style={styles.browseLink}>click to browse</span>
            </p>
            <p style={styles.formatHint}>.csv files only</p>
          </>
        )}
      </div>

      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  dropZone: {
    border: "2px dashed var(--slate-300)",
    borderRadius: "var(--radius-lg)",
    padding: "2.5rem 2rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s ease, background 0.2s ease",
    background: "var(--white)",
  },
  dropZoneDragging: {
    borderColor: "var(--blue-400)",
    background: "var(--blue-50)",
  },
  dropZoneLoading: {
    cursor: "default",
    opacity: 0.8,
  },
  dropIcon: {
    marginBottom: "0.75rem",
  },
  dropText: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--slate-700)",
    margin: "0 0 0.25rem",
  },
  dropSubtext: {
    fontSize: "0.875rem",
    color: "var(--slate-400)",
    margin: "0 0 0.5rem",
  },
  browseLink: {
    color: "var(--blue-600)",
    fontWeight: 500,
    textDecoration: "underline",
  },
  formatHint: {
    fontSize: "0.75rem",
    color: "var(--slate-300)",
    margin: 0,
  },
  loadingContent: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.75rem",
  },
  errorBox: {
    marginTop: "0.75rem",
    padding: "0.625rem 1rem",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-md)",
  },
  errorText: {
    fontSize: "0.8125rem",
    color: "#991b1b",
    margin: 0,
  },
  resultCard: {},
  resultHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  successIcon: {
    flexShrink: 0,
  },
  resultTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--slate-800)",
    margin: 0,
  },
  resultSubtitle: {
    fontSize: "0.8125rem",
    color: "var(--slate-400)",
    margin: "0.125rem 0 0",
  },
  resultDetails: {
    display: "flex",
    gap: "2rem",
    flexWrap: "wrap" as const,
    marginBottom: "0.75rem",
  },
  detailRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
  },
  detailLabel: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--slate-400)",
  },
  detailValue: {
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "var(--slate-800)",
  },
  platformBadge: {
    display: "inline-block",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--blue-700)",
    background: "var(--blue-50)",
    border: "1px solid var(--blue-200)",
    borderRadius: "var(--radius-full)",
    padding: "0.125rem 0.625rem",
  },
  warningsBox: {
    padding: "0.625rem 0.75rem",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "var(--radius-md)",
  },
  warningsTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#92400e",
    margin: "0 0 0.25rem",
  },
  warningText: {
    fontSize: "0.8125rem",
    color: "#78350f",
    margin: "0.125rem 0",
  },
};
