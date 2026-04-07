import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getNoteById, deleteNote, type Note } from "../../lib/commands";

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) loadNote(Number(id));
  }, [id]);

  async function loadNote(noteId: number) {
    try {
      const data = await getNoteById(noteId);
      setNote(data);
    } catch (err) {
      setError("Note not found.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!note) return;
    if (!confirm("Delete this note? This cannot be undone.")) return;
    try {
      await deleteNote(note.id);
      navigate("/my-notes");
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="text-muted">Loading note...</p>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="page">
        <p style={{ color: "var(--danger)" }}>{error || "Note not found."}</p>
        <button className="btn btn-secondary" onClick={() => navigate("/my-notes")}>
          Back to Notes
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/my-notes")}
          style={{ marginBottom: "1rem" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M9 3L5 7L9 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Notes
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                margin: "0 0 0.25rem",
              }}
            >
              Note #{note.id}
            </h1>
            <p
              className="text-muted text-sm"
              style={{ margin: 0 }}
            >
              Created {formatDate(note.created_at)} &middot; Updated{" "}
              {formatDate(note.updated_at)}
            </p>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {/* Raw text */}
      <div className="card card-padded" style={{ marginBottom: "1rem" }}>
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
          Raw Notes
        </h3>
        <p
          style={{
            fontSize: "0.875rem",
            lineHeight: 1.7,
            color: "var(--slate-700)",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          {note.raw_text || "No raw text."}
        </p>
      </div>

      {/* Rewritten text */}
      <div className="card card-padded">
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
          Rewritten Output
        </h3>
        {note.rewritten_text ? (
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "var(--slate-700)",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {note.rewritten_text}
          </p>
        ) : (
          <p
            className="text-muted text-sm"
            style={{
              textAlign: "center",
              padding: "1.5rem 0",
              margin: 0,
            }}
          >
            No rewritten text yet. Use the Rewrite feature to generate
            professional output.
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "Z");
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
