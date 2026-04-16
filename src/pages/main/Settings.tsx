import { useEffect, useState } from "react";
import {
  getSetting,
  setSetting,
  getCartridges,
  updateCartridgeActive,
  parseCartridgeConfig,
  runSelfFix,
  sendDiagnosticReport,
  type Cartridge,
  type DiagnosticReport,
  type DiagnosticReportResult,
} from "../../lib/commands";

const ROLE_LABELS: Record<string, string> = {
  support_worker: "Support Worker",
  team_leader: "Team Leader",
  admin: "Admin",
};

export default function Settings() {
  const [userName, setUserName] = useState("");
  const [userOrg, setUserOrg] = useState("");
  const [userRole, setUserRole] = useState("");
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [serverUrl, setServerUrl] = useState("http://localhost:8080");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Diagnostics state
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagReport, setDiagReport] = useState<DiagnosticReport | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendResult, setSendResult] = useState<DiagnosticReportResult | null>(null);
  const [showDiagDetails, setShowDiagDetails] = useState(false);

  // Editable copies
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editUrl, setEditUrl] = useState("http://localhost:8080");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [name, org, role, url, carts] = await Promise.all([
        getSetting("user_name"),
        getSetting("user_organisation"),
        getSetting("user_role"),
        getSetting("llama_server_url"),
        getCartridges(),
      ]);
      setUserName(name ?? "");
      setEditName(name ?? "");
      setUserOrg(org ?? "");
      setEditOrg(org ?? "");
      setUserRole(role ?? "");
      setEditRole(role ?? "");
      const u = url ?? "http://localhost:8080";
      setServerUrl(u);
      setEditUrl(u);
      setCartridges(carts);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCartridge(id: number, currentlyActive: boolean) {
    setTogglingId(id);
    try {
      await updateCartridgeActive(id, !currentlyActive);
      setCartridges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: !currentlyActive } : c))
      );
    } catch (err) {
      console.error("Failed to toggle cartridge:", err);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await setSetting("user_name", editName.trim());
      await setSetting("user_organisation", editOrg.trim());
      await setSetting("user_role", editRole);
      await setSetting("llama_server_url", editUrl.trim());
      setUserName(editName.trim());
      setUserOrg(editOrg.trim());
      setUserRole(editRole);
      setServerUrl(editUrl.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    editName.trim() !== userName ||
    editOrg.trim() !== userOrg ||
    editRole !== userRole ||
    editUrl.trim() !== serverUrl;

  if (loading) {
    return (
      <div className="page">
        <p className="text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile, cartridges, and app preferences.</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────── */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <SectionTitle>Profile</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Organisation</label>
            <input
              className="input"
              value={editOrg}
              onChange={(e) => setEditOrg(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="select"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
            >
              <option value="support_worker">Support Worker</option>
              <option value="team_leader">Team Leader</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Rewriting Engine (Nanoclaw) ──────────────────────── */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <SectionTitle>Rewriting Engine</SectionTitle>
        <p className="text-muted text-sm" style={{ margin: "0 0 1rem" }}>
          RiteDoc uses Nanoclaw — a local Docker-based server running the
          Phi-4-mini model — to rewrite notes. Start it with{" "}
          <code
            style={{
              background: "var(--slate-100)",
              padding: "0.1em 0.3em",
              borderRadius: 3,
              fontSize: "0.75rem",
            }}
          >
            docker compose up -d
          </code>{" "}
          inside the <code style={{ background: "var(--slate-100)", padding: "0.1em 0.3em", borderRadius: 3, fontSize: "0.75rem" }}>nanoclaw/</code> directory.
        </p>
        <div>
          <label className="label">Server URL</label>
          <input
            className="input"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="http://localhost:8080"
          />
          <p
            className="text-muted"
            style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}
          >
            Default: http://localhost:8080 — only change if you have moved the
            Nanoclaw container to a different port.
          </p>
        </div>
      </div>

      {/* ── Save profile + engine settings ──────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          justifyContent: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        {saved && (
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--success)",
              fontWeight: 500,
            }}
          >
            Settings saved
          </span>
        )}
        <button
          className="btn btn-primary"
          disabled={!hasChanges || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* ── Diagnostics ─────────────────────────────────────── */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <SectionTitle>System Diagnostics</SectionTitle>
        <p className="text-muted text-sm" style={{ margin: "0 0 1rem" }}>
          Run a health check to verify RAM, disk space, Nanoclaw server status,
          and cartridge integrity. All diagnostics run locally — no data leaves
          your device.
        </p>

        {/* Run Diagnostics button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: diagReport ? "1rem" : 0 }}>
          <button
            className="btn btn-secondary"
            disabled={diagRunning}
            onClick={async () => {
              setDiagRunning(true);
              setSendResult(null);
              try {
                const report = await runSelfFix();
                setDiagReport(report);
                setShowDiagDetails(false);
              } catch (err) {
                console.error("Diagnostics failed:", err);
              } finally {
                setDiagRunning(false);
              }
            }}
          >
            {diagRunning ? "Running..." : "Run Diagnostics"}
          </button>
          {diagReport && (
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: diagReport.all_ok ? "var(--success)" : "var(--error)",
              }}
            >
              {diagReport.all_ok ? "All systems operational" : diagReport.summary}
            </span>
          )}
        </div>

        {/* Diagnostic results */}
        {diagReport && (
          <div style={{ marginTop: "0.75rem" }}>
            {/* Quick status grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              {[
                { label: "RAM", ok: diagReport.ram_ok, detail: `${diagReport.ram_available_gb.toFixed(1)} GB free` },
                { label: "Disk", ok: diagReport.disk_ok, detail: `${diagReport.disk_available_gb.toFixed(1)} GB free` },
                { label: "Nanoclaw", ok: diagReport.nanoclaw_ok, detail: diagReport.nanoclaw_ok ? "Reachable" : "Not reachable" },
                { label: "Cartridges", ok: diagReport.cartridges_ok, detail: diagReport.cartridges_ok ? "Valid" : "Check needed" },
                { label: "Licence", ok: diagReport.licence_ok, detail: diagReport.licence_ok ? "Activated" : "Not activated" },
              ].map(({ label, ok, detail }) => (
                <div
                  key={label}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    background: ok ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.125rem" }}>
                    <span style={{ fontSize: "0.75rem" }}>{ok ? "✓" : "✗"}</span>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: ok ? "#166534" : "#991b1b" }}>
                      {label}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: ok ? "#15803d" : "#b91c1c" }}>{detail}</span>
                </div>
              ))}
            </div>

            {/* Issues list */}
            {diagReport.issues.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <button
                  onClick={() => setShowDiagDetails(!showDiagDetails)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    color: "var(--blue-600)",
                    fontWeight: 500,
                    marginBottom: showDiagDetails ? "0.5rem" : 0,
                  }}
                >
                  {showDiagDetails ? "Hide" : "Show"} {diagReport.issues.length} issue{diagReport.issues.length !== 1 ? "s" : ""}
                </button>
                {showDiagDetails && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {diagReport.issues.map((issue, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "0.625rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          background: issue.severity === "critical" ? "#fef2f2" : issue.severity === "warning" ? "#fffbeb" : "var(--slate-50)",
                          border: `1px solid ${issue.severity === "critical" ? "#fecaca" : issue.severity === "warning" ? "#fde68a" : "var(--slate-200)"}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              padding: "0.125rem 0.375rem",
                              borderRadius: 3,
                              background: issue.severity === "critical" ? "#fee2e2" : issue.severity === "warning" ? "#fef3c7" : "var(--slate-100)",
                              color: issue.severity === "critical" ? "#991b1b" : issue.severity === "warning" ? "#92400e" : "var(--slate-500)",
                            }}
                          >
                            {issue.severity}
                          </span>
                          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--slate-700)" }}>
                            {issue.category}
                          </span>
                        </div>
                        <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", color: "var(--slate-600)" }}>
                          {issue.description}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--slate-500)" }}>
                          <strong>Action:</strong> {issue.action_taken}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mode downgrade recommendation */}
            {diagReport.recommend_mode_downgrade && (
              <div
                style={{
                  padding: "0.625rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  marginBottom: "0.75rem",
                  fontSize: "0.8125rem",
                  color: "#92400e",
                }}
              >
                <strong>Recommendation:</strong> Switch from Turbo to Standard mode to reduce memory usage.
              </div>
            )}

            {/* Send Diagnostic Report button */}
            <div
              style={{
                borderTop: "1px solid var(--slate-200)",
                paddingTop: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              <p className="text-muted text-sm" style={{ margin: "0 0 0.625rem" }}>
                Send a technical report to the RiteDoc team to help diagnose issues.
                This report contains <strong>only</strong> hardware specs, system health
                data, and error codes — <strong>never</strong> note content, participant
                names, or any personal information.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button
                  className="btn btn-secondary"
                  disabled={sendingReport}
                  onClick={async () => {
                    setSendingReport(true);
                    setSendResult(null);
                    try {
                      const result = await sendDiagnosticReport([]);
                      setSendResult(result);
                    } catch (err) {
                      setSendResult({
                        success: false,
                        message: String(err),
                        report_id: null,
                        sent_at: new Date().toISOString(),
                      });
                    } finally {
                      setSendingReport(false);
                    }
                  }}
                >
                  {sendingReport ? "Sending..." : "Send Diagnostic Report"}
                </button>
                {sendResult && (
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      color: sendResult.success ? "var(--success)" : "var(--error)",
                    }}
                  >
                    {sendResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Cartridges ───────────────────────────────────────── */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <SectionTitle>Cartridges</SectionTitle>
        <p className="text-muted text-sm" style={{ margin: "0 0 1rem" }}>
          Toggle which NDIS service type cartridges are available in the Rewrite
          tool. Click a cartridge to view its compliance rules and format
          requirements.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cartridges.map((c) => {
            const isExpanded = expandedId === c.id;
            const config = parseCartridgeConfig(c.config_json);
            const isToggling = togglingId === c.id;

            return (
              <div
                key={c.id}
                style={{
                  border: `1px solid ${
                    c.is_active ? "var(--blue-200)" : "var(--slate-200)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  background: c.is_active ? "var(--blue-50)" : "var(--white)",
                  overflow: "hidden",
                  transition: "border-color 0.12s ease, background 0.12s ease",
                }}
              >
                {/* Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.625rem 0.875rem",
                  }}
                >
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggleCartridge(c.id, c.is_active)}
                    disabled={isToggling}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: isToggling ? "wait" : "pointer",
                      flexShrink: 0,
                    }}
                    title={c.is_active ? "Deactivate cartridge" : "Activate cartridge"}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        background: c.is_active
                          ? "var(--blue-600)"
                          : "var(--slate-200)",
                        position: "relative",
                        transition: "background 0.2s ease",
                        opacity: isToggling ? 0.6 : 1,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 2,
                          left: c.is_active ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "var(--white)",
                          transition: "left 0.2s ease",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                        }}
                      />
                    </div>
                  </button>

                  {/* Name + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--slate-700)",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--slate-400)",
                        marginTop: 1,
                      }}
                    >
                      {c.description}
                    </div>
                  </div>

                  {/* Expand/collapse button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : c.id)
                    }
                    style={{ flexShrink: 0 }}
                  >
                    {isExpanded ? "Hide Details" : "View Details"}
                  </button>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: "1px solid var(--slate-200)",
                      padding: "1rem 0.875rem",
                      background: "var(--white)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <ConfigSection
                        title="Compliance Rules"
                        items={config.compliance_rules}
                        ordered
                      />
                      <ConfigSection
                        title="Required Fields"
                        items={config.required_fields}
                      />
                      <ConfigSection
                        title="Tone Guidelines"
                        items={config.tone_guidelines}
                      />
                      <ConfigSection
                        title="Prohibited Terms"
                        items={config.prohibited_terms}
                        variant="warning"
                      />
                    </div>

                    {config.format_template && (
                      <div style={{ marginTop: "1rem" }}>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--slate-400)",
                            margin: "0 0 0.375rem",
                          }}
                        >
                          Output Format Template
                        </p>
                        <pre
                          style={{
                            background: "var(--slate-50)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.75rem",
                            fontSize: "0.75rem",
                            color: "var(--slate-600)",
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          {config.format_template}
                        </pre>
                      </div>
                    )}

                    {config.example_output && (
                      <div style={{ marginTop: "1rem" }}>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--slate-400)",
                            margin: "0 0 0.375rem",
                          }}
                        >
                          Example Output
                        </p>
                        <pre
                          style={{
                            background: "var(--slate-50)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.75rem",
                            fontSize: "0.75rem",
                            color: "var(--slate-600)",
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          {config.example_output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── About ────────────────────────────────────────────── */}
      <div className="card card-padded">
        <SectionTitle>About</SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr",
            gap: "0.5rem 1rem",
            fontSize: "0.875rem",
          }}
        >
          <span className="text-muted">App</span>
          <span>RiteDoc</span>
          <span className="text-muted">Version</span>
          <span>1.0.0</span>
          <span className="text-muted">Framework</span>
          <span>Tauri 2.0</span>
          <span className="text-muted">Role</span>
          <span>{ROLE_LABELS[userRole] ?? userRole}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: "0.9375rem",
        fontWeight: 600,
        color: "var(--slate-800)",
        margin: "0 0 1rem",
      }}
    >
      {children}
    </h3>
  );
}

function ConfigSection({
  title,
  items,
  ordered = false,
  variant,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
  variant?: "warning";
}) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: variant === "warning" ? "#b45309" : "var(--slate-400)",
          margin: "0 0 0.375rem",
        }}
      >
        {title}
      </p>
      {ordered ? (
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: "0.8125rem",
                color: "var(--slate-600)",
                lineHeight: 1.5,
              }}
            >
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: "0.8125rem",
                color:
                  variant === "warning" ? "#92400e" : "var(--slate-600)",
                lineHeight: 1.5,
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
