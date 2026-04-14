import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCartridges,
  updateCartridgeActive,
  setSetting,
  type Cartridge,
} from "../../lib/commands";
import Logo from "../../components/Logo";
import "../../styles/onboarding.css";

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
    loadCartridges();
  }, []);

  async function loadCartridges() {
    try {
      // Cartridges are seeded by the Rust backend on first launch.
      // By the time onboarding reaches this screen, they are already in the DB.
      const existing = await getCartridges();
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
      // Persist each cartridge's active state directly to the cartridges table
      await Promise.all(
        cartridges.map((c) => updateCartridgeActive(c.id, c.selected))
      );
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
          Choose the NDIS service types you work with. Each cartridge contains
          the compliance rules and format requirements for that service type.
          You can change these later in Settings.
        </p>

        {loading ? (
          <div className="empty-cartridges">Loading cartridges...</div>
        ) : cartridges.length === 0 ? (
          <div className="empty-cartridges">
            No cartridges found. Please restart the app.
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
            disabled={saving || selectedCount === 0}
            onClick={handleFinish}
          >
            {saving ? "Saving..." : "Finish Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
