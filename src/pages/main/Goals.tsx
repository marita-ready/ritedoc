import { useEffect, useState } from "react";
import {
  getGoals,
  createGoal,
  updateGoal,
  type Goal,
} from "../../lib/commands";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [participantName, setParticipantName] = useState("");
  const [goalText, setGoalText] = useState("");
  const [goalNotes, setGoalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const data = await getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!participantName.trim() || !goalText.trim()) return;
    setSaving(true);
    try {
      const goal = await createGoal(
        participantName.trim(),
        goalText.trim(),
        "active",
        goalNotes.trim() || undefined
      );
      setGoals((prev) => [goal, ...prev]);
      setParticipantName("");
      setGoalText("");
      setGoalNotes("");
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create goal:", err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(goal: Goal) {
    const newStatus = goal.status === "active" ? "completed" : "active";
    try {
      const updated = await updateGoal(
        goal.id,
        undefined,
        undefined,
        newStatus,
        undefined
      );
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="text-muted">Loading goals...</p>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="page">
      <div className="page-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1>Goals</h1>
            <p>Track participant goals and progress.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Add Goal"}
          </button>
        </div>
      </div>

      {/* Add goal form */}
      {showForm && (
        <div className="card card-padded" style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              margin: "0 0 1rem",
              color: "var(--slate-800)",
            }}
          >
            New Goal
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label className="label">Participant Name</label>
              <input
                className="input"
                placeholder="e.g. John Smith"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Goal</label>
              <textarea
                className="textarea"
                style={{ minHeight: 80 }}
                placeholder="e.g. Increase independence with grocery shopping"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input
                className="input"
                placeholder="Any additional context"
                value={goalNotes}
                onChange={(e) => setGoalNotes(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary"
                disabled={
                  !participantName.trim() || !goalText.trim() || saving
                }
                onClick={handleCreate}
              >
                {saving ? "Saving..." : "Save Goal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active goals */}
      <GoalSection
        title="Active"
        goals={activeGoals}
        emptyText="No active goals."
        onToggle={toggleStatus}
      />

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <GoalSection
            title="Completed"
            goals={completedGoals}
            emptyText=""
            onToggle={toggleStatus}
          />
        </div>
      )}
    </div>
  );
}

function GoalSection({
  title,
  goals,
  emptyText,
  onToggle,
}: {
  title: string;
  goals: Goal[];
  emptyText: string;
  onToggle: (g: Goal) => void;
}) {
  if (goals.length === 0 && !emptyText) return null;

  return (
    <div>
      <h3
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "var(--slate-500)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          margin: "0 0 0.75rem",
        }}
      >
        {title} ({goals.length})
      </h3>

      {goals.length === 0 ? (
        <div className="card card-padded" style={{ textAlign: "center" }}>
          <p
            className="text-muted text-sm"
            style={{ padding: "1rem 0", margin: 0 }}
          >
            {emptyText}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="card"
              style={{ padding: "1rem 1.25rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(goal)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${
                      goal.status === "completed"
                        ? "var(--success)"
                        : "var(--slate-300)"
                    }`,
                    background:
                      goal.status === "completed"
                        ? "var(--success)"
                        : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 2,
                    padding: 0,
                  }}
                >
                  {goal.status === "completed" && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 6L5.5 8.5L9 3.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color:
                        goal.status === "completed"
                          ? "var(--slate-400)"
                          : "var(--slate-700)",
                      textDecoration:
                        goal.status === "completed" ? "line-through" : "none",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {goal.goal_text}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      fontSize: "0.75rem",
                      color: "var(--slate-400)",
                    }}
                  >
                    <span>{goal.participant_name}</span>
                    <span>{formatDate(goal.created_at)}</span>
                    {goal.notes && (
                      <span
                        style={{
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {goal.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
