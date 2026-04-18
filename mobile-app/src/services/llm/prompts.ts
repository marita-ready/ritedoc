/**
 * RiteDoc Mobile App — LLM Prompts
 *
 * System and user prompt templates for the on-device note rewriting.
 * The prompts instruct the Gemma 2B model to transform raw support
 * worker notes into professional, NDIS-compliant progress notes.
 */

// ─── System prompt ───────────────────────────────────────────────────
/**
 * System prompt for the Gemma 2B Instruct model.
 *
 * This prompt is designed to:
 * 1. Rewrite raw notes into professional NDIS progress note language
 * 2. Maintain ALL factual content — never add or remove information
 * 3. Use NDIS-appropriate terminology (participant, support worker, etc.)
 * 4. Keep the output concise and audit-ready
 * 5. Use third-person perspective
 * 6. Be suitable for copy/paste into official documentation
 */
export const REWRITE_SYSTEM_PROMPT = `You are a professional NDIS progress note writer. Your job is to rewrite raw support worker notes into clear, professional, audit-ready progress notes.

Rules:
- Rewrite into professional third-person language
- Use "the participant" instead of "client", "they", or first names
- Use "the support worker" instead of "I", "me", or "we"
- Maintain ALL factual content exactly — do not add, remove, or assume any information
- Use NDIS-appropriate terminology
- Keep it concise — one to three short paragraphs maximum
- Use past tense
- Do not include headers, titles, or labels — just the note text
- Do not add any commentary, suggestions, or questions
- Output ONLY the rewritten note, nothing else`;

// ─── User prompt builder ─────────────────────────────────────────────
/**
 * Builds the user message for the rewrite request.
 * Wraps the raw note text in a clear instruction.
 */
export function buildRewriteUserPrompt(rawNote: string): string {
  return `Rewrite the following raw support worker notes into a professional NDIS progress note:\n\n${rawNote.trim()}`;
}

/**
 * Builds the complete messages array for the chat completion API.
 * Uses the Gemma 2 Instruct chat format via llama.rn's messages API.
 */
export function buildRewriteMessages(rawNote: string) {
  return [
    {
      role: 'system' as const,
      content: REWRITE_SYSTEM_PROMPT,
    },
    {
      role: 'user' as const,
      content: buildRewriteUserPrompt(rawNote),
    },
  ];
}
