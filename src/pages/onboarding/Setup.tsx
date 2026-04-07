import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSetting } from "../../lib/commands";
import Logo from "../../components/Logo";
import "../../styles/onboarding.css";

const ROLES = [
  {
    value: "support_worker",
    label: "Support Worker",
    desc: "Direct participant support and note-taking",
  },
  {
    value: "team_leader",
    label: "Team Leader",
    desc: "Oversee team and review documentation",
  },
  {
    value: "admin",
    label: "Admin",
    desc: "Organisation administration and settings",
  },
];

export default function Setup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim() !== "" && org.trim() !== "" && role !== "";

  async function handleContinue() {
    if (!canContinue) return;
    setSaving(true);
    try {
      await setSetting("user_name", name.trim());
      await setSetting("user_organisation", org.trim());
      await setSetting("user_role", role);
      navigate("/onboarding/cartridges");
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-steps">
          <span className="step-dot done" />
          <span className="step-dot active" />
          <span className="step-dot" />
        </div>

        <div className="onboarding-logo">
          <Logo size={36} />
          <h1>RiteDoc</h1>
        </div>

        <h2>About You</h2>
        <p className="subtitle">
          Tell us a bit about yourself so we can personalise your experience.
        </p>

        <div className="onboarding-form">
          <div className="field">
            <label className="label">Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Sarah Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Organisation</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Sunrise Disability Services"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Your Role</label>
            <div className="role-options">
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  className={`role-option ${role === r.value ? "selected" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <div className="radio" />
                  <div>
                    <div className="role-label">{r.label}</div>
                    <div className="role-desc">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="onboarding-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/onboarding")}
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            disabled={!canContinue || saving}
            onClick={handleContinue}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
