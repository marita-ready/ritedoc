/**
 * TypeScript bindings for RiteDoc Tauri commands.
 *
 * Each function wraps a `@tauri-apps/api` invoke call so the React
 * frontend can call the Rust backend in a type-safe way.
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

export interface Goal {
  id: number;
  participant_name: string;
  goal_text: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
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
//  Goals
// ─────────────────────────────────────────────

export async function createGoal(
  participantName: string,
  goalText: string,
  status?: string,
  notes?: string
): Promise<Goal> {
  return invoke<Goal>("create_goal", {
    participantName,
    goalText,
    status: status ?? null,
    notes: notes ?? null,
  });
}

export async function getGoals(): Promise<Goal[]> {
  return invoke<Goal[]>("get_goals");
}

export async function updateGoal(
  id: number,
  participantName?: string,
  goalText?: string,
  status?: string,
  notes?: string
): Promise<Goal> {
  return invoke<Goal>("update_goal", {
    id,
    participantName: participantName ?? null,
    goalText: goalText ?? null,
    status: status ?? null,
    notes: notes ?? null,
  });
}
