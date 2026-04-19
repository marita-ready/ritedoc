/**
 * RiteDoc Mobile App — Note Storage Service
 *
 * Persists saved notes locally on-device using AsyncStorage.
 * Each note stores both the original raw text and the AI-rewritten
 * version, along with metadata (timestamps, word counts).
 *
 * This service will be migrated to SQLite in a future iteration
 * for better performance with large note collections. The public
 * API is designed to remain stable across that migration.
 *
 * Storage format: a single JSON array under NOTES_STORAGE_KEY.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ───────────────────────────────────────────────────────
const NOTES_STORAGE_KEY = '@ritedoc_saved_notes';

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

// ─── Storage operations ──────────────────────────────────────────────

/**
 * Load all saved notes from storage.
 * Returns an empty array if no notes exist or on error.
 */
export async function loadAllNotes(): Promise<SavedNote[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedNote[];
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

  const existing = await loadAllNotes();
  // Prepend new note so most recent is first
  const updated = [newNote, ...existing];

  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updated));
  return newNote;
}

/**
 * Load a single note by ID.
 * Returns null if not found.
 */
export async function loadNoteById(id: string): Promise<SavedNote | null> {
  const notes = await loadAllNotes();
  return notes.find((n) => n.id === id) ?? null;
}

/**
 * Delete a note by ID.
 * Returns true if the note was found and deleted, false otherwise.
 */
export async function deleteNote(id: string): Promise<boolean> {
  const notes = await loadAllNotes();
  const filtered = notes.filter((n) => n.id !== id);

  if (filtered.length === notes.length) {
    // Note not found
    return false;
  }

  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Delete all saved notes.
 */
export async function deleteAllNotes(): Promise<void> {
  await AsyncStorage.removeItem(NOTES_STORAGE_KEY);
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
  const notes = await loadAllNotes();
  const index = notes.findIndex((n) => n.id === id);

  if (index === -1) {
    console.warn('[noteStorage] updateNote: note not found:', id);
    return null;
  }

  const existing = notes[index];
  const updatedNote: SavedNote = {
    ...existing,
    originalText:
      updates.originalText !== undefined
        ? updates.originalText
        : existing.originalText,
    rewrittenText:
      updates.rewrittenText !== undefined
        ? updates.rewrittenText
        : existing.rewrittenText,
    wordCountOriginal:
      updates.originalText !== undefined
        ? countWords(updates.originalText)
        : existing.wordCountOriginal,
    wordCountRewritten:
      updates.rewrittenText !== undefined
        ? countWords(updates.rewrittenText)
        : existing.wordCountRewritten,
  };

  const updatedNotes = [...notes];
  updatedNotes[index] = updatedNote;

  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(updatedNotes));
  return updatedNote;
}

/**
 * Get the total count of saved notes.
 */
export async function getNoteCount(): Promise<number> {
  const notes = await loadAllNotes();
  return notes.length;
}

/**
 * Search notes by text content (case-insensitive).
 * Searches both original and rewritten text.
 */
export async function searchNotes(query: string): Promise<SavedNote[]> {
  if (!query.trim()) return loadAllNotes();

  const notes = await loadAllNotes();
  const lowerQuery = query.toLowerCase();

  return notes.filter(
    (note) =>
      note.originalText.toLowerCase().includes(lowerQuery) ||
      note.rewrittenText.toLowerCase().includes(lowerQuery)
  );
}
