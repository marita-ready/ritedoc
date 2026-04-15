/**
 * TypeScript bindings for RiteDoc Tauri commands.
 *
 * Each function wraps a `@tauri-apps/api` invoke call so the React
 * frontend can call the Rust backend in a type-safe way.
 *
 * The rewriting pipeline calls the Nanoclaw local server (Dockerized
 * llama.cpp serving Phi-4-mini Q4_K_M) at http://localhost:8080.
 */

import { invoke } from "@tauri-apps/api/core";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface Cartridge {
  id: number;
  name: string;
  service_type: string;
  description: string;
  config_json: string;
  is_active: boolean;
  created_at: string;
}

/** Parsed structure of a cartridge's config_json. */
export interface CartridgeConfig {
  service_type: string;
  compliance_rules: string[];
  required_fields: string[];
  format_template: string;
  tone_guidelines: string[];
  prohibited_terms: string[];
  example_output: string;
}

/** Parse a cartridge's config_json string into a CartridgeConfig object. */
export function parseCartridgeConfig(configJson: string): CartridgeConfig {
  try {
    const parsed = JSON.parse(configJson);
    return {
      service_type: parsed.service_type ?? "",
      compliance_rules: parsed.compliance_rules ?? [],
      required_fields: parsed.required_fields ?? [],
      format_template: parsed.format_template ?? "",
      tone_guidelines: parsed.tone_guidelines ?? [],
      prohibited_terms: parsed.prohibited_terms ?? [],
      example_output: parsed.example_output ?? "",
    };
  } catch {
    return {
      service_type: "",
      compliance_rules: [],
      required_fields: [],
      format_template: "",
      tone_guidelines: [],
      prohibited_terms: [],
      example_output: "",
    };
  }
}

export interface RewriteResult {
  final_text: string;
  mode: string;
  compliance_analysis: string;
  draft_text: string;
  review_notes: string;
}

export type RewriteMode = "quick" | "deep";

// ─────────────────────────────────────────────
//  Cartridges
// ─────────────────────────────────────────────

export async function createCartridge(
  name: string,
  serviceType?: string,
  description?: string,
  configJson?: string,
  isActive?: boolean
): Promise<Cartridge> {
  return invoke<Cartridge>("create_cartridge", {
    name,
    serviceType: serviceType ?? null,
    description: description ?? null,
    configJson: configJson ?? null,
    isActive: isActive ?? null,
  });
}

export async function getCartridges(): Promise<Cartridge[]> {
  return invoke<Cartridge[]>("get_cartridges");
}

export async function getActiveCartridges(): Promise<Cartridge[]> {
  return invoke<Cartridge[]>("get_active_cartridges");
}

/** Toggle a cartridge's active/inactive state. */
export async function updateCartridgeActive(
  id: number,
  isActive: boolean
): Promise<boolean> {
  return invoke<boolean>("update_cartridge_active", { id, isActive });
}

// ─────────────────────────────────────────────
//  Settings
// ─────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

export async function setSetting(
  key: string,
  value: string
): Promise<boolean> {
  return invoke<boolean>("set_setting", { key, value });
}

// ─────────────────────────────────────────────
//  Rewrite pipeline
// ─────────────────────────────────────────────

export async function rewriteNote(
  rawText: string,
  cartridgeId: number,
  mode: RewriteMode = "deep"
): Promise<RewriteResult> {
  return invoke<RewriteResult>("rewrite_note", {
    rawText,
    cartridgeId,
    mode,
  });
}
