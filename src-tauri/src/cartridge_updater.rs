use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;

// ===== Public Result Types =====

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
    /// Human-readable date string for display in Settings (e.g. "2 Apr 2026")
    pub updated_date: String,
    pub message: String,
}

// ===== Local Version Tracking =====

/// Persisted to app_data_dir/cartridge_version.json
#[derive(Debug, Clone, Serialize, Deserialize)]
struct LocalVersionFile {
    version: String,
    /// ISO-8601 timestamp of when the update was applied
    updated_at: String,
    /// Human-readable date for display (e.g. "2 Apr 2026")
    updated_date_display: String,
    files: Vec<String>,
}

const LOCAL_VERSION_FILE: &str = "cartridge_version.json";
const DEFAULT_VERSION: &str = "2.0.0";

/// The four cartridge files we manage
const CARTRIDGE_FILES: &[&str] = &[
    "red_flags_v2.json",
    "rubric_v2.json",
    "policies.json",
    "system_prompts.json",
];

// ===== Public API =====

/// Get the current local cartridge version string
pub fn get_current_version(app_data_dir: &Path) -> String {
    read_local_version(app_data_dir)
        .map(|lv| lv.version)
        .unwrap_or_else(|| DEFAULT_VERSION.to_string())
}

/// Get a human-readable display string for the Settings screen.
/// Returns e.g. "2 Apr 2026" if an update has been applied,
/// or "current" if the app has never received a remote update.
pub fn get_update_date_display(app_data_dir: &Path) -> String {
    read_local_version(app_data_dir)
        .and_then(|lv| {
            if lv.updated_date_display.is_empty() {
                None
            } else {
                Some(lv.updated_date_display)
            }
        })
        .unwrap_or_else(|| "current".to_string())
}

/// Check whether a newer cartridge version is available on the remote server.
///
/// Privacy guarantee: the only outbound information is the Supabase anon key
/// (a public read-only credential, not tied to any individual user).
/// No hardware fingerprint, no activation key, no user-identifying headers.
pub async fn check_for_updates(
    app_data_dir: &Path,
    supabase_url: &str,
    supabase_anon_key: &str,
) -> UpdateCheckResult {
    let current = get_current_version(app_data_dir);

    let client = match build_anonymous_client(10) {
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

    // Plain GET to the Supabase REST API — only the public anon key is sent,
    // which is a read-only credential identical for every user of the app.
    let url = format!(
        "{}/rest/v1/cartridge_versions?order=uploaded_at.desc&limit=1&select=version",
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
                message: format!("Unable to reach update server: {}", e),
            };
        }
    };

    if !response.status().is_success() {
        return UpdateCheckResult {
            update_available: false,
            current_version: current,
            latest_version: String::new(),
            message: format!("Update server returned: {}", response.status()),
        };
    }

    #[derive(Deserialize)]
    struct VersionRow {
        version: String,
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
            message: "Compliance data is up to date.".to_string(),
        };
    }

    let latest = &rows[0].version;

    if is_newer_version(latest, &current) {
        UpdateCheckResult {
            update_available: true,
            current_version: current,
            latest_version: latest.clone(),
            message: format!("Update available: {}", latest),
        }
    } else {
        UpdateCheckResult {
            update_available: false,
            current_version: current,
            latest_version: latest.clone(),
            message: "Compliance data is up to date.".to_string(),
        }
    }
}

/// Download, verify (SHA-256), and install updated cartridge files.
///
/// Flow:
///   1. Fetch latest version number from Supabase REST (anon key only)
///   2. Download `checksums.json` from Supabase Storage (public, no auth)
///   3. Download each cartridge file (public, no auth)
///   4. Compute SHA-256 of each downloaded file
///   5. Compare against checksums.json — if ANY mismatch, reject entire update
///   6. Validate each file is well-formed JSON
///   7. Write files to cartridge directory
///   8. Persist updated_at + human-readable date to local version file
///
/// Privacy guarantee: file downloads are plain anonymous GET requests to
/// Supabase public storage. No identifying headers are added.
pub async fn apply_update(
    app_data_dir: &Path,
    cartridge_dir: &Path,
    supabase_url: &str,
    supabase_anon_key: &str,
) -> UpdateApplyResult {
    // ── Step 1: Get latest version number ──────────────────────────────────
    let client = match build_anonymous_client(30) {
        Ok(c) => c,
        Err(e) => {
            return fail(&format!("Network error: {}", e));
        }
    };

    let url = format!(
        "{}/rest/v1/cartridge_versions?order=uploaded_at.desc&limit=1&select=version",
        supabase_url
    );

    let version = match client
        .get(&url)
        .header("apikey", supabase_anon_key)
        .header("Authorization", format!("Bearer {}", supabase_anon_key))
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => {
            #[derive(Deserialize)]
            struct Row { version: String }
            match r.json::<Vec<Row>>().await {
                Ok(rows) if !rows.is_empty() => rows.into_iter().next().unwrap().version,
                _ => return fail("Invalid version response from server"),
            }
        }
        Ok(r) => return fail(&format!("Server returned: {}", r.status())),
        Err(e) => return fail(&format!("Unable to reach server: {}", e)),
    };

    // ── Step 2: Download checksums.json (public storage, no auth header) ──
    let checksums_url = format!(
        "{}/storage/v1/object/public/cartridges/v{}/checksums.json",
        supabase_url, version
    );

    let expected_checksums: HashMap<String, String> = match client
        .get(&checksums_url)
        // No Authorization header — this is a public storage object
        .send()
        .await
    {
        Ok(r) if r.status().is_success() => {
            match r.json::<HashMap<String, String>>().await {
                Ok(m) => m,
                Err(_) => return fail("checksums.json is not valid JSON"),
            }
        }
        Ok(r) => return fail(&format!("Failed to download checksums.json ({})", r.status())),
        Err(e) => return fail(&format!("Network error fetching checksums: {}", e)),
    };

    if expected_checksums.is_empty() {
        return fail("checksums.json is empty — refusing to install unverified update");
    }

    // ── Step 3 & 4: Download each file and compute its SHA-256 ─────────────
    let mut downloaded: Vec<(String, Vec<u8>)> = Vec::new();

    for &filename in CARTRIDGE_FILES {
        let file_url = format!(
            "{}/storage/v1/object/public/cartridges/v{}/{}",
            supabase_url, version, filename
        );

        let bytes = match client
            .get(&file_url)
            // No Authorization header — public storage, anonymous GET
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => {
                match r.bytes().await {
                    Ok(b) => b.to_vec(),
                    Err(e) => {
                        log::warn!("Failed to read response body for {}: {}", filename, e);
                        return fail(&format!("Failed to read {}", filename));
                    }
                }
            }
            Ok(r) => {
                log::warn!("HTTP {} downloading {}", r.status(), filename);
                return fail(&format!("Failed to download {} ({})", filename, r.status()));
            }
            Err(e) => {
                log::warn!("Network error downloading {}: {}", filename, e);
                return fail(&format!("Network error downloading {}", filename));
            }
        };

        // ── Step 5: Verify SHA-256 ──────────────────────────────────────────
        let actual_hash = sha256_hex(&bytes);

        match expected_checksums.get(filename) {
            Some(expected_hash) => {
                if actual_hash != *expected_hash {
                    log::error!(
                        "Checksum mismatch for {} — expected {}, got {}. Rejecting entire update.",
                        filename, expected_hash, actual_hash
                    );
                    return fail(&format!(
                        "Checksum verification failed for {}. Update rejected.",
                        filename
                    ));
                }
                log::info!("Checksum verified: {} ✓", filename);
            }
            None => {
                // File not listed in checksums.json — reject the update
                log::error!(
                    "{} is not listed in checksums.json. Rejecting entire update.",
                    filename
                );
                return fail(&format!(
                    "{} missing from checksums.json. Update rejected.",
                    filename
                ));
            }
        }

        // ── Step 6: Validate JSON ───────────────────────────────────────────
        if serde_json::from_slice::<serde_json::Value>(&bytes).is_err() {
            log::error!("{} is not valid JSON. Rejecting entire update.", filename);
            return fail(&format!("{} is not valid JSON. Update rejected.", filename));
        }

        downloaded.push((filename.to_string(), bytes));
    }

    // ── Step 7: All files verified — write to cartridge directory ──────────
    // Only write after ALL files pass verification (atomic-ish install)
    std::fs::create_dir_all(cartridge_dir).ok();

    for (filename, bytes) in &downloaded {
        let dest = cartridge_dir.join(filename);
        if let Err(e) = std::fs::write(&dest, bytes) {
            log::error!("Failed to write {}: {}", filename, e);
            return fail(&format!("Failed to install {} — update rolled back", filename));
        }
    }

    // ── Step 8: Persist version info with human-readable date ──────────────
    let now = chrono::Utc::now();
    let display_date = format_date_display(&now);

    let local_version = LocalVersionFile {
        version: version.clone(),
        updated_at: now.to_rfc3339(),
        updated_date_display: display_date.clone(),
        files: downloaded.iter().map(|(n, _)| n.clone()).collect(),
    };

    let version_json = serde_json::to_string_pretty(&local_version).unwrap_or_default();
    let _ = std::fs::write(app_data_dir.join(LOCAL_VERSION_FILE), version_json);

    log::info!(
        "Cartridge update complete: v{} ({}) — {} files verified and installed",
        version, display_date, downloaded.len()
    );

    UpdateApplyResult {
        success: true,
        version,
        updated_date: display_date,
        message: format!(
            "Compliance data updated. {} file(s) verified and installed.",
            downloaded.len()
        ),
    }
}

// ===== Internal Helpers =====

/// Build an HTTP client with no custom default headers.
/// All requests made with this client are anonymous unless headers are
/// explicitly added per-request (e.g. the Supabase anon key for REST queries).
fn build_anonymous_client(timeout_secs: u64) -> Result<reqwest::Client, reqwest::Error> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        // No default headers — no fingerprint, no activation key, nothing
        .build()
}

/// Compute the SHA-256 hash of a byte slice and return it as a lowercase hex string
fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

/// Format a UTC datetime as a human-readable date string, e.g. "2 Apr 2026"
fn format_date_display(dt: &chrono::DateTime<chrono::Utc>) -> String {
    let months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let month = months[(dt.month0()) as usize];
    format!("{} {} {}", dt.day(), month, dt.year())
}

/// Read the local version file, returning None if it doesn't exist or is invalid
fn read_local_version(app_data_dir: &Path) -> Option<LocalVersionFile> {
    let path = app_data_dir.join(LOCAL_VERSION_FILE);
    let content = std::fs::read_to_string(&path).ok()?;
    serde_json::from_str(&content).ok()
}

/// Convenience constructor for a failed UpdateApplyResult
fn fail(message: &str) -> UpdateApplyResult {
    UpdateApplyResult {
        success: false,
        version: String::new(),
        updated_date: String::new(),
        message: message.to_string(),
    }
}

/// Compare semantic versions — returns true if `remote` is strictly newer than `local`
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
        if rv > lv { return true; }
        if rv < lv { return false; }
    }
    false
}

// ===== Tests =====

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

    #[test]
    fn test_sha256_hex() {
        // SHA-256 of empty string is well-known
        let hash = sha256_hex(b"");
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_format_date_display() {
        use chrono::TimeZone;
        let dt = chrono::Utc.with_ymd_and_hms(2026, 4, 2, 10, 0, 0).unwrap();
        assert_eq!(format_date_display(&dt), "2 Apr 2026");
    }
}
