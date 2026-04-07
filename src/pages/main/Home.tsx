import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSetting, getActiveCartridges } from "../../lib/commands";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [cartridgeCount, setCartridgeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [name, cartridges] = await Promise.all([
        getSetting("user_name"),
        getActiveCartridges(),
      ]);
      setUserName(name ?? "");
      setCartridgeCount(cartridges.length);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {userName ? `Welcome back, ${userName}` : "Welcome back"}
        </h1>
        <p>Ready to rewrite some notes?</p>
      </div>

      {/* Primary CTA */}
      <div
        style={{
          background: "var(--blue-600)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              color: "var(--white)",
              fontWeight: 600,
              fontSize: "1.125rem",
              margin: "0 0 0.375rem",
            }}
          >
            Rewrite a Note
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.875rem",
              margin: 0,
              maxWidth: 420,
            }}
          >
            Paste your raw observations, select a service cartridge, and get an
            audit-ready rewrite in seconds.
          </p>
        </div>
        <button
          className="btn"
          style={{
            background: "var(--white)",
            color: "var(--blue-700)",
            fontWeight: 600,
            flexShrink: 0,
          }}
          onClick={() => navigate("/rewrite")}
        >
          Open Rewrite Tool
        </button>
      </div>

      {/* Info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div className="card card-padded">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--slate-400)",
              margin: "0 0 0.5rem",
            }}
          >
            Active Cartridges
          </p>
          <p
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--blue-600)",
              margin: "0 0 0.25rem",
            }}
          >
            {cartridgeCount}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--slate-500)",
              margin: 0,
            }}
          >
            Service types configured for rewriting
          </p>
        </div>

        <div className="card card-padded">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--slate-400)",
              margin: "0 0 0.5rem",
            }}
          >
            How It Works
          </p>
          <ol
            style={{
              fontSize: "0.8125rem",
              color: "var(--slate-600)",
              margin: 0,
              paddingLeft: "1.25rem",
              lineHeight: 1.7,
            }}
          >
            <li>Paste your raw progress notes</li>
            <li>Select the NDIS service cartridge</li>
            <li>Click Rewrite and copy the result</li>
          </ol>
        </div>
      </div>

      {/* Secondary action */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/settings")}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
