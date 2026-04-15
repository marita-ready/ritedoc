//! Licence / Activation System — Offline Only
//!
//! RiteDoc is a zero-internet desktop application. Activation is performed
//! entirely offline:
//!
//!   1. User enters a licence key code.
//!   2. Key format is validated locally (RDOC-XXXX-XXXX-XXXX-XXXX).
//!   3. A hardware fingerprint is generated from CPU, RAM, disk/machine ID, and core count.
//!   4. The key is bound to the fingerprint and stored in a local activation.json file.
//!   5. On subsequent launches, the local file is checked — if the fingerprint matches
//!      and the checksum is valid, the app is activated.
//!
//! There are NO network calls, NO Supabase, NO external API calls in this module.

use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::Path;
use sysinfo::System;

// ===== Activation State =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivationState {
    pub is_activated: bool,
    pub key_code: String,
    pub hardware_fingerprint: String,
    pub subscription_type: String,
    pub activated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivationResult {
    pub success: bool,
    pub message: String,
    pub subscription_type: Option<String>,
}

// ===== Local Activation File =====

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalActivation {
    key_code: String,
    hardware_fingerprint: String,
    subscription_type: String,
    activated_at: String,
    checksum: String,
}

// ===== Hardware Fingerprint Generation =====

/// Generate a hardware fingerprint by combining CPU ID, disk serial, and RAM size.
/// This is 100% local — no network calls.
pub fn generate_hardware_fingerprint() -> String {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Component 1: CPU brand/model string
    let cpu_id = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "unknown_cpu".to_string());

    // Component 2: Total RAM (rounded to nearest GB for stability)
    let ram_gb = (sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0)).round() as u64;

    // Component 3: Disk serial / machine ID
    let machine_id = get_machine_id();

    // Component 4: CPU core count
    let cpu_cores = sys.cpus().len();

    // Combine into a stable hash
    let mut hasher = DefaultHasher::new();
    cpu_id.hash(&mut hasher);
    ram_gb.hash(&mut hasher);
    machine_id.hash(&mut hasher);
    cpu_cores.hash(&mut hasher);
    let hash = hasher.finish();

    format!("RDOC-{:016X}", hash)
}

/// Get machine-specific ID (platform-dependent)
fn get_machine_id() -> String {
    // Linux: /etc/machine-id
    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
            return id.trim().to_string();
        }
    }

    // macOS: IOPlatformSerialNumber via ioreg
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    if line.contains("IOPlatformSerialNumber") {
                        if let Some(serial) = line.split('"').nth(3) {
                            return serial.to_string();
                        }
                    }
                }
            }
        }
    }

    // Windows: wmic baseboard get serialnumber
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["baseboard", "get", "serialnumber"])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                if let Some(serial) = text.lines().nth(1) {
                    let serial = serial.trim();
                    if !serial.is_empty() {
                        return serial.to_string();
                    }
                }
            }
        }
    }

    // Fallback: hostname
    if let Ok(hostname) = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("COMPUTERNAME"))
    {
        return hostname;
    }

    "unknown_machine".to_string()
}

// ===== Hardware Profile =====

/// Hardware profile for processing mode selection.
/// Determines whether the machine can run Turbo (3-agent) or Standard (2-agent) mode.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareProfile {
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub ram_gb: u64,
    pub machine_id: String,
    pub fingerprint: String,
    pub recommended_mode: String, // "turbo" or "standard"
}

/// Detect hardware and generate a profile.
/// 100% local — no network calls.
pub fn detect_hardware() -> HardwareProfile {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_brand = sys
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let cpu_cores = sys.cpus().len();
    let ram_gb = (sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0)).round() as u64;
    let machine_id = get_machine_id();
    let fingerprint = generate_hardware_fingerprint();

    // Mode selection per hardware_detection_spec.md:
    //   >= 32 GB RAM → Turbo (3-agent pipeline)
    //   16–31 GB RAM → Standard (2-agent pipeline)
    //   < 16 GB RAM  → Standard (with warning)
    let recommended_mode = if ram_gb >= 32 {
        "turbo".to_string()
    } else {
        "standard".to_string()
    };

    HardwareProfile {
        cpu_brand,
        cpu_cores,
        ram_gb,
        machine_id,
        fingerprint,
        recommended_mode,
    }
}

// ===== Local Activation Storage =====

fn activation_file_path(app_data_dir: &Path) -> std::path::PathBuf {
    app_data_dir.join("activation.json")
}

/// Generate a checksum for tamper detection
fn compute_checksum(key: &str, fingerprint: &str, sub_type: &str) -> String {
    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    fingerprint.hash(&mut hasher);
    sub_type.hash(&mut hasher);
    "ritedoc_salt_2026".hash(&mut hasher);
    format!("{:016X}", hasher.finish())
}

/// Check if the app is already activated (local check only, no network)
pub fn check_local_activation(app_data_dir: &Path) -> Option<ActivationState> {
    let path = activation_file_path(app_data_dir);
    if !path.exists() {
        return None;
    }

    let content = std::fs::read_to_string(&path).ok()?;
    let local: LocalActivation = serde_json::from_str(&content).ok()?;

    // Verify checksum (tamper detection)
    let expected_checksum = compute_checksum(
        &local.key_code,
        &local.hardware_fingerprint,
        &local.subscription_type,
    );
    if local.checksum != expected_checksum {
        log::warn!("Activation file checksum mismatch — possible tampering");
        return None;
    }

    // Verify hardware fingerprint matches current machine
    let current_fingerprint = generate_hardware_fingerprint();
    if local.hardware_fingerprint != current_fingerprint {
        log::warn!(
            "Hardware fingerprint mismatch: stored={}, current={}",
            local.hardware_fingerprint,
            current_fingerprint
        );
        return None;
    }

    Some(ActivationState {
        is_activated: true,
        key_code: local.key_code,
        hardware_fingerprint: local.hardware_fingerprint,
        subscription_type: local.subscription_type,
        activated_at: local.activated_at,
    })
}

/// Save activation data locally
fn save_local_activation(
    app_data_dir: &Path,
    key_code: &str,
    fingerprint: &str,
    subscription_type: &str,
    activated_at: &str,
) -> Result<(), String> {
    let checksum = compute_checksum(key_code, fingerprint, subscription_type);

    let local = LocalActivation {
        key_code: key_code.to_string(),
        hardware_fingerprint: fingerprint.to_string(),
        subscription_type: subscription_type.to_string(),
        activated_at: activated_at.to_string(),
        checksum,
    };

    let json = serde_json::to_string_pretty(&local)
        .map_err(|e| format!("Failed to serialize activation: {}", e))?;

    // Ensure the directory exists
    if let Some(parent) = activation_file_path(app_data_dir).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create activation directory: {}", e))?;
    }

    std::fs::write(activation_file_path(app_data_dir), json)
        .map_err(|e| format!("Failed to save activation file: {}", e))?;

    Ok(())
}

// ===== Key Format Validation =====

/// Validate that a key code matches the expected format: RDOC-XXXX-XXXX-XXXX-XXXX
/// where X is an uppercase alphanumeric character.
fn validate_key_format(key_code: &str) -> bool {
    let parts: Vec<&str> = key_code.split('-').collect();
    if parts.len() != 5 {
        return false;
    }
    if parts[0] != "RDOC" {
        return false;
    }
    for part in &parts[1..] {
        if part.len() != 4 {
            return false;
        }
        if !part.chars().all(|c| c.is_ascii_alphanumeric()) {
            return false;
        }
    }
    true
}

/// Determine subscription type from key prefix pattern.
/// Keys starting with specific second-segment prefixes map to subscription types:
///   F... → founders
///   B... → biab (Business in a Box)
///   anything else → standard
fn determine_subscription_type(key_code: &str) -> String {
    let parts: Vec<&str> = key_code.split('-').collect();
    if parts.len() < 2 {
        return "standard".to_string();
    }
    match parts[1].chars().next() {
        Some('F') => "founders".to_string(),
        Some('B') => "biab".to_string(),
        _ => "standard".to_string(),
    }
}

// ===== Offline Activation =====

/// Activate the app using a licence key — 100% offline.
///
/// Steps:
///   1. Validate key format (RDOC-XXXX-XXXX-XXXX-XXXX)
///   2. Generate hardware fingerprint
///   3. Determine subscription type from key prefix
///   4. Bind key to hardware fingerprint
///   5. Save activation state locally
///
/// No network calls. No Supabase. No phone-home.
pub fn activate_offline(
    key_code: &str,
    app_data_dir: &Path,
) -> ActivationResult {
    // Step 1: Validate key format
    let key_trimmed = key_code.trim().to_uppercase();
    if !validate_key_format(&key_trimmed) {
        return ActivationResult {
            success: false,
            message: "Invalid key format. Expected: RDOC-XXXX-XXXX-XXXX-XXXX".to_string(),
            subscription_type: None,
        };
    }

    // Step 2: Check if already activated with this key
    if let Some(existing) = check_local_activation(app_data_dir) {
        if existing.key_code == key_trimmed {
            return ActivationResult {
                success: true,
                message: format!(
                    "RiteDoc is already activated. Subscription: {}",
                    format_subscription_type(&existing.subscription_type)
                ),
                subscription_type: Some(existing.subscription_type),
            };
        }
    }

    // Step 3: Generate hardware fingerprint
    let fingerprint = generate_hardware_fingerprint();

    // Step 4: Determine subscription type from key prefix
    let subscription_type = determine_subscription_type(&key_trimmed);

    // Step 5: Generate activation timestamp
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    // Step 6: Save locally
    if let Err(e) = save_local_activation(
        app_data_dir,
        &key_trimmed,
        &fingerprint,
        &subscription_type,
        &now,
    ) {
        return ActivationResult {
            success: false,
            message: format!("Failed to save activation: {}", e),
            subscription_type: None,
        };
    }

    ActivationResult {
        success: true,
        message: format!(
            "RiteDoc activated successfully! Subscription: {}",
            format_subscription_type(&subscription_type)
        ),
        subscription_type: Some(subscription_type),
    }
}

/// Deactivate the app — removes the local activation file.
pub fn deactivate(app_data_dir: &Path) -> Result<(), String> {
    let path = activation_file_path(app_data_dir);
    if path.exists() {
        std::fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove activation file: {}", e))?;
    }
    Ok(())
}

/// Format subscription type for display
fn format_subscription_type(sub_type: &str) -> &str {
    match sub_type {
        "founders" => "Founders Edition",
        "standard" => "Standard",
        "biab" => "Business in a Box",
        _ => sub_type,
    }
}

// ===== Tests =====

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_key_format_valid() {
        assert!(validate_key_format("RDOC-ABCD-1234-EFGH-5678"));
        assert!(validate_key_format("RDOC-F001-AAAA-BBBB-CCCC"));
        assert!(validate_key_format("RDOC-B999-ZZZZ-0000-1111"));
    }

    #[test]
    fn test_key_format_invalid() {
        assert!(!validate_key_format("RDOC-ABC-1234-EFGH-5678")); // short segment
        assert!(!validate_key_format("XDOC-ABCD-1234-EFGH-5678")); // wrong prefix
        assert!(!validate_key_format("RDOC-ABCD-1234-EFGH")); // missing segment
        assert!(!validate_key_format("RDOCABCD12345678")); // no dashes
        assert!(!validate_key_format("")); // empty
        assert!(!validate_key_format("RDOC-AB!D-1234-EFGH-5678")); // special char
    }

    #[test]
    fn test_subscription_type_detection() {
        assert_eq!(determine_subscription_type("RDOC-F001-AAAA-BBBB-CCCC"), "founders");
        assert_eq!(determine_subscription_type("RDOC-B999-ZZZZ-0000-1111"), "biab");
        assert_eq!(determine_subscription_type("RDOC-S001-AAAA-BBBB-CCCC"), "standard");
        assert_eq!(determine_subscription_type("RDOC-1234-AAAA-BBBB-CCCC"), "standard");
    }

    #[test]
    fn test_hardware_fingerprint_is_deterministic() {
        let fp1 = generate_hardware_fingerprint();
        let fp2 = generate_hardware_fingerprint();
        assert_eq!(fp1, fp2);
        assert!(fp1.starts_with("RDOC-"));
    }

    #[test]
    fn test_hardware_profile_detection() {
        let profile = detect_hardware();
        assert!(!profile.cpu_brand.is_empty());
        assert!(profile.cpu_cores > 0);
        assert!(profile.ram_gb > 0);
        assert!(profile.fingerprint.starts_with("RDOC-"));
        assert!(
            profile.recommended_mode == "turbo" || profile.recommended_mode == "standard"
        );
    }

    #[test]
    fn test_activate_invalid_key() {
        let tmp = PathBuf::from("/tmp/ritedoc_test_activation");
        let _ = std::fs::create_dir_all(&tmp);
        let result = activate_offline("INVALID-KEY", &tmp);
        assert!(!result.success);
        assert!(result.message.contains("Invalid key format"));
        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_activate_valid_key_and_check() {
        let tmp = PathBuf::from("/tmp/ritedoc_test_activation_valid");
        let _ = std::fs::remove_dir_all(&tmp);
        let _ = std::fs::create_dir_all(&tmp);

        // Activate
        let result = activate_offline("RDOC-F001-AAAA-BBBB-CCCC", &tmp);
        assert!(result.success);
        assert_eq!(result.subscription_type, Some("founders".to_string()));

        // Check local activation
        let state = check_local_activation(&tmp);
        assert!(state.is_some());
        let state = state.unwrap();
        assert!(state.is_activated);
        assert_eq!(state.key_code, "RDOC-F001-AAAA-BBBB-CCCC");
        assert_eq!(state.subscription_type, "founders");

        // Re-activate same key — should succeed (already activated)
        let result2 = activate_offline("RDOC-F001-AAAA-BBBB-CCCC", &tmp);
        assert!(result2.success);
        assert!(result2.message.contains("already activated"));

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_deactivate() {
        let tmp = PathBuf::from("/tmp/ritedoc_test_deactivation");
        let _ = std::fs::remove_dir_all(&tmp);
        let _ = std::fs::create_dir_all(&tmp);

        // Activate first
        let _ = activate_offline("RDOC-S001-AAAA-BBBB-CCCC", &tmp);
        assert!(check_local_activation(&tmp).is_some());

        // Deactivate
        deactivate(&tmp).unwrap();
        assert!(check_local_activation(&tmp).is_none());

        let _ = std::fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_checksum_tamper_detection() {
        let tmp = PathBuf::from("/tmp/ritedoc_test_tamper");
        let _ = std::fs::remove_dir_all(&tmp);
        let _ = std::fs::create_dir_all(&tmp);

        // Activate
        let _ = activate_offline("RDOC-S001-AAAA-BBBB-CCCC", &tmp);
        assert!(check_local_activation(&tmp).is_some());

        // Tamper with the file
        let path = tmp.join("activation.json");
        let mut content: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
        content["subscription_type"] = serde_json::Value::String("founders".to_string());
        std::fs::write(&path, serde_json::to_string_pretty(&content).unwrap()).unwrap();

        // Check should fail — checksum mismatch
        assert!(check_local_activation(&tmp).is_none());

        let _ = std::fs::remove_dir_all(&tmp);
    }
}
