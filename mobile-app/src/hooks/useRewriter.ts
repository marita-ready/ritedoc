/**
 * RiteDoc Mobile App — useRewriter Hook
 *
 * React hook that wraps the LLM model manager for use in components.
 * Handles model loading, inference, streaming, and error states.
 *
 * Usage:
 *   const {
 *     rewrite,
 *     isModelLoading,
 *     isRewriting,
 *     streamedText,
 *     error,
 *     modelStatus,
 *   } = useRewriter();
 *
 *   // Trigger a rewrite
 *   const result = await rewrite(rawNoteText);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  modelManager,
  isModelAvailable,
  type ModelStatus,
  type RewriteResult,
} from '../services/llm';

export interface UseRewriterReturn {
  /** Trigger a note rewrite. Loads model if needed. Returns the result. */
  rewrite: (rawNote: string) => Promise<RewriteResult | null>;
  /** Whether the model is currently being loaded into memory */
  isModelLoading: boolean;
  /** Whether inference is currently running */
  isRewriting: boolean;
  /** Streamed text so far (updated token by token during inference) */
  streamedText: string;
  /** Error message, if any */
  error: string | null;
  /** Clear the current error */
  clearError: () => void;
  /** Current model status */
  modelStatus: ModelStatus;
  /** Whether the model file exists on device */
  modelAvailable: boolean | null;
  /** Check if the model file is available */
  checkModelAvailable: () => Promise<boolean>;
}

export function useRewriter(): UseRewriterReturn {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(
    modelManager.status
  );
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modelAvailable, setModelAvailable] = useState<boolean | null>(null);

  // Use ref to track mounted state for async safety
  const mountedRef = useRef(true);

  // Subscribe to model status changes
  useEffect(() => {
    const unsubscribe = modelManager.onStatusChange((status) => {
      if (mountedRef.current) {
        setModelStatus(status);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Check model availability on mount
  useEffect(() => {
    checkModelAvailable();
  }, []);

  const checkModelAvailable = useCallback(async (): Promise<boolean> => {
    try {
      const available = await isModelAvailable();
      if (mountedRef.current) {
        setModelAvailable(available);
      }
      return available;
    } catch {
      if (mountedRef.current) {
        setModelAvailable(false);
      }
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const rewrite = useCallback(
    async (rawNote: string): Promise<RewriteResult | null> => {
      setError(null);
      setStreamedText('');

      try {
        // Check model file exists
        const available = await isModelAvailable();
        if (!available) {
          const msg =
            'The AI model is not installed on this device yet. ' +
            'Please contact your administrator to set up the model.';
          setError(msg);
          return null;
        }

        // Load model if needed
        await modelManager.ensureLoaded();

        // Run inference with streaming
        const result = await modelManager.rewriteNote(
          rawNote,
          (data: { token: string }) => {
            if (mountedRef.current) {
              setStreamedText((prev) => prev + data.token);
            }
          },
        );

        return result;
      } catch (err: any) {
        const message =
          err?.message || 'An unexpected error occurred during rewriting.';

        if (mountedRef.current) {
          setError(message);
        }

        return null;
      }
    },
    [],
  );

  return {
    rewrite,
    isModelLoading: modelStatus === 'loading',
    isRewriting: modelStatus === 'inferring',
    streamedText,
    error,
    clearError,
    modelStatus,
    modelAvailable,
    checkModelAvailable,
  };
}
