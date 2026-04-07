import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotes, getGoals, getSetting, type Note } from "../../lib/commands";

export default function Home() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const [activeGoals, setActiveGoals] = useState(0);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [notes, goals, name] = await Promise.all([
        getNotes(),
        getGoals(),
        getSetting("user_name"),
      ]);
      setTotalNotes(notes.length);
      setRecentNotes(notes.slice(0, 5));
      setTotalGoals(goals.length);
      setActiveGoals(goals.filter((g) => g.status === "active").length);
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
        <p className="text-muted">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          {userName ? `Welcome back, ${userName}` : "Welcome back"}
        </h1>
        <p>Here's an overview of your RiteDoc activity.</p>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Notes"
          value={totalNotes}
          color="var(--blue-600)"
          bg="var(--blue-50)"
        />
        <StatCard
          label="Active Goals"
          value={activeGoals}
          color="#059669"
          bg="#ecfdf5"
        />
        <StatCard
          label="Total Goals"
          value={totalGoals}
          color="var(--slate-600)"
          bg="var(--slate-100)"
        />
      </div>

      {/* Quick actions */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <button
          className="btn btn-primary"
          onClick={() => navigate("/new-note")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 3V13M3 8H13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Note
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/goals")}
        >
          View Goals
        </button>
      </div>

      {/* Recent notes */}
      <div className="card card-padded">
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "var(--slate-800)",
            margin: "0 0 1rem",
          }}
        >
          Recent Notes
        </h3>

        {recentNotes.length === 0 ? (
          <p
            className="text-muted text-sm"
            style={{ textAlign: "center", padding: "1.5rem 0" }}
          >
            No notes yet. Create your first note to get started.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/my-notes/${note.id}`)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  background: "var(--slate-50)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--blue-50)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "var(--slate-50)")
                }
              >
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--slate-700)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "70%",
                  }}
                >
                  {note.raw_text.slice(0, 80) || "Empty note"}
                  {note.raw_text.length > 80 ? "..." : ""}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--slate-400)",
                    flexShrink: 0,
                  }}
                >
                  {formatDate(note.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
