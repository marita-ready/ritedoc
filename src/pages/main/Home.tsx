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
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{userName ? `Welcome back, ${userName.split(" ")[0]}` : "Welcome back"}</h1>
        <p>Select a cartridge, paste your notes, and get an audit-ready rewrite.</p>
      </div>

      {/* Primary CTA banner */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--blue-700) 0%, var(--blue-600) 100%)",
          borderRadius: "var(--radius-xl)",
          padding: "1.75rem 2rem",
          marginBottom: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          boxShadow: "0 4px 16px rgba(37, 99, 235, 0.25)",
        }}
      >
        <div>
          <p style={{ color: "var(--white)", fontWeight: 700, fontSize: "1.125rem", margin: "0 0 0.375rem", letterSpacing: "-0.01em" }}>
            Rewrite a Progress Note
          </p>
          <p style={{ color: "rgba(255,255,255,0.78)", fontSize: "0.875rem", margin: 0, maxWidth: 400, lineHeight: 1.5 }}>
            Paste your raw observations, select a service cartridge, and get a
            compliance-ready rewrite in seconds.
          </p>
        </div>
        <button
          className="btn btn-lg"
          style={{ background: "var(--white)", color: "var(--blue-700)", fontWeight: 600, flexShrink: 0, boxShadow: "var(--shadow-sm)" }}
          onClick={() => navigate("/rewrite")}
        >
          Open Rewrite Tool →
        </button>
      </div>

      {/* Info cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* Active cartridges stat */}
        <div className="card card-padded">
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", margin: "0 0 0.625rem" }}>
            Active Cartridges
          </p>
          <p style={{ fontSize: "2rem", fontWeight: 700, color: "var(--blue-600)", margin: "0 0 0.25rem", lineHeight: 1 }}>
            {cartridgeCount}
          </p>
          <p style={{ fontSize: "0.8125rem", color: "var(--slate-500)", margin: 0 }}>
            {cartridgeCount === 1 ? "service type" : "service types"} ready for rewriting
          </p>
          {cartridgeCount === 0 && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ marginTop: "0.75rem" }}
              onClick={() => navigate("/settings")}
            >
              Enable cartridges in Settings
            </button>
          )}
        </div>

        {/* How it works */}
        <div className="card card-padded">
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--slate-400)", margin: "0 0 0.625rem" }}>
            How It Works
          </p>
          <ol style={{ fontSize: "0.875rem", color: "var(--slate-600)", margin: 0, paddingLeft: "1.25rem", lineHeight: 1.75 }}>
            <li>Paste your raw progress notes</li>
            <li>Select the NDIS service cartridge</li>
            <li>Choose Quick or Deep rewrite mode</li>
            <li>Copy the compliance-ready output</li>
          </ol>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: "flex", gap: "0.625rem" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate("/settings")}>
          Manage Cartridges
        </button>
      </div>
    </div>
  );
}
