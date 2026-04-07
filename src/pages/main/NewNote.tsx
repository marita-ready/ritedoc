import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getCartridges,
  getSetting,
  createNote,
  type Cartridge,
} from "../../lib/commands";

export default function NewNote() {
  const navigate = useNavigate();
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [selectedCartridge, setSelectedCartridge] = useState<number | "">("");
  const [rawText, setRawText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [showPipeline, setShowPipeline] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCartridges();
  }, []);

  async function loadCartridges() {
    try {
      const all = await getCartridges();
      // Filter to only active ones based on setting
      let activeIds: number[] | null = null;
      try {
        const raw = await getSetting("active_cartridge_ids");
        if (raw) activeIds = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      const filtered =
        activeIds !== null
          ? all.filter((c) => activeIds!.includes(c.id))
          : all.filter((c) => c.is_active);

      setCartridges(filtered);
      if (filtered.length > 0) {
        setSelectedCartridge(filtered[0].id);
      }
    } catch (err) {
      console.error("Failed to load cartridges:", err);
    }
  }

  function handleRewrite() {
    setShowPipeline(true);
    setRewrittenText("");
    // Placeholder — AI pipeline not connected yet
  }

  async function handleSave() {
    if (!rawText.trim()) return;
    setSaving(true);
    try {
      const cartId =
        selectedCartridge !== "" ? Number(selectedCartridge) : undefined;
      await createNote(rawText.trim(), rewrittenText || undefined, cartId);
      navigate("/my-notes");
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>New Note</h1>
        <p>Write your raw observations and optionally rewrite them.</p>
      </div>

      {/* Cartridge selector */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label className="label">Service Cartridge</label>
        <select
          className="select"
          style={{ maxWidth: 360 }}
          value={selectedCartridge}
          onChange={(e) =>
            setSelectedCartridge(
              e.target.value === "" ? "" : Number(e.target.value)
            )
          }
        >
          <option value="">No cartridge selected</option>
          {cartridges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Raw text input */}
      <div style={{ marginBottom: "1rem" }}>
        <label className="label">Raw Notes</label>
        <textarea
          className="textarea"
          style={{ minHeight: 180 }}
          placeholder="Type your raw observations here... e.g. 'Took John to the shops today. He was really happy and picked out his own groceries. Needed help with the self-checkout.'"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <button
          className="btn btn-primary"
          disabled={!rawText.trim()}
          onClick={handleRewrite}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 14L5.5 13L13.5 5C14.05 4.45 14.05 3.55 13.5 3L13 2.5C12.45 1.95 11.55 1.95 11 2.5L3 10.5L2 14Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Rewrite
        </button>
        <button
          className="btn btn-secondary"
          disabled={!rawText.trim() || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Note"}
        </button>
      </div>

      {/* Rewritten output / pipeline placeholder */}
      {showPipeline && (
        <div className="card card-padded">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.75rem",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle
                cx="9"
                cy="9"
                r="7"
                stroke="var(--blue-600)"
                strokeWidth="1.5"
              />
              <path
                d="M9 6V9.5L11.5 11"
                stroke="var(--blue-600)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--slate-700)",
              }}
            >
              Rewritten Output
            </span>
          </div>

          {rewrittenText ? (
            <div
              style={{
                background: "var(--slate-50)",
                borderRadius: "var(--radius-md)",
                padding: "1rem",
                fontSize: "0.875rem",
                lineHeight: 1.7,
                color: "var(--slate-700)",
                whiteSpace: "pre-wrap",
              }}
            >
              {rewrittenText}
            </div>
          ) : (
            <div
              style={{
                background: "var(--blue-50)",
                borderRadius: "var(--radius-md)",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--blue-700)",
                  fontWeight: 500,
                  margin: "0 0 0.25rem",
                }}
              >
                AI pipeline coming soon
              </p>
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--slate-500)",
                  margin: 0,
                }}
              >
                The rewrite engine will transform your raw notes into
                professional NDIS-compliant documentation.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
