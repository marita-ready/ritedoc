import { useEffect, useState } from "react";
import {
  getSetting,
  setSetting,
  getCartridges,
  updateCartridgeActive,
  parseCartridgeConfig,
  type Cartridge,
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
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Editable copies
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editModel, setEditModel] = useState("llama3.2");
  const [editUrl, setEditUrl] = useState("http://localhost:11434");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [name, org, role, model, url, carts] = await Promise.all([
        getSetting("user_name"),
        getSetting("user_organisation"),
        getSetting("user_role"),
        getSetting("ollama_model"),
        getSetting("ollama_url"),
        getCartridges(),
      ]);
      setUserName(name ?? "");
      setEditName(name ?? "");
      setUserOrg(org ?? "");
      setEditOrg(org ?? "");
      setUserRole(role ?? "");
      setEditRole(role ?? "");
      const m = model ?? "llama3.2";
      const u = url ?? "http://localhost:11434";
      setOllamaModel(m);
      setEditModel(m);
      setOllamaUrl(u);
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
      await setSetting("ollama_model", editModel.trim());
      await setSetting("ollama_url", editUrl.trim());
      setUserName(editName.trim());
      setUserOrg(editOrg.trim());
      setUserRole(editRole);
      setOllamaModel(editModel.trim());
      setOllamaUrl(editUrl.trim());
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
    editModel.trim() !== ollamaModel ||
    editUrl.trim() !== ollamaUrl;

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

      {/* ── Ollama / Model ───────────────────────────────────── */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <SectionTitle>Rewriting Engine</SectionTitle>
        <p className="text-muted text-sm" style={{ margin: "0 0 1rem" }}>
          RiteDoc uses Ollama to run the rewriting pipeline locally. Make sure
          Ollama is installed and running before using the Rewrite tool.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <label className="label">Model</label>
            <input
              className="input"
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              placeholder="llama3.2"
            />
            <p
              className="text-muted"
              style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}
            >
              Must be pulled with{" "}
              <code
                style={{
                  background: "var(--slate-100)",
                  padding: "0.1em 0.3em",
                  borderRadius: 3,
                  fontSize: "0.75rem",
                }}
              >
                ollama pull {editModel || "llama3.2"}
              </code>
            </p>
          </div>
          <div>
            <label className="label">Ollama URL</label>
            <input
              className="input"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
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
          <span>0.1.0</span>
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
