/**
 * TypeScript bindings for RiteDoc Tauri commands.
 *
 * Each function wraps a `@tauri-apps/api` invoke call so the React
 * frontend can call the Rust backend in a type-safe way.
 *
 * The rewriting pipeline uses a native inference engine (llama.cpp
 * compiled directly into the Tauri binary via llama-cpp-2 Rust bindings).
 * No Docker, no HTTP server, no containers.
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
  traffic_light: string;
  red_flag_keywords: string[];
  red_flag_categories: { category: string; keywords: string[] }[];
  missing_pillars: { pillar: string; prompt_question: string }[];
  present_pillars: string[];
  compliance_analysis: string;
  draft_text: string;
  review_notes: string;
  /** Incident package — only present for RED notes (Filter 5 output). */
  incident_package?: IncidentPackage;
}

// ─────────────────────────────────────────────
//  Incident package types (Filter 5)
// ─────────────────────────────────────────────

export interface IncidentPackage {
  header: string;
  procedural_alignment: ProceduralAlignment;
  incident_forms: PreFilledForm[];
  legislative_references: string[];
  reporting_timeframe: string;
  required_notifications: NotificationGroup[];
  disclaimer: string;
}

export interface ProceduralAlignment {
  steps_total: number;
  steps_documented: number;
  steps: StepResult[];
}

export interface StepResult {
  category_name: string;
  step_number: number;
  action: string;
  documented: boolean;
  evidence_found: string[];
  gap_text: string;
}

export interface PreFilledForm {
  form_name: string;
  authority: string;
  fields: PreFilledField[];
}

export interface PreFilledField {
  label: string;
  value: string;
  required: boolean;
  auto_filled: boolean;
}

export interface NotificationGroup {
  group_type: string;
  recipients: string[];
}

export type RewriteMode = "quick" | "deep";

// ─────────────────────────────────────────────
//  Batch processing types
// ─────────────────────────────────────────────

export interface BatchNoteInput {
  id: string;
  raw_text: string;
  participant_name?: string;
  support_worker?: string;
  date?: string;
  time?: string;
}

export interface BatchNoteResult {
  id: string;
  result: RewriteResult;
}

// ─────────────────────────────────────────────
//  CSV import types
// ─────────────────────────────────────────────

export interface RawNote {
  id: string;
  participant_name: string;
  support_worker: string;
  date: string;
  time: string;
  duration: string;
  raw_text: string;
  source_platform: string;
  row_index: number;
}

export interface CsvParseResult {
  platform: string;
  notes: RawNote[];
  total_count: number;
  warnings: string[];
}

// ─────────────────────────────────────────────
//  Activation types
// ─────────────────────────────────────────────

export interface ActivationState {
  is_activated: boolean;
  key_code: string;
  hardware_fingerprint: string;
  subscription_type: string;
  activated_at: string;
}

export interface ActivationResult {
  success: boolean;
  message: string;
  subscription_type: string | null;
}

export interface HardwareProfile {
  cpu_brand: string;
  cpu_cores: number;
  ram_gb: number;
  machine_id: string;
  fingerprint: string;
  recommended_mode: string;
}

// ─────────────────────────────────────────────
//  Engine Status types (native inference engine)
// ─────────────────────────────────────────────

export interface EngineStatus {
  ready: boolean;
  model_path: string;
  model_found: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────
//  Regulation Sync types
// ─────────────────────────────────────────────

export interface SyncStatus {
  current_version: string;
  update_available: boolean;
  latest_version: string;
  last_synced: string;
  last_checked: string;
  last_check_ok: boolean;
  message: string;
}

export interface SyncCheckResult {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  message: string;
}

export interface SyncApplyResult {
  success: boolean;
  version: string;
  updated_date: string;
  message: string;
  files_updated: string[];
}

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

// ─────────────────────────────────────────────
//  Batch rewrite pipeline
// ─────────────────────────────────────────────

export async function rewriteBatch(
  notes: BatchNoteInput[],
  cartridgeId: number,
  mode: RewriteMode = "deep"
): Promise<BatchNoteResult[]> {
  return invoke<BatchNoteResult[]>("rewrite_batch", {
    notes,
    cartridgeId,
    mode,
  });
}

// ─────────────────────────────────────────────
//  CSV import (offline — reads local file)
// ─────────────────────────────────────────────

export async function importCsv(filePath: string): Promise<CsvParseResult> {
  return invoke<CsvParseResult>("import_csv", { filePath });
}

// ─────────────────────────────────────────────
//  Activation (100% offline)
// ─────────────────────────────────────────────

export async function activateLicence(
  keyCode: string
): Promise<ActivationResult> {
  return invoke<ActivationResult>("activate_licence", { keyCode });
}

export async function checkActivation(): Promise<ActivationState | null> {
  return invoke<ActivationState | null>("check_activation");
}

export async function deactivateLicence(): Promise<void> {
  return invoke<void>("deactivate_licence");
}

// ─────────────────────────────────────────────
//  Hardware profile (local detection)
// ─────────────────────────────────────────────

export async function getHardwareProfile(): Promise<HardwareProfile> {
  return invoke<HardwareProfile>("get_hardware_profile");
}

// ─────────────────────────────────────────────
//  Engine Status (native inference engine)
// ─────────────────────────────────────────────

export async function getEngineStatus(): Promise<EngineStatus> {
  return invoke<EngineStatus>("get_engine_status");
}

// ─────────────────────────────────────────────
//  Regulation Sync (offline-first, 5 security layers)
// ─────────────────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  return invoke<SyncStatus>("get_sync_status");
}

export async function checkRegulationSync(): Promise<SyncCheckResult> {
  return invoke<SyncCheckResult>("check_regulation_sync");
}

export async function applyRegulationSync(): Promise<SyncApplyResult> {
  return invoke<SyncApplyResult>("apply_regulation_sync");
}

// ─────────────────────────────────────────────
//  Self-Fix Diagnostics types
// ─────────────────────────────────────────────

export type IssueSeverity = "info" | "warning" | "critical";

export interface DiagnosticIssue {
  category: string;
  description: string;
  action_taken: string;
  resolved: boolean;
  severity: IssueSeverity;
  timestamp: string;
}

export interface DiagnosticReport {
  run_at: string;
  all_ok: boolean;
  ram_ok: boolean;
  ram_available_gb: number;
  disk_ok: boolean;
  disk_available_gb: number;
  engine_ok: boolean;
  cartridges_ok: boolean;
  licence_ok: boolean;
  issues: DiagnosticIssue[];
  recommend_mode_downgrade: boolean;
  summary: string;
}

// ─────────────────────────────────────────────
//  Diagnostic Reporter types
// ─────────────────────────────────────────────

export interface SessionError {
  timestamp: string;
  category: string;
  message: string;
}

export interface DiagnosticReportResult {
  success: boolean;
  message: string;
  report_id: string | null;
  sent_at: string;
}

// ─────────────────────────────────────────────
//  Self-Fix command
// ─────────────────────────────────────────────

export async function runSelfFix(): Promise<DiagnosticReport> {
  return invoke<DiagnosticReport>("run_self_fix");
}

// ─────────────────────────────────────────────
//  Diagnostic Reporter command (explicit user action only)
// ─────────────────────────────────────────────

export async function sendDiagnosticReport(
  sessionErrors: SessionError[] = []
): Promise<DiagnosticReportResult> {
  return invoke<DiagnosticReportResult>("send_diagnostic_report", {
    sessionErrors,
  });
}
