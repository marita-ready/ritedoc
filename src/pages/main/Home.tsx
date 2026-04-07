import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGoals, getSetting } from "../../lib/commands";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [totalGoals, setTotalGoals] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [completedGoals, setCompletedGoals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [goals, name] = await Promise.all([
        getGoals(),
        getSetting("user_name"),
      ]);
      setTotalGoals(goals.length);
      setActiveGoals(goals.filter((g) => g.status === "active").length);
      setCompletedGoals(goals.filter((g) => g.status === "completed").length);
      setUserName(name ?? "");
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
        <p>Ready to write some notes?</p>
      </div>

      {/* Quick action — primary CTA */}
      <div
        style={{
          background: "var(--blue-600)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
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
              fontSize: "1rem",
              margin: "0 0 0.25rem",
            }}
          >
            Write a Note
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.875rem",
              margin: 0,
            }}
          >
            Paste your raw observations and get a professional rewrite instantly.
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
          onClick={() => navigate("/new-note")}
        >
          Open Note Tool
        </button>
      </div>

      {/* Goal stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Goals"
          value={totalGoals}
          color="var(--slate-600)"
          bg="var(--slate-100)"
        />
        <StatCard
          label="Active Goals"
          value={activeGoals}
          color="#059669"
          bg="#ecfdf5"
        />
        <StatCard
          label="Completed"
          value={completedGoals}
          color="var(--blue-600)"
          bg="var(--blue-50)"
        />
      </div>

      {/* Secondary actions */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/goals")}
        >
          View Goals
        </button>
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

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="card card-padded"
      style={{ display: "flex", alignItems: "center", gap: "1rem" }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "var(--radius-md)",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          fontWeight: 700,
          color,
          flexShrink: 0,
        }}
      >
        {value}
      </div>
      <span style={{ fontSize: "0.8125rem", color: "var(--slate-500)" }}>
        {label}
      </span>
    </div>
  );
}
