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

// ===== Supabase Response Types =====

#[derive(Debug, Deserialize)]
struct SupabaseKeyRecord {
    id: String,
    key_code: String,
    subscription_type: String,
    hardware_fingerprint: Option<String>,
    activated_at: Option<String>,
    deactivated_at: Option<String>,
    is_active: bool,
}

// ===== Hardware Fingerprint Generation =====

/// Generate a hardware fingerprint by combining CPU ID, disk serial, and RAM size
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

/// Save activation data locally after successful Supabase validation
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

    std::fs::write(activation_file_path(app_data_dir), json)
        .map_err(|e| format!("Failed to save activation file: {}", e))?;

    Ok(())
}

// ===== Supabase Activation =====

/// Activate the app by validating the key against Supabase
/// This is the ONE HTTPS call made during activation — never again after success.
pub async fn activate_with_supabase(
    key_code: &str,
    app_data_dir: &Path,
    supabase_url: &str,
    supabase_anon_key: &str,
) -> ActivationResult {
    let fingerprint = generate_hardware_fingerprint();

    // Step 1: Query Supabase for this key
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ActivationResult {
                success: false,
                message: format!("Network error: {}. Please check your internet connection and try again.", e),
                subscription_type: None,
            };
        }
    };

    let query_url = format!(
        "{}/rest/v1/activation_keys?key_code=eq.{}&select=*",
        supabase_url,
        urlencoding_simple(key_code)
    );

    let response = match client
        .get(&query_url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .header("Content-Type", "application/json")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return ActivationResult {
                success: false,
                message: format!(
                    "Unable to connect to activation server. Please check your internet connection and try again. Error: {}",
                    e
                ),
                subscription_type: None,
            };
        }
    };

    if !response.status().is_success() {
        return ActivationResult {
            success: false,
            message: format!(
                "Activation server returned an error ({}). Please try again or contact support@readycompliant.com",
                response.status()
            ),
            subscription_type: None,
        };
    }

    let records: Vec<SupabaseKeyRecord> = match response.json().await {
        Ok(r) => r,
        Err(e) => {
            return ActivationResult {
                success: false,
                message: format!("Invalid response from activation server: {}", e),
                subscription_type: None,
            };
        }
    };

    // Step 2: Validate the key
    if records.is_empty() {
        return ActivationResult {
            success: false,
            message: "Invalid activation key. Please check your key and try again. If you believe this is an error, contact support@readycompliant.com".to_string(),
            subscription_type: None,
        };
    }

    let record = &records[0];

    // Check if key is deactivated
    if !record.is_active || record.deactivated_at.is_some() {
        return ActivationResult {
            success: false,
            message: "This activation key has been deactivated. Please contact support@readycompliant.com for assistance.".to_string(),
            subscription_type: None,
        };
    }

    // Check if already activated on another device
    if record.activated_at.is_some() && record.hardware_fingerprint.is_some() {
        let stored_fp = record.hardware_fingerprint.as_ref().unwrap();
        if stored_fp != &fingerprint {
            return ActivationResult {
                success: false,
                message: "This key is already activated on another device. Please contact support@readycompliant.com".to_string(),
                subscription_type: None,
            };
        }
        // Same device re-activation — allow it
    }

    // Step 3: Lock the key to this device in Supabase
    let now = chrono::Utc::now().to_rfc3339();
    let update_url = format!(
        "{}/rest/v1/activation_keys?id=eq.{}",
        supabase_url, record.id
    );

    let update_body = serde_json::json!({
        "hardware_fingerprint": fingerprint,
        "activated_at": now,
    });

    let update_result = client
        .patch(&update_url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=minimal")
        .json(&update_body)
        .send()
        .await;

    match update_result {
        Ok(resp) if resp.status().is_success() => {
            // Step 4: Save locally — never contact Supabase again
            if let Err(e) = save_local_activation(
                app_data_dir,
                key_code,
                &fingerprint,
                &record.subscription_type,
                &now,
            ) {
                return ActivationResult {
                    success: false,
                    message: format!("Activation succeeded but failed to save locally: {}", e),
                    subscription_type: Some(record.subscription_type.clone()),
                };
            }

            // Also write to key_audit_log
            let _ = log_key_action(
                &client,
                supabase_url,
                supabase_anon_key,
                &record.id,
                "activated",
                &format!("Activated on device {}", fingerprint),
            )
            .await;

            ActivationResult {
                success: true,
                message: format!(
                    "RiteDoc activated successfully! Subscription: {}",
                    format_subscription_type(&record.subscription_type)
                ),
                subscription_type: Some(record.subscription_type.clone()),
            }
        }
        Ok(resp) => ActivationResult {
            success: false,
            message: format!(
                "Failed to lock activation key ({}). Please try again.",
                resp.status()
            ),
            subscription_type: None,
        },
        Err(e) => ActivationResult {
            success: false,
            message: format!("Network error during activation: {}", e),
            subscription_type: None,
        },
    }
}

/// Log a key action to the audit log
async fn log_key_action(
    client: &reqwest::Client,
    supabase_url: &str,
    supabase_anon_key: &str,
    key_id: &str,
    action: &str,
    reason: &str,
) -> Result<(), String> {
    let url = format!("{}/rest/v1/key_audit_log", supabase_url);
    let body = serde_json::json!({
        "key_id": key_id,
        "action": action,
        "reason": reason,
        "performed_at": chrono::Utc::now().to_rfc3339(),
    });

    client
        .post(&url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Simple URL encoding for key codes
fn urlencoding_simple(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
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
