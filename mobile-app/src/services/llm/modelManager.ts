/**
 * RiteDoc Mobile App — LLM Model Manager
 *
 * Singleton service that manages the on-device Gemma 2B model lifecycle:
 * - Loading the GGUF model into memory via llama.rn
 * - Running inference (note rewriting)
 * - Releasing resources when done
 *
 * The model runs entirely on-device. No network calls are made.
 *
 * Usage:
 *   import { modelManager } from './modelManager';
 *   await modelManager.ensureLoaded();
 *   const result = await modelManager.rewriteNote(rawText, onToken);
 */

import { initLlama, type LlamaContext } from 'llama.rn';
import {
  MODEL_PATH,
  MODEL_CONTEXT_SIZE,
  MODEL_GPU_LAYERS,
  MAX_PREDICT_TOKENS,
  GENERATION_TEMPERATURE,
  GENERATION_TOP_P,
  GENERATION_REPEAT_PENALTY,
  STOP_TOKENS,
} from './config';
import { buildRewriteMessages } from './prompts';
import { isModelAvailable } from './modelFiles';

// ─── Types ───────────────────────────────────────────────────────────

export type ModelStatus =
  | 'idle'           // Not loaded, not loading
  | 'loading'        // Currently loading into memory
  | 'ready'          // Loaded and ready for inference
  | 'inferring'      // Currently running inference
  | 'error';         // Failed to load or run

export interface RewriteResult {
  /** The rewritten note text */
  text: string;
  /** Generation timing stats from llama.rn */
  timings?: {
    predicted_per_second?: number;
    predicted_n?: number;
  };
}

export type TokenCallback = (data: { token: string }) => void;

export type StatusChangeCallback = (status: ModelStatus) => void;

// ─── Model Manager (Singleton) ──────────────────────────────────────

class ModelManager {
  private context: LlamaContext | null = null;
  private _status: ModelStatus = 'idle';
  private loadPromise: Promise<void> | null = null;
  private statusListeners: Set<StatusChangeCallback> = new Set();

  // ── Status ──────────────────────────────────────────────────────

  get status(): ModelStatus {
    return this._status;
  }

  get isReady(): boolean {
    return this._status === 'ready';
  }

  get isLoading(): boolean {
    return this._status === 'loading';
  }

  private setStatus(status: ModelStatus) {
    this._status = status;
    this.statusListeners.forEach((cb) => cb(status));
  }

  /**
   * Subscribe to status changes.
   * Returns an unsubscribe function.
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusListeners.add(callback);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // ── Loading ─────────────────────────────────────────────────────

  /**
   * Load the model into memory if not already loaded.
   * Safe to call multiple times — will deduplicate concurrent calls.
   *
   * @throws Error if the model file is not found or loading fails
   */
  async ensureLoaded(): Promise<void> {
    if (this._status === 'ready' && this.context) {
      return; // Already loaded
    }

    if (this.loadPromise) {
      return this.loadPromise; // Already loading — wait for it
    }

    this.loadPromise = this.loadModel();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async loadModel(): Promise<void> {
    this.setStatus('loading');

    try {
      // Check if model file exists on device
      const available = await isModelAvailable();
      if (!available) {
        throw new Error(
          'Model file not found. The Gemma 2B model must be placed in the app\'s ' +
          'models directory before use. See MODEL_SETUP.md for instructions.'
        );
      }

      // Initialize llama.rn context with the model
      const context = await initLlama({
        model: MODEL_PATH,
        use_mlock: true,
        n_ctx: MODEL_CONTEXT_SIZE,
        n_gpu_layers: MODEL_GPU_LAYERS,
      });

      this.context = context;
      this.setStatus('ready');

      console.log('[RiteDoc LLM] Model loaded successfully');
    } catch (error) {
      this.setStatus('error');
      this.context = null;
      console.error('[RiteDoc LLM] Failed to load model:', error);
      throw error;
    }
  }

  // ── Inference ───────────────────────────────────────────────────

  /**
   * Rewrite a raw progress note into a professional NDIS-compliant note.
   *
   * @param rawNote - The raw text from the support worker
   * @param onToken - Optional streaming callback, called for each generated token
   * @returns The complete rewritten note and timing stats
   * @throws Error if the model is not loaded or inference fails
   */
  async rewriteNote(
    rawNote: string,
    onToken?: TokenCallback,
  ): Promise<RewriteResult> {
    if (!this.context) {
      throw new Error(
        'Model not loaded. Call ensureLoaded() before rewriteNote().'
      );
    }

    if (this._status === 'inferring') {
      throw new Error(
        'Model is already processing a note. Please wait for the current rewrite to finish.'
      );
    }

    this.setStatus('inferring');

    try {
      const messages = buildRewriteMessages(rawNote);

      const result = await this.context.completion(
        {
          messages,
          n_predict: MAX_PREDICT_TOKENS,
          stop: STOP_TOKENS,
          temperature: GENERATION_TEMPERATURE,
          top_p: GENERATION_TOP_P,
          penalty_repeat: GENERATION_REPEAT_PENALTY,
        },
        onToken
          ? (data: { token: string }) => onToken(data)
          : undefined,
      );

      this.setStatus('ready');

      return {
        text: result.text.trim(),
        timings: result.timings
          ? {
              predicted_per_second: result.timings.predicted_per_second,
              predicted_n: result.timings.predicted_n,
            }
          : undefined,
      };
    } catch (error) {
      this.setStatus('ready'); // Model is still loaded, just inference failed
      console.error('[RiteDoc LLM] Inference failed:', error);
      throw error;
    }
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  /**
   * Release the model from memory.
   * Call this when the model is no longer needed to free resources.
   */
  async release(): Promise<void> {
    if (this.context) {
      try {
        await this.context.release();
      } catch (error) {
        console.warn('[RiteDoc LLM] Error releasing context:', error);
      }
      this.context = null;
    }
    this.setStatus('idle');
    console.log('[RiteDoc LLM] Model released');
  }
}

// Export singleton instance
export const modelManager = new ModelManager();
