/**
 * RiteDoc Mobile App — Note Storage Service
 *
 * Persists saved notes locally on-device using SQLite (expo-sqlite).
 * Each note stores both the original raw text and the AI-rewritten
 * version, along with metadata (timestamps, word counts).
 *
 * The database is initialised lazily on first access via the shared
 * database module (see database.ts), which also handles schema
 * migrations and one-time AsyncStorage → SQLite data migration.
 *
 * Public API:
 *   saveNote(input)        → SavedNote
 *   loadAllNotes()         → SavedNote[]
 *   loadNoteById(id)       → SavedNote | null
 *   deleteNote(id)         → boolean
 *   deleteAllNotes()       → void
 *   updateNote(id, updates)→ SavedNote | null
 *   getNoteCount()         → number
 *   searchNotes(query)     → SavedNote[]
 */

import { getDatabase } from './database';

// ─── Types ───────────────────────────────────────────────────────────
export interface SavedNote {
  /** Unique identifier (UUID-style) */
  id: string;
  /** The user's original raw note text */
  originalText: string;
  /** The AI-rewritten, NDIS-compliant note text */
  rewrittenText: string;
  /** ISO 8601 timestamp of when the note was saved */
  createdAt: string;
  /** Word count of the original text */
  wordCountOriginal: number;
  /** Word count of the rewritten text */
  wordCountRewritten: number;
}

export interface SaveNoteInput {
  originalText: string;
  rewrittenText: string;
}

export interface UpdateNoteInput {
  /** Updated original raw text (optional) */
  originalText?: string;
  /** Updated AI-rewritten text (optional) */
  rewrittenText?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Generate a simple unique ID without external dependencies */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/** Count words in a string */
function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Map a raw SQLite row to a typed SavedNote.
 * Ensures all fields have the correct types even if the DB returns
 * unexpected values (defensive coding for schema evolution).
 */
function rowToNote(row: Record<string, unknown>): SavedNote {
  return {
    id: String(row.id ?? ''),
    originalText: String(row.originalText ?? ''),
    rewrittenText: String(row.rewrittenText ?? ''),
    createdAt: String(row.createdAt ?? ''),
    wordCountOriginal: Number(row.wordCountOriginal ?? 0),
    wordCountRewritten: Number(row.wordCountRewritten ?? 0),
  };
}

// ─── Storage operations ──────────────────────────────────────────────

/**
 * Load all saved notes from storage.
 * Returns an empty array if no notes exist or on error.
 * Sorted by most recent first.
 */
export async function loadAllNotes(): Promise<SavedNote[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM notes ORDER BY createdAt DESC'
    );
    return rows.map(rowToNote);
  } catch (error) {
    console.warn('[noteStorage] Failed to load notes:', error);
    return [];
  }
}

/**
 * Save a new note. Generates an ID and timestamps automatically.
 * Returns the newly created SavedNote.
 */
export async function saveNote(input: SaveNoteInput): Promise<SavedNote> {
  const newNote: SavedNote = {
    id: generateId(),
    originalText: input.originalText,
    rewrittenText: input.rewrittenText,
    createdAt: new Date().toISOString(),
    wordCountOriginal: countWords(input.originalText),
    wordCountRewritten: countWords(input.rewrittenText),
  };

  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO notes
      (id, originalText, rewrittenText, createdAt, wordCountOriginal, wordCountRewritten)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newNote.id,
    newNote.originalText,
    newNote.rewrittenText,
    newNote.createdAt,
    newNote.wordCountOriginal,
    newNote.wordCountRewritten
  );

  return newNote;
}

/**
 * Load a single note by ID.
 * Returns null if not found.
 */
export async function loadNoteById(id: string): Promise<SavedNote | null> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM notes WHERE id = ?',
      id
    );
    return row ? rowToNote(row) : null;
  } catch (error) {
    console.warn('[noteStorage] Failed to load note by id:', error);
    return null;
  }
}

/**
 * Delete a note by ID.
 * Returns true if the note was found and deleted, false otherwise.
 */
export async function deleteNote(id: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.runAsync(
      'DELETE FROM notes WHERE id = ?',
      id
    );
    return result.changes > 0;
  } catch (error) {
    console.warn('[noteStorage] Failed to delete note:', error);
    return false;
  }
}

/**
 * Delete all saved notes.
 */
export async function deleteAllNotes(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes');
  } catch (error) {
    console.warn('[noteStorage] Failed to delete all notes:', error);
  }
}

/**
 * Update an existing note by ID.
 * Recalculates word counts for any updated text fields.
 * Returns the updated SavedNote, or null if the note was not found.
 */
export async function updateNote(
  id: string,
  updates: UpdateNoteInput
): Promise<SavedNote | null> {
  try {
    const db = await getDatabase();

    // Load the existing note first
    const existingRow = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM notes WHERE id = ?',
      id
    );

    if (!existingRow) {
      console.warn('[noteStorage] updateNote: note not found:', id);
      return null;
    }

    const existing = rowToNote(existingRow);

    const newOriginalText =
      updates.originalText !== undefined
        ? updates.originalText
        : existing.originalText;
    const newRewrittenText =
      updates.rewrittenText !== undefined
        ? updates.rewrittenText
        : existing.rewrittenText;
    const newWordCountOriginal =
      updates.originalText !== undefined
        ? countWords(updates.originalText)
        : existing.wordCountOriginal;
    const newWordCountRewritten =
      updates.rewrittenText !== undefined
        ? countWords(updates.rewrittenText)
        : existing.wordCountRewritten;

    await db.runAsync(
      `UPDATE notes
       SET originalText = ?,
           rewrittenText = ?,
           wordCountOriginal = ?,
           wordCountRewritten = ?
       WHERE id = ?`,
      newOriginalText,
      newRewrittenText,
      newWordCountOriginal,
      newWordCountRewritten,
      id
    );

    return {
      ...existing,
      originalText: newOriginalText,
      rewrittenText: newRewrittenText,
      wordCountOriginal: newWordCountOriginal,
      wordCountRewritten: newWordCountRewritten,
    };
  } catch (error) {
    console.warn('[noteStorage] Failed to update note:', error);
    return null;
  }
}

/**
 * Get the total count of saved notes.
 */
export async function getNoteCount(): Promise<number> {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes'
    );
    return result?.count ?? 0;
  } catch (error) {
    console.warn('[noteStorage] Failed to get note count:', error);
    return 0;
  }
}

/**
 * Search notes by text content (case-insensitive).
 * Searches both original and rewritten text.
 * Uses SQLite LIKE for efficient server-side filtering.
 */
export async function searchNotes(query: string): Promise<SavedNote[]> {
  if (!query.trim()) return loadAllNotes();

  try {
    const db = await getDatabase();
    const pattern = `%${query}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM notes
       WHERE originalText LIKE ? COLLATE NOCASE
          OR rewrittenText LIKE ? COLLATE NOCASE
       ORDER BY createdAt DESC`,
      pattern,
      pattern
    );
    return rows.map(rowToNote);
  } catch (error) {
    console.warn('[noteStorage] Failed to search notes:', error);
    return [];
  }
}
