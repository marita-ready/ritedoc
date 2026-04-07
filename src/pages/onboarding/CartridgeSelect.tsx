import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCartridges,
  createCartridge,
  setSetting,
  type Cartridge,
} from "../../lib/commands";
import Logo from "../../components/Logo";
import "../../styles/onboarding.css";

/** Default NDIS service type cartridges seeded on first run. */
const DEFAULT_CARTRIDGES = [
  {
    name: "Daily Activities",
    service_type: "daily_activities",
    description:
      "Assistance with daily personal activities and community participation",
  },
  {
    name: "Community Participation",
    service_type: "community_participation",
    description: "Support for social and community engagement activities",
  },
  {
    name: "Therapeutic Supports",
    service_type: "therapeutic_supports",
    description: "Allied health and therapeutic intervention notes",
  },
  {
    name: "Capacity Building",
    service_type: "capacity_building",
    description: "Skill development and independence-building activities",
  },
  {
    name: "Supported Independent Living",
    service_type: "sil",
    description: "SIL shift notes and daily living support documentation",
  },
  {
    name: "Plan Management",
    service_type: "plan_management",
    description: "Plan management and coordination of supports",
  },
  {
    name: "Behaviour Support",
    service_type: "behaviour_support",
    description: "Behaviour support plans and incident documentation",
  },
  {
    name: "Transport",
    service_type: "transport",
    description: "Transport assistance and travel training notes",
  },
];

interface Props {
  onComplete: () => void;
}

export default function CartridgeSelect({ onComplete }: Props) {
  const navigate = useNavigate();
  const [cartridges, setCartridges] = useState<
    (Cartridge & { selected: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    seedAndLoad();
  }, []);

  async function seedAndLoad() {
    try {
      let existing = await getCartridges();

      // Seed defaults if the table is empty
      if (existing.length === 0) {
        for (const c of DEFAULT_CARTRIDGES) {
          await createCartridge(
            c.name,
            c.service_type,
            c.description,
            "{}",
            true
          );
        }
        existing = await getCartridges();
      }

      setCartridges(existing.map((c) => ({ ...c, selected: c.is_active })));
    } catch (err) {
      console.error("Failed to load cartridges:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleCartridge(id: number) {
    setCartridges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // We don't have an update_cartridge command yet, so we'll store the
      // active cartridge IDs as a setting for now. The backend can be
      // extended later.
      const activeIds = cartridges
        .filter((c) => c.selected)
        .map((c) => c.id);
      await setSetting("active_cartridge_ids", JSON.stringify(activeIds));
      await setSetting("onboarding_complete", "true");
      onComplete();
    } catch (err) {
      console.error("Failed to save cartridge selection:", err);
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = cartridges.filter((c) => c.selected).length;

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-steps">
          <span className="step-dot done" />
          <span className="step-dot done" />
          <span className="step-dot active" />
        </div>

        <div className="onboarding-logo">
          <Logo size={36} />
          <h1>RiteDoc</h1>
        </div>

        <h2>Select Your Cartridges</h2>
        <p className="subtitle">
          Choose the NDIS service types you work with. These cartridges
          determine how your notes are formatted. You can change these later in
          Settings.
        </p>

        {loading ? (
          <div className="empty-cartridges">Loading cartridges...</div>
        ) : cartridges.length === 0 ? (
          <div className="empty-cartridges">
            No cartridges available. You can add them later in Settings.
          </div>
        ) : (
          <div className="cartridge-list">
            {cartridges.map((c) => (
              <div
                key={c.id}
                className={`cartridge-item ${c.selected ? "active" : ""}`}
                onClick={() => toggleCartridge(c.id)}
              >
                <div className="cartridge-toggle" />
                <div className="cartridge-info">
                  <div className="name">{c.name}</div>
                  <div className="desc">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--slate-400)",
            textAlign: "center",
            marginTop: "0.75rem",
          }}
        >
          {selectedCount} of {cartridges.length} selected
        </div>

        <div className="onboarding-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/onboarding/setup")}
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            disabled={saving}
            onClick={handleFinish}
          >
            {saving ? "Saving..." : "Finish Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
