/**
 * RiteDoc Mobile App — Cartridge Configuration
 *
 * The "cartridge" is the configuration payload that drives how the on-device
 * AI model rewrites NDIS progress notes. It contains the system prompt,
 * user prompt template, NDIS terminology rules, and formatting guidelines.
 *
 * The cartridge is designed to be updated silently over the air without
 * requiring an app store update. The cartridgeUpdater.ts service downloads
 * new versions in the background; this module loads whichever version is
 * currently active (downloaded update or bundled default).
 *
 * Hierarchy (highest priority first):
 *   1. Downloaded cartridge (stored in expo-file-system documentDirectory)
 *   2. Bundled default cartridge (hardcoded in this file)
 */

import * as FileSystem from 'expo-file-system';

// ─── File paths ──────────────────────────────────────────────────────

/** Directory where downloaded cartridge files are stored */
export const CARTRIDGE_DIR = `${FileSystem.documentDirectory}cartridge/`;

/** Path to the active downloaded cartridge JSON */
export const CARTRIDGE_FILE_PATH = `${CARTRIDGE_DIR}active.json`;

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Terminology overrides — maps informal terms to NDIS-appropriate language.
 * The LLM prompt is instructed to use these substitutions.
 */
export interface CartridgeTerminology {
  /** What to call the person receiving support (e.g. "the participant") */
  participantTerm: string;
  /** What to call the person providing support (e.g. "the support worker") */
  supportWorkerTerm: string;
  /** Additional term mappings: { "client": "participant", "carer": "support worker" } */
  substitutions: Record<string, string>;
}

/**
 * Formatting rules that shape the structure of the rewritten note.
 */
export interface CartridgeFormattingRules {
  /** Maximum number of paragraphs in the output */
  maxParagraphs: number;
  /** Whether to use past tense throughout */
  usePastTense: boolean;
  /** Whether to include section headers (usually false for NDIS notes) */
  includeHeaders: boolean;
  /** Any additional formatting instructions appended to the system prompt */
  additionalInstructions: string[];
}

/**
 * The full cartridge configuration payload.
 *
 * Version history:
 *   1 — initial release (bundled default)
 */
export interface CartridgeConfig {
  /** Semantic version string, e.g. "1.0.0" */
  version: string;
  /** Integer version for comparison (monotonically increasing) */
  versionCode: number;
  /** ISO 8601 date of this cartridge release */
  releasedAt: string;
  /** Human-readable description of what changed in this version */
  changeNotes: string;
  /** The system prompt sent to the LLM before the user message */
  systemPrompt: string;
  /** Template for the user message; use {{rawNote}} as the placeholder */
  userPromptTemplate: string;
  /** NDIS terminology configuration */
  terminology: CartridgeTerminology;
  /** Formatting rules */
  formattingRules: CartridgeFormattingRules;
  /**
   * Optional HMAC-SHA256 signature of the JSON payload (excluding this field).
   * The updater verifies this before persisting a downloaded cartridge.
   * Absent in the bundled default.
   */
  signature?: string;
}

// ─── Bundled default cartridge ───────────────────────────────────────

/**
 * The default cartridge bundled with the app binary.
 * This is used when no downloaded update is available or when the
 * downloaded cartridge fails to load.
 *
 * IMPORTANT: Keep this in sync with the server-side cartridge v1.
 */
export const DEFAULT_CARTRIDGE: CartridgeConfig = {
  version: '1.0.0',
  versionCode: 1,
  releasedAt: '2025-01-01T00:00:00.000Z',
  changeNotes: 'Initial release — bundled default cartridge.',
  systemPrompt: `You are a professional NDIS progress note writer. Your job is to rewrite raw support worker notes into clear, professional, audit-ready progress notes.

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
- Output ONLY the rewritten note, nothing else`,
  userPromptTemplate:
    'Rewrite the following raw support worker notes into a professional NDIS progress note:\n\n{{rawNote}}',
  terminology: {
    participantTerm: 'the participant',
    supportWorkerTerm: 'the support worker',
    substitutions: {
      client: 'participant',
      consumer: 'participant',
      carer: 'support worker',
      worker: 'support worker',
      staff: 'support worker',
    },
  },
  formattingRules: {
    maxParagraphs: 3,
    usePastTense: true,
    includeHeaders: false,
    additionalInstructions: [],
  },
};

// ─── Active cartridge loader ─────────────────────────────────────────

/** In-memory cache of the loaded cartridge to avoid repeated disk reads */
let _cachedCartridge: CartridgeConfig | null = null;

/**
 * Loads and returns the active cartridge configuration.
 *
 * Priority:
 *   1. In-memory cache (fastest)
 *   2. Downloaded cartridge from expo-file-system
 *   3. Bundled default cartridge (fallback)
 *
 * This function is safe to call from any screen or service — it never
 * throws and always returns a valid CartridgeConfig.
 */
export async function getActiveCartridge(): Promise<CartridgeConfig> {
  // Return cached version if available
  if (_cachedCartridge !== null) {
    return _cachedCartridge;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(CARTRIDGE_FILE_PATH);
    if (fileInfo.exists) {
      const raw = await FileSystem.readAsStringAsync(CARTRIDGE_FILE_PATH, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(raw) as CartridgeConfig;

      // Basic validation — must have required fields
      if (
        typeof parsed.version === 'string' &&
        typeof parsed.versionCode === 'number' &&
        typeof parsed.systemPrompt === 'string' &&
        typeof parsed.userPromptTemplate === 'string'
      ) {
        console.log(
          `[Cartridge] Loaded downloaded cartridge v${parsed.version} (code ${parsed.versionCode})`
        );
        _cachedCartridge = parsed;
        return parsed;
      } else {
        console.warn('[Cartridge] Downloaded cartridge failed validation — using default');
      }
    }
  } catch (error) {
    console.warn('[Cartridge] Failed to load downloaded cartridge:', error);
  }

  // Fall back to bundled default
  console.log(
    `[Cartridge] Using bundled default cartridge v${DEFAULT_CARTRIDGE.version}`
  );
  _cachedCartridge = DEFAULT_CARTRIDGE;
  return DEFAULT_CARTRIDGE;
}

/**
 * Returns the active cartridge synchronously if already cached,
 * otherwise returns the bundled default immediately.
 *
 * Use this in hot paths (e.g. during inference) where async is not ideal.
 * Call `getActiveCartridge()` at app startup to warm the cache.
 */
export function getActiveCartridgeSync(): CartridgeConfig {
  return _cachedCartridge ?? DEFAULT_CARTRIDGE;
}

/**
 * Builds the system prompt from the active cartridge.
 * Convenience wrapper used by the LLM prompts module.
 */
export function getSystemPrompt(): string {
  return getActiveCartridgeSync().systemPrompt;
}

/**
 * Builds the user prompt from the active cartridge template,
 * substituting {{rawNote}} with the actual note text.
 */
export function buildUserPrompt(rawNote: string): string {
  const cartridge = getActiveCartridgeSync();
  return cartridge.userPromptTemplate.replace('{{rawNote}}', rawNote.trim());
}

/**
 * Invalidates the in-memory cache so the next call to getActiveCartridge()
 * re-reads from disk. Called by cartridgeUpdater after a successful update.
 */
export function invalidateCartridgeCache(): void {
  _cachedCartridge = null;
  console.log('[Cartridge] Cache invalidated — will reload on next access');
}

/**
 * Returns the version string of the currently cached (or default) cartridge.
 * Safe to call synchronously at any time.
 */
export function getCartridgeVersion(): string {
  return (_cachedCartridge ?? DEFAULT_CARTRIDGE).version;
}

/**
 * Returns the versionCode of the currently cached (or default) cartridge.
 * Used by cartridgeUpdater to compare against the remote version.
 */
export function getCartridgeVersionCode(): number {
  return (_cachedCartridge ?? DEFAULT_CARTRIDGE).versionCode;
}
