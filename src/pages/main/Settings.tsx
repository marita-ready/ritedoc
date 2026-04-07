import { useEffect, useState } from "react";
import {
  getSetting,
  setSetting,
  getCartridges,
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
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable copies
  const [editName, setEditName] = useState("");
  const [editOrg, setEditOrg] = useState("");
  const [editRole, setEditRole] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [name, org, role, activeRaw, carts] = await Promise.all([
        getSetting("user_name"),
        getSetting("user_organisation"),
        getSetting("user_role"),
        getSetting("active_cartridge_ids"),
        getCartridges(),
      ]);
      setUserName(name ?? "");
      setEditName(name ?? "");
      setUserOrg(org ?? "");
      setEditOrg(org ?? "");
      setUserRole(role ?? "");
      setEditRole(role ?? "");
      setCartridges(carts);

      let ids: number[] = [];
      if (activeRaw) {
        try {
          ids = JSON.parse(activeRaw);
        } catch {
          /* ignore */
        }
      }
      setActiveIds(ids);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleCartridge(id: number) {
    setActiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await setSetting("user_name", editName.trim());
      await setSetting("user_organisation", editOrg.trim());
      await setSetting("user_role", editRole);
      await setSetting("active_cartridge_ids", JSON.stringify(activeIds));
      setUserName(editName.trim());
      setUserOrg(editOrg.trim());
      setUserRole(editRole);
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
    editRole !== userRole;

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
        <p>Manage your profile and app preferences.</p>
      </div>

      {/* Profile section */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--slate-800)",
            margin: "0 0 1.25rem",
          }}
        >
          Profile
        </h3>

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              justifyContent: "flex-end",
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
        </div>
      </div>

      {/* Cartridges section */}
      <div className="card card-padded" style={{ marginBottom: "1.25rem" }}>
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--slate-800)",
            margin: "0 0 0.5rem",
          }}
        >
          Active Cartridges
        </h3>
        <p
          className="text-muted text-sm"
          style={{ margin: "0 0 1rem" }}
        >
          Toggle which NDIS service type cartridges are available when writing
          notes.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {cartridges.map((c) => {
            const isActive = activeIds.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => toggleCartridge(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  border: `1px solid ${
                    isActive ? "var(--blue-200)" : "var(--slate-200)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  background: isActive ? "var(--blue-50)" : "var(--white)",
                  transition: "all 0.12s ease",
                }}
              >
                {/* Toggle switch */}
                <div
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 10,
                    background: isActive
                      ? "var(--blue-600)"
                      : "var(--slate-200)",
                    position: "relative",
                    flexShrink: 0,
                    transition: "background 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 2,
                      left: isActive ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "var(--white)",
                      transition: "left 0.2s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </div>
                <div>
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
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1rem",
          }}
        >
          <button
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await setSetting(
                  "active_cartridge_ids",
                  JSON.stringify(activeIds)
                );
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              } catch (err) {
                console.error(err);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save Cartridge Selection
          </button>
        </div>
      </div>

      {/* About section */}
      <div className="card card-padded">
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--slate-800)",
            margin: "0 0 0.75rem",
          }}
        >
          About
        </h3>
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
