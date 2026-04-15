/**
 * Activation — Licence Activation & Regulation Sync Status
 *
 * Displays:
 *   - Hardware ID with copy button
 *   - Licence key input (RDOC-XXXX-XXXX-XXXX-XXXX)
 *   - Activation status (key, subscription type, date, fingerprint)
 *   - Deactivate button
 *   - Regulation Sync status (last synced, cartridge version)
 *
 * Zero data persistence beyond what activation.rs already handles.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getHardwareProfile,
  activateLicence,
  checkActivation,
  deactivateLicence,
  getSyncStatus,
  checkRegulationSync,
  type HardwareProfile,
  type ActivationState,
  type SyncStatus,
  type SyncCheckResult,
} from "../../lib/commands";

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────

const styles = {
  page: {
    padding: "2rem",
    maxWidth: 720,
    margin: "0 auto",
  } as React.CSSProperties,

  header: {
    marginBottom: "2rem",
  } as React.CSSProperties,

  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-primary, #1a1a2e)",
    margin: 0,
  } as React.CSSProperties,

  subtitle: {
    fontSize: "0.875rem",
    color: "var(--text-secondary, #6b7280)",
    marginTop: "0.25rem",
  } as React.CSSProperties,

  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "1.5rem",
    marginBottom: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid var(--border-light, #e5e7eb)",
  } as React.CSSProperties,

  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--text-primary, #1a1a2e)",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } as React.CSSProperties,

  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.5rem 0",
    borderBottom: "1px solid var(--border-light, #f3f4f6)",
  } as React.CSSProperties,

  fieldLabel: {
    fontSize: "0.8125rem",
    color: "var(--text-secondary, #6b7280)",
    fontWeight: 500,
  } as React.CSSProperties,

  fieldValue: {
    fontSize: "0.8125rem",
    color: "var(--text-primary, #1a1a2e)",
    fontFamily: "monospace",
    background: "var(--bg-secondary, #f9fafb)",
    padding: "0.25rem 0.5rem",
    borderRadius: 6,
    maxWidth: "60%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  copyBtn: {
    background: "none",
    border: "1px solid var(--border-light, #e5e7eb)",
    borderRadius: 6,
    padding: "0.25rem 0.625rem",
    fontSize: "0.75rem",
    color: "var(--primary, #2563eb)",
    cursor: "pointer",
    marginLeft: "0.5rem",
    fontWeight: 500,
  } as React.CSSProperties,

  inputGroup: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    marginTop: "0.75rem",
  } as React.CSSProperties,

  keyInput: {
    flex: 1,
    padding: "0.625rem 0.875rem",
    fontSize: "0.875rem",
    fontFamily: "monospace",
    border: "1px solid var(--border-light, #d1d5db)",
    borderRadius: 8,
    outline: "none",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  } as React.CSSProperties,

  btnPrimary: {
    padding: "0.625rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#fff",
    background: "var(--primary, #2563eb)",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  btnDanger: {
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#dc2626",
    background: "none",
    border: "1px solid #fecaca",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  btnSecondary: {
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--text-secondary, #6b7280)",
    background: "none",
    border: "1px solid var(--border-light, #d1d5db)",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  statusBadge: (color: string) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      gap: "0.375rem",
      padding: "0.25rem 0.75rem",
      borderRadius: 20,
      fontSize: "0.75rem",
      fontWeight: 600,
      background: color === "green" ? "#dcfce7" : color === "orange" ? "#fff7ed" : "#f3f4f6",
      color: color === "green" ? "#15803d" : color === "orange" ? "#c2410c" : "#6b7280",
    }) as React.CSSProperties,

  message: (type: "success" | "error" | "info") =>
    ({
      padding: "0.75rem 1rem",
      borderRadius: 8,
      fontSize: "0.8125rem",
      marginTop: "0.75rem",
      background:
        type === "success" ? "#dcfce7" : type === "error" ? "#fef2f2" : "#eff6ff",
      color:
        type === "success" ? "#15803d" : type === "error" ? "#dc2626" : "#2563eb",
      border: `1px solid ${
        type === "success" ? "#bbf7d0" : type === "error" ? "#fecaca" : "#bfdbfe"
      }`,
    }) as React.CSSProperties,

  syncRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.375rem 0",
  } as React.CSSProperties,

  privacyNote: {
    fontSize: "0.75rem",
    color: "var(--text-secondary, #9ca3af)",
    marginTop: "1.5rem",
    textAlign: "center" as const,
    lineHeight: 1.5,
  } as React.CSSProperties,
};

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export default function Activation() {
  // Hardware profile
  const [hardware, setHardware] = useState<HardwareProfile | null>(null);
  const [hwCopied, setHwCopied] = useState(false);

  // Activation state
  const [activation, setActivation] = useState<ActivationState | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // ── Load on mount ──────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [hw, act, sync] = await Promise.all([
        getHardwareProfile(),
        checkActivation(),
        getSyncStatus(),
      ]);
      setHardware(hw);
      setActivation(act);
      setSyncStatus(sync);
    } catch (e) {
      console.error("Failed to load activation data:", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Copy hardware ID ───────────────────────
  const copyHardwareId = () => {
    if (!hardware) return;
    navigator.clipboard.writeText(hardware.fingerprint);
    setHwCopied(true);
    setTimeout(() => setHwCopied(false), 2000);
  };

  // ── Activate ───────────────────────────────
  const handleActivate = async () => {
    const trimmed = keyInput.trim().toUpperCase();
    if (!trimmed) {
      setActivationMsg({ type: "error", text: "Please enter a licence key." });
      return;
    }
    setActivating(true);
    setActivationMsg(null);
    try {
      const result = await activateLicence(trimmed);
      if (result.success) {
        setActivationMsg({
          type: "success",
          text: result.message,
        });
        setKeyInput("");
        // Refresh activation state
        const act = await checkActivation();
        setActivation(act);
      } else {
        setActivationMsg({ type: "error", text: result.message });
      }
    } catch (e) {
      setActivationMsg({
        type: "error",
        text: `Activation failed: ${e}`,
      });
    } finally {
      setActivating(false);
    }
  };

  // ── Deactivate ─────────────────────────────
  const handleDeactivate = async () => {
    try {
      await deactivateLicence();
      setActivation(null);
      setActivationMsg({
        type: "info",
        text: "Licence deactivated. The app will continue to work with built-in regulation data.",
      });
    } catch (e) {
      setActivationMsg({
        type: "error",
        text: `Deactivation failed: ${e}`,
      });
    }
  };

  // ── Check for regulation sync ──────────────
  const handleCheckSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result: SyncCheckResult = await checkRegulationSync();
      setSyncMsg(result.message);
      // Refresh sync status
      const sync = await getSyncStatus();
      setSyncStatus(sync);
    } catch (e) {
      setSyncMsg(`Sync check failed: ${e}`);
    } finally {
      setSyncing(false);
    }
  };

  // ── Key input formatting ───────────────────
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    // Auto-insert dashes after RDOC and every 4 chars
    const parts = val.replace(/-/g, "").match(/^(RDOC)?(.{0,4})(.{0,4})(.{0,4})(.{0,4})/);
    if (parts) {
      const segments = [parts[1] || "", parts[2] || "", parts[3] || "", parts[4] || "", parts[5] || ""].filter(Boolean);
      val = segments.join("-");
    }
    setKeyInput(val);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Licence Activation</h1>
        <p style={styles.subtitle}>
          Manage your RiteDoc licence and regulation sync status.
        </p>
      </div>

      {/* ── Hardware ID Card ────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="4" width="12" height="12" rx="2" stroke="#2563eb" strokeWidth="1.5" />
            <rect x="7" y="7" width="6" height="6" rx="1" stroke="#2563eb" strokeWidth="1.5" />
            <line x1="10" y1="2" x2="10" y2="4" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="10" y1="16" x2="10" y2="18" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="10" x2="4" y2="10" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="16" y1="10" x2="18" y2="10" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Hardware Profile
        </div>

        {hardware ? (
          <>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Hardware ID</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={styles.fieldValue}>{hardware.fingerprint}</span>
                <button style={styles.copyBtn} onClick={copyHardwareId}>
                  {hwCopied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>CPU</span>
              <span style={styles.fieldValue}>{hardware.cpu_brand}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Cores</span>
              <span style={styles.fieldValue}>{hardware.cpu_cores}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>RAM</span>
              <span style={styles.fieldValue}>{hardware.ram_gb} GB</span>
            </div>
            <div style={{ ...styles.fieldRow, borderBottom: "none" }}>
              <span style={styles.fieldLabel}>Recommended Mode</span>
              <span
                style={styles.statusBadge(
                  hardware.recommended_mode === "turbo" ? "green" : "orange"
                )}
              >
                {hardware.recommended_mode === "turbo" ? "Turbo (3-agent)" : "Standard (2-agent)"}
              </span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
            Loading hardware profile...
          </p>
        )}
      </div>

      {/* ── Activation Card ─────────────────── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="8" width="14" height="9" rx="2" stroke="#2563eb" strokeWidth="1.5" />
            <path d="M7 8V6C7 4.34 8.34 3 10 3C11.66 3 13 4.34 13 6V8" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="10" cy="12.5" r="1.5" fill="#2563eb" />
          </svg>
          Licence Status
        </div>

        {activation ? (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <span style={styles.statusBadge("green")}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Activated
              </span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Licence Key</span>
              <span style={styles.fieldValue}>{activation.key_code}</span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Subscription</span>
              <span style={styles.fieldValue}>
                {activation.subscription_type.charAt(0).toUpperCase() +
                  activation.subscription_type.slice(1)}
              </span>
            </div>
            <div style={styles.fieldRow}>
              <span style={styles.fieldLabel}>Activated</span>
              <span style={styles.fieldValue}>{activation.activated_at}</span>
            </div>
            <div style={{ ...styles.fieldRow, borderBottom: "none" }}>
              <span style={styles.fieldLabel}>Hardware Fingerprint</span>
              <span style={styles.fieldValue}>
                {activation.hardware_fingerprint}
              </span>
            </div>
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button style={styles.btnDanger} onClick={handleDeactivate}>
                Deactivate Licence
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary, #6b7280)",
                marginBottom: "0.75rem",
              }}
            >
              Enter your licence key to activate RiteDoc. Format:{" "}
              <code
                style={{
                  background: "#f3f4f6",
                  padding: "0.125rem 0.375rem",
                  borderRadius: 4,
                  fontSize: "0.8125rem",
                }}
              >
                RDOC-XXXX-XXXX-XXXX-XXXX
              </code>
            </p>
            <div style={styles.inputGroup}>
              <input
                type="text"
                value={keyInput}
                onChange={handleKeyChange}
                placeholder="RDOC-XXXX-XXXX-XXXX-XXXX"
                style={styles.keyInput}
                maxLength={24}
                spellCheck={false}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleActivate();
                }}
              />
              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: activating ? 0.7 : 1,
                }}
                onClick={handleActivate}
                disabled={activating}
              >
                {activating ? "Activating..." : "Activate"}
              </button>
            </div>
          </>
        )}

        {activationMsg && (
          <div style={styles.message(activationMsg.type)}>
            {activationMsg.text}
          </div>
        )}
      </div>

      {/* ── Regulation Sync Card ────────────── */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M14.5 3.5L16.5 5.5L14.5 7.5"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.5 10V8.5C3.5 6.84 4.84 5.5 6.5 5.5H16.5"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M5.5 16.5L3.5 14.5L5.5 12.5"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5 10V11.5C16.5 13.16 15.16 14.5 13.5 14.5H3.5"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Regulation Sync
        </div>

        {syncStatus ? (
          <>
            <div style={styles.syncRow}>
              <span style={styles.fieldLabel}>Cartridge Version</span>
              <span style={styles.fieldValue}>v{syncStatus.current_version}</span>
            </div>
            <div style={styles.syncRow}>
              <span style={styles.fieldLabel}>Last Synced</span>
              <span
                style={{
                  fontSize: "0.8125rem",
                  color:
                    syncStatus.last_synced === "Never"
                      ? "#9ca3af"
                      : "var(--text-primary, #1a1a2e)",
                }}
              >
                {syncStatus.last_synced}
              </span>
            </div>
            <div style={styles.syncRow}>
              <span style={styles.fieldLabel}>Last Checked</span>
              <span
                style={{
                  fontSize: "0.8125rem",
                  color:
                    syncStatus.last_checked === "Never"
                      ? "#9ca3af"
                      : "var(--text-primary, #1a1a2e)",
                }}
              >
                {syncStatus.last_checked}
              </span>
            </div>
            {syncStatus.update_available && (
              <div
                style={{
                  ...styles.message("info"),
                  marginTop: "0.75rem",
                  marginBottom: 0,
                }}
              >
                Update available: v{syncStatus.latest_version}
              </div>
            )}
            <div style={{ marginTop: "1rem" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-secondary, #9ca3af)",
                }}
              >
                {syncStatus.message}
              </span>
            </div>
            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
              <button
                style={{
                  ...styles.btnSecondary,
                  opacity: syncing ? 0.7 : 1,
                }}
                onClick={handleCheckSync}
                disabled={syncing}
              >
                {syncing ? "Checking..." : "Check for Updates"}
              </button>
            </div>
            {syncMsg && (
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary, #6b7280)",
                  marginTop: "0.5rem",
                }}
              >
                {syncMsg}
              </div>
            )}
          </>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "#9ca3af" }}>
            Loading sync status...
          </p>
        )}
      </div>

      {/* ── Privacy Note ────────────────────── */}
      <p style={styles.privacyNote}>
        Your licence key is stored locally on this device only. Hardware
        fingerprinting uses CPU, RAM, and machine ID — no personal data is
        collected. Regulation sync uses bank-grade encryption and never
        transmits your licence key.
      </p>
    </div>
  );
}
