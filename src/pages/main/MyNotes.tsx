import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotes, deleteNote, type Note } from "../../lib/commands";

export default function MyNotes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const data = await getNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="text-muted">Loading notes...</p>
      </div>
    );
  }

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
            <h1>My Notes</h1>
            <p>
              {notes.length} note{notes.length !== 1 ? "s" : ""} saved
            </p>
          </div>
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
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="card card-padded" style={{ textAlign: "center" }}>
          <p
            style={{
              color: "var(--slate-400)",
              fontSize: "0.875rem",
              padding: "2rem 0",
              margin: 0,
            }}
          >
            No notes yet. Create your first note to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notes.map((note) => (
            <div
              key={note.id}
              className="card"
              onClick={() => navigate(`/my-notes/${note.id}`)}
              style={{
                padding: "1rem 1.25rem",
                cursor: "pointer",
                transition: "border-color 0.12s ease, box-shadow 0.12s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--blue-200)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--slate-200)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--slate-700)",
                      margin: "0 0 0.375rem",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {note.raw_text || "Empty note"}
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
                    <span>{formatDate(note.created_at)}</span>
                    {note.rewritten_text && (
                      <span
                        style={{
                          background: "var(--blue-50)",
                          color: "var(--blue-600)",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: 500,
                        }}
                      >
                        Rewritten
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleDelete(e, note.id)}
                  title="Delete note"
                  style={{ flexShrink: 0 }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 4H11M5.5 4V3C5.5 2.45 5.95 2 6.5 2H7.5C8.05 2 8.5 2.45 8.5 3V4M4.5 4V11.5C4.5 12.05 4.95 12.5 5.5 12.5H8.5C9.05 12.5 9.5 12.05 9.5 11.5V4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
