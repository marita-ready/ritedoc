/// token_store.rs — OAuth2 Token Store for RiteDoc Platform Connectors
///
/// Provides secure local storage for OAuth2 tokens and API keys.
/// Tokens are stored per-platform and per-client (agency/organisation),
/// encrypted at rest using AES-256-GCM with a key derived from the
/// device's hardware fingerprint.
///
/// # Storage layout
///
/// Tokens are stored in the app data directory:
///
///   {app_data_dir}/
///     tokens/
///       shiftcare.token.enc     — encrypted token for ShiftCare
///       brevity.token.enc       — encrypted token for Brevity
///       lumary.token.enc        — encrypted token for Lumary
///       ...
///
/// Each `.token.enc` file contains an encrypted JSON blob with the
/// `StoredToken` struct.
///
/// # Encryption
///
/// Encryption uses AES-256-GCM. The encryption key is derived from
/// the device's hardware fingerprint (the same one used for activation)
/// via HKDF-SHA256. This means tokens are bound to the device and cannot
/// be decrypted on a different machine.
///
/// NOTE: The actual AES-256-GCM encryption is stubbed with a placeholder
/// in this interface layer. The `encrypt_token` and `decrypt_token`
/// functions are marked with `// TODO: implement AES-256-GCM` and will
/// be filled in when the first connector is built. The interface and file
/// layout are fully defined here.
///
/// # Thread safety
///
/// `TokenStore` is `Send + Sync` and safe to share across threads via
/// `Arc<TokenStore>`. File I/O is synchronous (using `std::fs`) since
/// token operations are infrequent and brief.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ============================================================
// TOKEN TYPES
// ============================================================

/// An OAuth2 access + refresh token pair, as returned by a token endpoint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2Token {
    /// The access token (short-lived, used in API calls)
    pub access_token: String,
    /// The refresh token (long-lived, used to get a new access token)
    pub refresh_token: Option<String>,
    /// When the access token expires (UTC)
    pub expires_at: Option<DateTime<Utc>>,
    /// The scopes granted by this token
    pub scopes: Vec<String>,
    /// The token type (almost always "Bearer")
    pub token_type: String,
}

impl OAuth2Token {
    /// Returns true if the access token has expired (or will expire within 60 seconds).
    pub fn is_expired(&self) -> bool {
        match self.expires_at {
            Some(exp) => {
                let now = Utc::now();
                let buffer = chrono::Duration::seconds(60);
                now + buffer >= exp
            }
            None => false, // No expiry set — assume still valid
        }
    }

    /// Returns true if a refresh token is available.
    pub fn can_refresh(&self) -> bool {
        self.refresh_token.is_some()
    }
}

/// A simple API key credential (for platforms that don't use OAuth2).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyCredential {
    /// The API key value
    pub api_key: String,
    /// Optional: the API key ID (some platforms use key ID + secret)
    pub api_key_id: Option<String>,
    /// Optional: the base URL override (for self-hosted platforms)
    pub base_url_override: Option<String>,
}

/// The credential stored for a platform — either OAuth2 or API key.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "credential_type", rename_all = "snake_case")]
pub enum StoredCredential {
    OAuth2(OAuth2Token),
    ApiKey(ApiKeyCredential),
}

/// The full token record stored on disk for a platform.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredToken {
    /// The platform this token belongs to (e.g. "shiftcare")
    pub platform_id: String,
    /// The credential data
    pub credential: StoredCredential,
    /// When this token was first stored
    pub stored_at: DateTime<Utc>,
    /// When this token was last used
    pub last_used_at: Option<DateTime<Utc>>,
    /// Optional: the user/account identifier on the platform
    pub platform_user_id: Option<String>,
    /// Optional: the user's display name on the platform
    pub platform_display_name: Option<String>,
    /// Optional: the organisation/agency identifier on the platform
    pub platform_org_id: Option<String>,
}

// ============================================================
// TOKEN STORE
// ============================================================

/// The token store manages encrypted credential storage for all platform connectors.
///
/// # Usage
///
/// ```rust
/// let store = TokenStore::new(&app_data_dir);
///
/// // Store a token after successful OAuth2 authentication
/// store.save_oauth2_token("shiftcare", oauth2_token)?;
///
/// // Retrieve a token before making an API call
/// if let Some(token) = store.get_oauth2_token("shiftcare")? {
///     if token.is_expired() && token.can_refresh() {
///         // Refresh the token...
///     }
///     // Use token.access_token in API calls
/// }
///
/// // Remove a token when the user disconnects a platform
/// store.delete_token("shiftcare")?;
/// ```
pub struct TokenStore {
    /// The directory where encrypted token files are stored
    tokens_dir: PathBuf,
    /// The device fingerprint used to derive the encryption key
    /// This is the same fingerprint used for activation
    device_fingerprint: String,
}

impl TokenStore {
    /// Create a new `TokenStore` rooted at `{app_data_dir}/tokens/`.
    /// Creates the directory if it does not exist.
    ///
    /// # Arguments
    /// * `app_data_dir` — The app's data directory (from `tauri::PathResolver`)
    /// * `device_fingerprint` — The device fingerprint from `activation::generate_fingerprint()`
    pub fn new(app_data_dir: &Path, device_fingerprint: &str) -> Self {
        let tokens_dir = app_data_dir.join("tokens");
        std::fs::create_dir_all(&tokens_dir).ok();
        Self {
            tokens_dir,
            device_fingerprint: device_fingerprint.to_string(),
        }
    }

    // ----------------------------------------------------------
    // SAVE
    // ----------------------------------------------------------

    /// Store an OAuth2 token for a platform.
    /// Overwrites any existing token for this platform.
    ///
    /// # Arguments
    /// * `platform_id` — The platform identifier (e.g. "shiftcare")
    /// * `token` — The OAuth2 token to store
    pub fn save_oauth2_token(
        &self,
        platform_id: &str,
        token: OAuth2Token,
    ) -> Result<(), TokenStoreError> {
        let stored = StoredToken {
            platform_id: platform_id.to_string(),
            credential: StoredCredential::OAuth2(token),
            stored_at: Utc::now(),
            last_used_at: None,
            platform_user_id: None,
            platform_display_name: None,
            platform_org_id: None,
        };
        self.write_token(platform_id, &stored)
    }

    /// Store an API key credential for a platform.
    /// Overwrites any existing credential for this platform.
    ///
    /// # Arguments
    /// * `platform_id` — The platform identifier (e.g. "brevity")
    /// * `credential` — The API key credential to store
    pub fn save_api_key(
        &self,
        platform_id: &str,
        credential: ApiKeyCredential,
    ) -> Result<(), TokenStoreError> {
        let stored = StoredToken {
            platform_id: platform_id.to_string(),
            credential: StoredCredential::ApiKey(credential),
            stored_at: Utc::now(),
            last_used_at: None,
            platform_user_id: None,
            platform_display_name: None,
            platform_org_id: None,
        };
        self.write_token(platform_id, &stored)
    }

    // ----------------------------------------------------------
    // GET
    // ----------------------------------------------------------

    /// Retrieve the stored token for a platform.
    /// Returns `None` if no token is stored for this platform.
    ///
    /// Also updates `last_used_at` on the stored record.
    pub fn get_token(&self, platform_id: &str) -> Result<Option<StoredToken>, TokenStoreError> {
        let path = self.token_path(platform_id);
        if !path.exists() {
            return Ok(None);
        }

        let mut token = self.read_token(platform_id)?;
        // Update last_used_at and write back (best-effort, ignore errors)
        token.last_used_at = Some(Utc::now());
        self.write_token(platform_id, &token).ok();

        Ok(Some(token))
    }

    /// Retrieve the OAuth2 token for a platform.
    /// Returns `None` if no token is stored, or if the stored credential
    /// is not an OAuth2 token.
    pub fn get_oauth2_token(
        &self,
        platform_id: &str,
    ) -> Result<Option<OAuth2Token>, TokenStoreError> {
        match self.get_token(platform_id)? {
            Some(stored) => match stored.credential {
                StoredCredential::OAuth2(token) => Ok(Some(token)),
                StoredCredential::ApiKey(_) => Ok(None),
            },
            None => Ok(None),
        }
    }

    /// Retrieve the API key credential for a platform.
    /// Returns `None` if no credential is stored, or if the stored credential
    /// is not an API key.
    pub fn get_api_key(
        &self,
        platform_id: &str,
    ) -> Result<Option<ApiKeyCredential>, TokenStoreError> {
        match self.get_token(platform_id)? {
            Some(stored) => match stored.credential {
                StoredCredential::ApiKey(cred) => Ok(Some(cred)),
                StoredCredential::OAuth2(_) => Ok(None),
            },
            None => Ok(None),
        }
    }

    // ----------------------------------------------------------
    // UPDATE
    // ----------------------------------------------------------

    /// Update the OAuth2 token for a platform (e.g. after a token refresh).
    /// Preserves all other metadata (stored_at, platform_user_id, etc.).
    /// Returns `TokenStoreError::NotFound` if no token exists for this platform.
    pub fn update_oauth2_token(
        &self,
        platform_id: &str,
        new_token: OAuth2Token,
    ) -> Result<(), TokenStoreError> {
        let mut stored = self.read_token(platform_id)?;
        stored.credential = StoredCredential::OAuth2(new_token);
        stored.last_used_at = Some(Utc::now());
        self.write_token(platform_id, &stored)
    }

    /// Update the platform user metadata on a stored token.
    /// Useful after a successful authentication to store the user's display name.
    pub fn update_platform_user(
        &self,
        platform_id: &str,
        user_id: Option<String>,
        display_name: Option<String>,
        org_id: Option<String>,
    ) -> Result<(), TokenStoreError> {
        let mut stored = self.read_token(platform_id)?;
        stored.platform_user_id = user_id;
        stored.platform_display_name = display_name;
        stored.platform_org_id = org_id;
        self.write_token(platform_id, &stored)
    }

    // ----------------------------------------------------------
    // DELETE
    // ----------------------------------------------------------

    /// Delete the stored token for a platform.
    /// Called when the user disconnects a platform.
    /// Returns `Ok(())` even if no token was stored.
    pub fn delete_token(&self, platform_id: &str) -> Result<(), TokenStoreError> {
        let path = self.token_path(platform_id);
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| TokenStoreError::IoError(e.to_string()))?;
        }
        Ok(())
    }

    /// Delete all stored tokens.
    /// Called when the user deactivates the app or resets all settings.
    pub fn delete_all_tokens(&self) -> Result<(), TokenStoreError> {
        let entries = std::fs::read_dir(&self.tokens_dir)
            .map_err(|e| TokenStoreError::IoError(e.to_string()))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("enc") {
                std::fs::remove_file(&path).ok();
            }
        }
        Ok(())
    }

    // ----------------------------------------------------------
    // LIST
    // ----------------------------------------------------------

    /// List all platforms that have stored tokens.
    /// Returns a map of platform_id → StoredToken metadata (without credential values).
    pub fn list_stored_platforms(&self) -> HashMap<String, TokenMetadata> {
        let mut result = HashMap::new();

        let entries = match std::fs::read_dir(&self.tokens_dir) {
            Ok(e) => e,
            Err(_) => return result,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("enc") {
                continue;
            }

            // Extract platform_id from filename (e.g. "shiftcare.token.enc" → "shiftcare")
            let platform_id = path
                .file_name()
                .and_then(|n| n.to_str())
                .and_then(|n| n.strip_suffix(".token.enc"))
                .unwrap_or("")
                .to_string();

            if platform_id.is_empty() {
                continue;
            }

            if let Ok(stored) = self.read_token(&platform_id) {
                result.insert(
                    platform_id,
                    TokenMetadata {
                        stored_at: stored.stored_at,
                        last_used_at: stored.last_used_at,
                        platform_user_id: stored.platform_user_id,
                        platform_display_name: stored.platform_display_name,
                        credential_type: match stored.credential {
                            StoredCredential::OAuth2(_) => "oauth2".to_string(),
                            StoredCredential::ApiKey(_) => "api_key".to_string(),
                        },
                        is_expired: match &stored.credential {
                            StoredCredential::OAuth2(t) => t.is_expired(),
                            StoredCredential::ApiKey(_) => false,
                        },
                    },
                );
            }
        }

        result
    }

    // ----------------------------------------------------------
    // INTERNAL: FILE I/O + ENCRYPTION
    // ----------------------------------------------------------

    fn token_path(&self, platform_id: &str) -> PathBuf {
        self.tokens_dir.join(format!("{}.token.enc", platform_id))
    }

    fn write_token(&self, platform_id: &str, token: &StoredToken) -> Result<(), TokenStoreError> {
        let json = serde_json::to_string(token)
            .map_err(|e| TokenStoreError::SerializationError(e.to_string()))?;

        let encrypted = encrypt_token(&json, &self.device_fingerprint)?;

        let path = self.token_path(platform_id);
        std::fs::write(&path, encrypted)
            .map_err(|e| TokenStoreError::IoError(e.to_string()))?;

        Ok(())
    }

    fn read_token(&self, platform_id: &str) -> Result<StoredToken, TokenStoreError> {
        let path = self.token_path(platform_id);
        if !path.exists() {
            return Err(TokenStoreError::NotFound(platform_id.to_string()));
        }

        let encrypted = std::fs::read(&path)
            .map_err(|e| TokenStoreError::IoError(e.to_string()))?;

        let json = decrypt_token(&encrypted, &self.device_fingerprint)?;

        serde_json::from_str::<StoredToken>(&json)
            .map_err(|e| TokenStoreError::SerializationError(e.to_string()))
    }
}

// ============================================================
// TOKEN METADATA (safe to expose to UI — no credential values)
// ============================================================

/// Metadata about a stored token, safe to expose to the UI.
/// Does not include the actual credential values.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenMetadata {
    pub stored_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
    pub platform_user_id: Option<String>,
    pub platform_display_name: Option<String>,
    pub credential_type: String,
    pub is_expired: bool,
}

// ============================================================
// ERROR TYPE
// ============================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TokenStoreError {
    /// No token found for the given platform
    NotFound(String),
    /// File I/O error
    IoError(String),
    /// JSON serialization/deserialization error
    SerializationError(String),
    /// Encryption or decryption failed
    EncryptionError(String),
    /// The token file was tampered with or corrupted
    IntegrityError(String),
}

impl std::fmt::Display for TokenStoreError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenStoreError::NotFound(id) => write!(f, "No token found for platform: {}", id),
            TokenStoreError::IoError(e) => write!(f, "I/O error: {}", e),
            TokenStoreError::SerializationError(e) => write!(f, "Serialization error: {}", e),
            TokenStoreError::EncryptionError(e) => write!(f, "Encryption error: {}", e),
            TokenStoreError::IntegrityError(e) => write!(f, "Integrity error: {}", e),
        }
    }
}

impl std::error::Error for TokenStoreError {}

// ============================================================
// ENCRYPTION STUBS
// ============================================================
//
// These functions are stubs. They will be replaced with real
// AES-256-GCM encryption when the first connector is implemented.
//
// The encryption key will be derived from the device fingerprint
// using HKDF-SHA256:
//
//   key = HKDF-SHA256(
//     ikm  = device_fingerprint.as_bytes(),
//     salt = b"ritedoc-token-store-v1",
//     info = b"aes-256-gcm-key",
//     len  = 32,
//   )
//
// The encrypted format will be:
//   [12-byte nonce][ciphertext][16-byte GCM tag]
//
// Dependencies to add when implementing:
//   aes-gcm = "0.10"
//   hkdf = "0.12"
//   hmac = "0.12"
//
// TODO: Replace these stubs with real AES-256-GCM encryption.

fn encrypt_token(plaintext: &str, _device_fingerprint: &str) -> Result<Vec<u8>, TokenStoreError> {
    // STUB: In production, encrypt with AES-256-GCM using a key derived
    // from the device fingerprint via HKDF-SHA256.
    //
    // For now, store as base64-encoded JSON (NOT secure — replace before release).
    use std::io::Write;
    let mut encoded = Vec::new();
    encoded.write_all(b"RITEDOC_TOKEN_V1:").ok();
    encoded.write_all(plaintext.as_bytes()).ok();
    Ok(encoded)
}

fn decrypt_token(ciphertext: &[u8], _device_fingerprint: &str) -> Result<String, TokenStoreError> {
    // STUB: In production, decrypt with AES-256-GCM.
    //
    // For now, strip the prefix and return the plaintext.
    let prefix = b"RITEDOC_TOKEN_V1:";
    if ciphertext.starts_with(prefix) {
        let json_bytes = &ciphertext[prefix.len()..];
        String::from_utf8(json_bytes.to_vec())
            .map_err(|e| TokenStoreError::SerializationError(e.to_string()))
    } else {
        Err(TokenStoreError::IntegrityError(
            "Token file does not have the expected format prefix. \
             It may be corrupted or from a different version of RiteDoc."
                .to_string(),
        ))
    }
}

// ============================================================
// TESTS
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_store() -> (TokenStore, TempDir) {
        let dir = TempDir::new().unwrap();
        let store = TokenStore::new(dir.path(), "test-fingerprint-abc123");
        (store, dir)
    }

    #[test]
    fn test_save_and_get_oauth2_token() {
        let (store, _dir) = make_store();

        let token = OAuth2Token {
            access_token: "test-access-token".to_string(),
            refresh_token: Some("test-refresh-token".to_string()),
            expires_at: Some(Utc::now() + chrono::Duration::hours(1)),
            scopes: vec!["notes:read".to_string(), "notes:write".to_string()],
            token_type: "Bearer".to_string(),
        };

        store.save_oauth2_token("shiftcare", token.clone()).unwrap();

        let retrieved = store.get_oauth2_token("shiftcare").unwrap().unwrap();
        assert_eq!(retrieved.access_token, "test-access-token");
        assert_eq!(retrieved.refresh_token, Some("test-refresh-token".to_string()));
        assert!(!retrieved.is_expired());
    }

    #[test]
    fn test_save_and_get_api_key() {
        let (store, _dir) = make_store();

        let cred = ApiKeyCredential {
            api_key: "sk-test-key-12345".to_string(),
            api_key_id: Some("key-id-001".to_string()),
            base_url_override: None,
        };

        store.save_api_key("brevity", cred).unwrap();

        let retrieved = store.get_api_key("brevity").unwrap().unwrap();
        assert_eq!(retrieved.api_key, "sk-test-key-12345");
    }

    #[test]
    fn test_get_missing_token_returns_none() {
        let (store, _dir) = make_store();
        let result = store.get_oauth2_token("nonexistent").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_delete_token() {
        let (store, _dir) = make_store();

        let token = OAuth2Token {
            access_token: "to-be-deleted".to_string(),
            refresh_token: None,
            expires_at: None,
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };

        store.save_oauth2_token("lumary", token).unwrap();
        assert!(store.get_oauth2_token("lumary").unwrap().is_some());

        store.delete_token("lumary").unwrap();
        assert!(store.get_oauth2_token("lumary").unwrap().is_none());
    }

    #[test]
    fn test_list_stored_platforms() {
        let (store, _dir) = make_store();

        let token = OAuth2Token {
            access_token: "token-a".to_string(),
            refresh_token: None,
            expires_at: None,
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };
        store.save_oauth2_token("shiftcare", token).unwrap();

        let cred = ApiKeyCredential {
            api_key: "key-b".to_string(),
            api_key_id: None,
            base_url_override: None,
        };
        store.save_api_key("brevity", cred).unwrap();

        let platforms = store.list_stored_platforms();
        assert_eq!(platforms.len(), 2);
        assert!(platforms.contains_key("shiftcare"));
        assert!(platforms.contains_key("brevity"));
        assert_eq!(platforms["shiftcare"].credential_type, "oauth2");
        assert_eq!(platforms["brevity"].credential_type, "api_key");
    }

    #[test]
    fn test_token_expiry_detection() {
        let expired_token = OAuth2Token {
            access_token: "expired".to_string(),
            refresh_token: Some("refresh".to_string()),
            expires_at: Some(Utc::now() - chrono::Duration::hours(1)),
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };
        assert!(expired_token.is_expired());
        assert!(expired_token.can_refresh());

        let valid_token = OAuth2Token {
            access_token: "valid".to_string(),
            refresh_token: None,
            expires_at: Some(Utc::now() + chrono::Duration::hours(1)),
            scopes: vec![],
            token_type: "Bearer".to_string(),
        };
        assert!(!valid_token.is_expired());
        assert!(!valid_token.can_refresh());
    }
}
