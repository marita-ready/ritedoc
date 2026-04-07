import { useEffect, useRef, useState } from "react";
import { getCartridges, getSetting, type Cartridge } from "../../lib/commands";

export default function NewNote() {
  const [cartridges, setCartridges] = useState<Cartridge[]>([]);
  const [selectedCartridge, setSelectedCartridge] = useState<number | "">("");
  const [rawText, setRawText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCartridges();
  }, []);

  async function loadCartridges() {
    try {
      const all = await getCartridges();
      // Filter to only the user's active selection
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
    // Output area becomes visible; rewriting engine will populate it later.
    setRewrittenText("");
    setShowOutput(true);
    setCopied(false);
    // Scroll to output
    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function handleClear() {
    setRawText("");
    setRewrittenText("");
    setShowOutput(false);
    setCopied(false);
  }

  async function handleCopy() {
    if (!rewrittenText) return;
    try {
      await navigator.clipboard.writeText(rewrittenText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available in all contexts */
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>New Note</h1>
        <p>
          Select a cartridge, type your raw observations, and click Rewrite to
          generate a professional output.
        </p>
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
          style={{ minHeight: 200 }}
          placeholder="Type or paste your raw observations here..."
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            // Reset output if user edits the input after a rewrite
            if (showOutput) {
              setShowOutput(false);
              setRewrittenText("");
            }
          }}
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
        {(rawText || showOutput) && (
          <button className="btn btn-secondary" onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      {/* Output area — visible after Rewrite is clicked */}
      {showOutput && (
        <div ref={outputRef} className="card card-padded">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--slate-500)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Rewritten Output
            </span>

            {rewrittenText && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7L5.5 9.5L11 4"
                        stroke="var(--success)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect
                        x="4"
                        y="4"
                        width="8"
                        height="8"
                        rx="1.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M2 10V3C2 2.45 2.45 2 3 2H10"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
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
                background: "var(--slate-50)",
                borderRadius: "var(--radius-md)",
                padding: "2rem 1.5rem",
                textAlign: "center",
                color: "var(--slate-400)",
                fontSize: "0.875rem",
              }}
            >
              Rewritten output will appear here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
