/**
 * RiteDoc Mobile App — LLM Configuration
 *
 * Central configuration for the on-device Gemma 2B model used for
 * rewriting raw progress notes into professional NDIS-compliant notes.
 *
 * The model runs entirely on-device via llama.rn (llama.cpp binding).
 * No network calls, no cloud, no server — fully offline.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// ─── Model file ──────────────────────────────────────────────────────
/**
 * Expected model filename.
 *
 * The app ships with a Gemma 2 2B Instruct model in GGUF format,
 * 4-bit quantized (Q4_K_M) at ~1.7 GB.
 *
 * Recommended source:
 *   https://huggingface.co/bartowski/gemma-2-2b-it-GGUF
 *   File: gemma-2-2b-it-Q4_K_M.gguf
 *
 * See MODEL_SETUP.md for placement instructions.
 */
export const MODEL_FILENAME = 'gemma-2-2b-it-Q4_K_M.gguf';

/**
 * Directory where the model file is stored on-device.
 *
 * For Expo/React Native, we use the app's document directory which
 * persists across app updates and is not cleared by the OS.
 */
export const MODEL_DIR = `${FileSystem.documentDirectory}models/`;

/**
 * Full path to the model file on-device.
 */
export const MODEL_PATH = `${MODEL_DIR}${MODEL_FILENAME}`;

// ─── llama.rn init parameters ────────────────────────────────────────
/**
 * Context size — how many tokens the model can process at once.
 * 2048 is sufficient for note rewriting (input + output combined).
 */
export const MODEL_CONTEXT_SIZE = 2048;

/**
 * Number of GPU layers to offload.
 * - iOS: Metal acceleration (set high for full GPU offload)
 * - Android: OpenCL if available, otherwise CPU-only
 * 99 = offload all layers to GPU when available.
 */
export const MODEL_GPU_LAYERS = Platform.OS === 'ios' ? 99 : 99;

/**
 * Maximum tokens to generate in a single rewrite.
 * NDIS progress notes are typically 100–300 words (~150–450 tokens).
 * We allow up to 1024 tokens for longer notes with headroom.
 */
export const MAX_PREDICT_TOKENS = 1024;

/**
 * Temperature for generation.
 * Low temperature (0.3) for deterministic, professional output.
 * We want consistent, reliable rewrites — not creative writing.
 */
export const GENERATION_TEMPERATURE = 0.3;

/**
 * Top-p (nucleus) sampling.
 * Combined with low temperature for focused output.
 */
export const GENERATION_TOP_P = 0.9;

/**
 * Repetition penalty to avoid repetitive phrasing.
 */
export const GENERATION_REPEAT_PENALTY = 1.1;

// ─── Stop tokens ─────────────────────────────────────────────────────
/**
 * Stop sequences for Gemma 2 Instruct model.
 * These signal the model to stop generating.
 */
export const STOP_TOKENS = [
  '<end_of_turn>',
  '<eos>',
  '<|im_end|>',
  '<|end|>',
  '</s>',
];
