/**
 * RiteDoc Mobile App — LLM Service
 *
 * On-device note rewriting powered by Gemma 2B via llama.rn.
 * Fully offline — no API calls, no cloud, no server.
 *
 * Usage:
 *   import { modelManager, isModelAvailable } from '../services/llm';
 *
 *   // Check if model is available
 *   const available = await isModelAvailable();
 *
 *   // Load model (call once, e.g. on app start or first rewrite)
 *   await modelManager.ensureLoaded();
 *
 *   // Rewrite a note
 *   const result = await modelManager.rewriteNote(rawText, (data) => {
 *     // Streaming token callback
 *     console.log(data.token);
 *   });
 *   console.log(result.text);
 */

// Model manager (singleton)
export { modelManager } from './modelManager';
export type {
  ModelStatus,
  RewriteResult,
  TokenCallback,
  StatusChangeCallback,
} from './modelManager';

// Model file utilities
export {
  isModelAvailable,
  getModelFileSize,
  formatFileSize,
  ensureModelDirectory,
  getModelStatus,
} from './modelFiles';

// Configuration
export {
  MODEL_FILENAME,
  MODEL_DIR,
  MODEL_PATH,
  MODEL_CONTEXT_SIZE,
  MODEL_GPU_LAYERS,
  MAX_PREDICT_TOKENS,
} from './config';

// Prompts
export {
  REWRITE_SYSTEM_PROMPT,
  buildRewriteUserPrompt,
  buildRewriteMessages,
} from './prompts';
