/**
 * IncidentPackage — displays the Filter 5 output for RED notes.
 *
 * Shows:
 *   1. Header: "Procedural Alignment Check: Based on NDIS Practice Standards v1.0.0"
 *   2. Procedural compliance summary with visual indicator
 *   3. Documented steps (green checkmarks) and gaps (red X + [MANDATORY PROCEDURE MISSING: ...])
 *   4. Pre-filled incident forms as cards
 *   5. Required notifications with timeframes
 *   6. Footer disclaimer
 *
 * ZERO DATA STORAGE — purely presentational.
 */

import { useCallback, useState } from "react";
import type {
  IncidentPackage as IncidentPackageType,
  PreFilledForm,
  StepResult,
} from "../lib/commands";

interface IncidentPackageProps {
  pkg: IncidentPackageType;
}

const MISSING_RE = /(\[MISSING:\s*[^\]]+\])/g;
const MANDATORY_RE = /(\[MANDATORY PROCEDURE MISSING:\s*[^\]]+\])/g;

export default function IncidentPackage({ pkg }: IncidentPackageProps) {
  const { procedural_alignment: pa } = pkg;
  const compliancePercent =
    pa.steps_total > 0
      ? Math.round((pa.steps_documented / pa.steps_total) * 100)
      : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M9 1.5L1.5 16.5H16.5L9 1.5Z"
            stroke="#dc2626"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9 7V10.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="9" cy="13" r="0.75" fill="#dc2626" />
        </svg>
        <h3 style={styles.headerTitle}>{pkg.header}</h3>
      </div>

      {/* Procedural Compliance Summary */}
      <div style={styles.complianceSection}>
        <div style={styles.complianceSummary}>
          <p style={styles.complianceText}>
            <strong>{pa.steps_documented}</strong> of{" "}
            <strong>{pa.steps_total}</strong> mandatory steps documented
          </p>
          <span style={styles.compliancePercent}>{compliancePercent}%</span>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${compliancePercent}%`,
              background:
                compliancePercent >= 80
                  ? "#16a34a"
                  : compliancePercent >= 50
                    ? "#f59e0b"
                    : "#dc2626",
            }}
          />
        </div>

        {/* Step-by-step results */}
        <div style={styles.stepsList}>
          {pa.steps.map((step, i) => (
            <StepRow key={i} step={step} />
          ))}
        </div>
      </div>

      {/* Pre-filled Incident Forms */}
      {pkg.incident_forms.length > 0 && (
        <div style={styles.formsSection}>
          <p style={styles.sectionTitle}>Pre-Filled Incident Forms</p>
          {pkg.incident_forms.map((form, i) => (
            <FormCard key={i} form={form} />
          ))}
        </div>
      )}

      {/* Required Notifications */}
      {pkg.required_notifications.length > 0 && (
        <div style={styles.notificationsSection}>
          <p style={styles.sectionTitle}>Required Notifications</p>
          <div style={styles.timeframeBadge}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#dc2626" strokeWidth="1" />
              <path d="M7 4V7.5L9.5 9" stroke="#dc2626" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span>Reporting timeframe: <strong>{pkg.reporting_timeframe}</strong></span>
          </div>
          {pkg.required_notifications.map((group, i) => (
            <div key={i} style={styles.notificationGroup}>
              <p style={styles.notificationGroupTitle}>
                {group.group_type === "internal"
                  ? "Internal Notifications"
                  : "External Notifications"}
              </p>
              <ul style={styles.notificationList}>
                {group.recipients.map((r, j) => (
                  <li key={j} style={styles.notificationItem}>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Legislative References */}
      {pkg.legislative_references.length > 0 && (
        <div style={styles.referencesSection}>
          <p style={styles.sectionTitle}>Legislative References</p>
          <ul style={styles.referencesList}>
            {pkg.legislative_references.map((ref_, i) => (
              <li key={i} style={styles.referenceItem}>
                {ref_}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div style={styles.disclaimer}>
        <p style={styles.disclaimerText}>{pkg.disclaimer}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  StepRow sub-component
// ─────────────────────────────────────────────

function StepRow({ step }: { step: StepResult }) {
  return (
    <div style={styles.stepRow}>
      <div style={styles.stepIcon}>
        {step.documented ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" />
            <path
              d="M5 8L7 10L11 6"
              stroke="#16a34a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" fill="#fef2f2" stroke="#dc2626" strokeWidth="1" />
            <path
              d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
      <div style={styles.stepContent}>
        <p
          style={{
            ...styles.stepAction,
            color: step.documented ? "var(--slate-700)" : "#991b1b",
          }}
        >
          {step.action}
        </p>
        <p style={styles.stepCategory}>{step.category_name}</p>
        {step.documented && step.evidence_found.length > 0 && (
          <p style={styles.stepEvidence}>
            Evidence: {step.evidence_found.map((e) => `"${e}"`).join(", ")}
          </p>
        )}
        {!step.documented && step.gap_text && (
          <p style={styles.stepGap}>{renderMandatoryGap(step.gap_text)}</p>
        )}
      </div>
    </div>
  );
}

function renderMandatoryGap(text: string): React.ReactNode {
  const parts = text.split(MANDATORY_RE);
  return parts.map((part, i) => {
    if (MANDATORY_RE.test(part)) {
      MANDATORY_RE.lastIndex = 0;
      return (
        <span key={i} style={styles.mandatoryBracket}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─────────────────────────────────────────────
//  FormCard sub-component
// ─────────────────────────────────────────────

function FormCard({ form }: { form: PreFilledForm }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const lines = [
      `Form: ${form.form_name}`,
      `Authority: ${form.authority}`,
      "",
      ...form.fields.map(
        (f) => `${f.label}: ${f.value}${f.required ? " (required)" : ""}`
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }, [form]);

  return (
    <div style={styles.formCard}>
      <div style={styles.formHeader}>
        <div>
          <p style={styles.formName}>{form.form_name}</p>
          <p style={styles.formAuthority}>{form.authority}</p>
        </div>
        <button
          style={styles.copyFormBtn}
          onClick={handleCopy}
          title="Copy form to clipboard"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="#16a34a"
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
              Copy Form
            </>
          )}
        </button>
      </div>
      <div style={styles.formFields}>
        {form.fields.map((field, i) => {
          const isMissing = MISSING_RE.test(field.value);
          MISSING_RE.lastIndex = 0;
          return (
            <div key={i} style={styles.formField}>
              <span style={styles.fieldLabel}>
                {field.label}
                {field.required && <span style={styles.requiredStar}> *</span>}
              </span>
              <span
                style={{
                  ...styles.fieldValue,
                  ...(isMissing ? styles.fieldMissing : {}),
                  ...(field.auto_filled ? styles.fieldAutoFilled : {}),
                }}
              >
                {field.value}
              </span>
            </div>
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
  container: {
    marginTop: "0.75rem",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    background: "#fff",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: "#fef2f2",
    borderBottom: "1px solid #fca5a5",
  },
  headerTitle: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#991b1b",
    margin: 0,
  },
  complianceSection: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--slate-100)",
  },
  complianceSummary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.375rem",
  },
  complianceText: {
    fontSize: "0.8125rem",
    color: "var(--slate-700)",
    margin: 0,
  },
  compliancePercent: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "var(--slate-600)",
  },
  progressTrack: {
    height: 6,
    background: "var(--slate-100)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: "0.75rem",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    transition: "width 0.3s ease",
  },
  stepsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.5rem",
  },
  stepRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "flex-start",
  },
  stepIcon: {
    flexShrink: 0,
    paddingTop: 1,
  },
  stepContent: {
    flex: 1,
    minWidth: 0,
  },
  stepAction: {
    fontSize: "0.8125rem",
    fontWeight: 500,
    margin: 0,
    lineHeight: 1.4,
  },
  stepCategory: {
    fontSize: "0.6875rem",
    color: "var(--slate-400)",
    margin: "0.0625rem 0 0",
  },
  stepEvidence: {
    fontSize: "0.6875rem",
    color: "#166534",
    margin: "0.125rem 0 0",
    fontStyle: "italic" as const,
  },
  stepGap: {
    fontSize: "0.75rem",
    color: "#991b1b",
    margin: "0.125rem 0 0",
  },
  mandatoryBracket: {
    color: "#991b1b",
    fontWeight: 600,
    background: "#fef2f2",
    borderRadius: 3,
    padding: "0 0.125rem",
  },
  formsSection: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--slate-100)",
  },
  sectionTitle: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
    color: "var(--slate-400)",
    margin: "0 0 0.5rem",
  },
  formCard: {
    border: "1px solid var(--slate-200)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    marginBottom: "0.5rem",
  },
  formHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "0.625rem 0.75rem",
    background: "var(--slate-50)",
    borderBottom: "1px solid var(--slate-100)",
  },
  formName: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--slate-800)",
    margin: 0,
  },
  formAuthority: {
    fontSize: "0.6875rem",
    color: "var(--slate-400)",
    margin: "0.0625rem 0 0",
  },
  copyFormBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.6875rem",
    fontWeight: 500,
    color: "var(--slate-500)",
    background: "var(--white)",
    border: "1px solid var(--slate-200)",
    borderRadius: "var(--radius-sm)",
    padding: "0.25rem 0.5rem",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  formFields: {
    padding: "0.5rem 0.75rem",
  },
  formField: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "0.375rem 0",
    borderBottom: "1px solid var(--slate-50)",
    gap: "1rem",
  },
  fieldLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--slate-600)",
    flexShrink: 0,
  },
  requiredStar: {
    color: "#dc2626",
    fontWeight: 700,
  },
  fieldValue: {
    fontSize: "0.75rem",
    color: "var(--slate-700)",
    textAlign: "right" as const,
    wordBreak: "break-word" as const,
  },
  fieldMissing: {
    color: "#b45309",
    fontStyle: "italic" as const,
    fontWeight: 500,
    background: "#fffbeb",
    borderRadius: 3,
    padding: "0 0.25rem",
  },
  fieldAutoFilled: {
    color: "var(--slate-800)",
    fontWeight: 500,
  },
  notificationsSection: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--slate-100)",
  },
  timeframeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    fontSize: "0.75rem",
    color: "#991b1b",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "var(--radius-full)",
    padding: "0.25rem 0.625rem",
    marginBottom: "0.625rem",
  },
  notificationGroup: {
    marginBottom: "0.375rem",
  },
  notificationGroupTitle: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--slate-600)",
    margin: "0 0 0.25rem",
  },
  notificationList: {
    margin: 0,
    paddingLeft: "1.25rem",
    listStyleType: "disc",
  },
  notificationItem: {
    fontSize: "0.75rem",
    color: "var(--slate-600)",
    lineHeight: 1.6,
  },
  referencesSection: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--slate-100)",
  },
  referencesList: {
    margin: 0,
    paddingLeft: "1.25rem",
    listStyleType: "disc",
  },
  referenceItem: {
    fontSize: "0.6875rem",
    color: "var(--slate-500)",
    lineHeight: 1.6,
  },
  disclaimer: {
    padding: "0.625rem 1rem",
    background: "var(--slate-50)",
  },
  disclaimerText: {
    fontSize: "0.6875rem",
    color: "var(--slate-400)",
    fontStyle: "italic" as const,
    margin: 0,
    textAlign: "center" as const,
  },
};
