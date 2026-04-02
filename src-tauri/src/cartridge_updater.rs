use serde::{Deserialize, Serialize};
use std::path::Path;

// ===== Version Info =====

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartridgeVersionInfo {
    pub current_version: String,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub last_checked: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateApplyResult {
    pub success: bool,
    pub version: String,
    pub message: String,
}

// ===== Remote Version Manifest =====

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RemoteManifest {
    version: String,
    files: Vec<RemoteFile>,
    release_notes: Option<String>,
    published_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RemoteFile {
    filename: String,
    url: String,
    sha256: Option<String>,
}

// ===== Local Version Tracking =====

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalVersionFile {
    version: String,
    updated_at: String,
    files: Vec<String>,
}

const LOCAL_VERSION_FILE: &str = "cartridge_version.json";
const DEFAULT_VERSION: &str = "2.0.0";

// ===== Public API =====

/// Get the current local cartridge version
pub fn get_current_version(app_data_dir: &Path) -> String {
    let version_path = app_data_dir.join(LOCAL_VERSION_FILE);
    if version_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&version_path) {
            if let Ok(local) = serde_json::from_str::<LocalVersionFile>(&content) {
                return local.version;
            }
        }
    }
    // Check resource dir cartridges for embedded version
    DEFAULT_VERSION.to_string()
}

/// Check for cartridge updates from remote server
pub async fn check_for_updates(
    app_data_dir: &Path,
    supabase_url: &str,
    supabase_anon_key: &str,
) -> UpdateCheckResult {
    let current = get_current_version(app_data_dir);

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return UpdateCheckResult {
                update_available: false,
                current_version: current,
                latest_version: String::new(),
                message: format!("Network error: {}", e),
            };
        }
    };

    // Query the cartridge_versions table for the latest version
    let url = format!(
        "{}/rest/v1/cartridge_versions?order=uploaded_at.desc&limit=1&select=version,filename,notes",
        supabase_url
    );

    let response = match client
        .get(&url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return UpdateCheckResult {
                update_available: false,
                current_version: current,
                latest_version: String::new(),
                message: format!("Unable to check for updates: {}", e),
            };
        }
    };

    if !response.status().is_success() {
        return UpdateCheckResult {
            update_available: false,
            current_version: current,
            latest_version: String::new(),
            message: format!("Update server returned error: {}", response.status()),
        };
    }

    #[derive(Deserialize)]
    struct VersionRow {
        version: String,
        #[allow(dead_code)]
        filename: Option<String>,
        #[allow(dead_code)]
        notes: Option<String>,
    }

    let rows: Vec<VersionRow> = match response.json().await {
        Ok(r) => r,
        Err(_) => {
            return UpdateCheckResult {
                update_available: false,
                current_version: current,
                latest_version: String::new(),
                message: "Invalid response from update server".to_string(),
            };
        }
    };

    if rows.is_empty() {
        return UpdateCheckResult {
            update_available: false,
            current_version: current.clone(),
            latest_version: current,
            message: "Your compliance data is up to date.".to_string(),
        };
    }

    let latest = &rows[0].version;

    if is_newer_version(latest, &current) {
        UpdateCheckResult {
            update_available: true,
            current_version: current,
            latest_version: latest.clone(),
            message: format!("Update available: Version {}", latest),
        }
    } else {
        UpdateCheckResult {
            update_available: false,
            current_version: current,
            latest_version: latest.clone(),
            message: "Your compliance data is up to date.".to_string(),
        }
    }
}

/// Download and apply cartridge updates
pub async fn apply_update(
    app_data_dir: &Path,
    cartridge_dir: &Path,
    supabase_url: &str,
    supabase_anon_key: &str,
) -> UpdateApplyResult {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return UpdateApplyResult {
                success: false,
                version: String::new(),
                message: format!("Network error: {}", e),
            };
        }
    };

    // Get the latest version info
    let url = format!(
        "{}/rest/v1/cartridge_versions?order=uploaded_at.desc&limit=1&select=*",
        supabase_url
    );

    let response = match client
        .get(&url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return UpdateApplyResult {
                success: false,
                version: String::new(),
                message: format!("Unable to download update: {}", e),
            };
        }
    };

    #[derive(Deserialize)]
    struct VersionRow {
        version: String,
        filename: Option<String>,
        #[allow(dead_code)]
        notes: Option<String>,
    }

    let rows: Vec<VersionRow> = match response.json().await {
        Ok(r) => r,
        Err(_) => {
            return UpdateApplyResult {
                success: false,
                version: String::new(),
                message: "Invalid response from update server".to_string(),
            };
        }
    };

    if rows.is_empty() {
        return UpdateApplyResult {
            success: false,
            version: String::new(),
            message: "No update available".to_string(),
        };
    }

    let latest = &rows[0];
    let version = &latest.version;

    // Download each cartridge file from Supabase Storage
    let cartridge_files = [
        "red_flags_v2.json",
        "rubric_v2.json",
        "policies.json",
        "system_prompts.json",
    ];

    let mut downloaded = Vec::new();

    for filename in &cartridge_files {
        let file_url = format!(
            "{}/storage/v1/object/public/cartridges/v{}/{}",
            supabase_url, version, filename
        );

        match client
            .get(&file_url)
            .header("apikey", supabase_anon_key)
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                match resp.text().await {
                    Ok(content) => {
                        // Validate it's valid JSON before writing
                        if serde_json::from_str::<serde_json::Value>(&content).is_ok() {
                            let dest = cartridge_dir.join(filename);
                            if let Err(e) = std::fs::write(&dest, &content) {
                                log::error!("Failed to write {}: {}", filename, e);
                            } else {
                                downloaded.push(filename.to_string());
                            }
                        } else {
                            log::warn!("Downloaded {} is not valid JSON, skipping", filename);
                        }
                    }
                    Err(e) => log::warn!("Failed to read response for {}: {}", filename, e),
                }
            }
            Ok(resp) => {
                log::warn!(
                    "Failed to download {} (status: {}), skipping",
                    filename,
                    resp.status()
                );
            }
            Err(e) => {
                log::warn!("Network error downloading {}: {}", filename, e);
            }
        }
    }

    if downloaded.is_empty() {
        return UpdateApplyResult {
            success: false,
            version: version.clone(),
            message: "Failed to download any cartridge files".to_string(),
        };
    }

    // Update local version file
    let local_version = LocalVersionFile {
        version: version.clone(),
        updated_at: chrono::Utc::now().to_rfc3339(),
        files: downloaded.clone(),
    };

    let version_json = serde_json::to_string_pretty(&local_version).unwrap_or_default();
    let _ = std::fs::write(app_data_dir.join(LOCAL_VERSION_FILE), version_json);

    UpdateApplyResult {
        success: true,
        version: version.clone(),
        message: format!(
            "Compliance update installed. Version {}. Updated {} file(s).",
            version,
            downloaded.len()
        ),
    }
}

/// Compare semantic versions (simple: "X.Y.Z")
fn is_newer_version(remote: &str, local: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.split('.')
            .filter_map(|p| p.parse::<u32>().ok())
            .collect()
    };

    let r = parse(remote);
    let l = parse(local);

    for i in 0..3 {
        let rv = r.get(i).copied().unwrap_or(0);
        let lv = l.get(i).copied().unwrap_or(0);
        if rv > lv {
            return true;
        }
        if rv < lv {
            return false;
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_comparison() {
        assert!(is_newer_version("2.1.0", "2.0.0"));
        assert!(is_newer_version("3.0.0", "2.9.9"));
        assert!(is_newer_version("2.0.1", "2.0.0"));
        assert!(!is_newer_version("2.0.0", "2.0.0"));
        assert!(!is_newer_version("1.9.9", "2.0.0"));
    }
}
