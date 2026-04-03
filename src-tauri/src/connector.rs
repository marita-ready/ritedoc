/// connector.rs — Platform Connector Interface for RiteDoc
///
/// This module defines the `PlatformConnector` trait and all associated types
/// needed to integrate with external NDIS platform APIs (ShiftCare, Brevity,
/// Lumary, Astalty, SupportAbility, CareMaster, etc.).
///
/// IMPORTANT: This is an interface definition only. No actual connectors are
/// implemented here. Each connector will live in its own module (e.g.
/// `connectors/shiftcare.rs`) and implement this trait.
///
/// Architecture overview:
///
///   PlatformConnector (trait)
///     ├── authenticate()       — OAuth2 / API key auth
///     ├── fetch_notes()        — Pull raw notes from the platform
///     ├── push_note()          — Send a rewritten note back
///     ├── get_platform_info()  — Metadata + field mappings
///     └── test_connection()    — Health check / ping
///
///   ConnectorRegistry          — Runtime registry of available connectors
///   ConnectorError             — Unified error type for all connectors
///   PlatformInfo               — Metadata returned by get_platform_info()
///   FieldMapping               — Maps platform field names to RiteDoc fields
///   AuthConfig                 — Authentication configuration (OAuth2 or API key)
///   FetchOptions               — Options for fetch_notes() (date range, participant, etc.)
///   PushResult                 — Result of push_note()
///   ConnectorStatus            — Current connection status for a platform

use std::collections::HashMap;
use std::fmt;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::models::RawNote;

// ============================================================
// ERROR TYPE
// ============================================================

/// Unified error type for all platform connector operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorError {
    /// Machine-readable error code (e.g. "AUTH_FAILED", "RATE_LIMITED")
    pub code: ConnectorErrorCode,
    /// Human-readable description
    pub message: String,
    /// Optional HTTP status code if the error came from an API call
    pub http_status: Option<u16>,
    /// Whether the error is transient and the operation should be retried
    pub retryable: bool,
}

impl fmt::Display for ConnectorError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for ConnectorError {}

/// Machine-readable error codes for connector operations.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ConnectorErrorCode {
    /// Authentication failed (bad credentials, expired token, etc.)
    AuthFailed,
    /// The OAuth2 token has expired and could not be refreshed
    TokenExpired,
    /// The platform API rate limit was exceeded
    RateLimited,
    /// The platform API returned an unexpected response
    InvalidResponse,
    /// The requested resource was not found on the platform
    NotFound,
    /// The app is in offline mode — network access is not permitted
    OfflineModeActive,
    /// The user has not granted permission for this platform connection
    PermissionDenied,
    /// A network error occurred (timeout, DNS failure, etc.)
    NetworkError,
    /// The connector is not yet implemented
    NotImplemented,
    /// An unexpected internal error occurred
    InternalError,
}

impl fmt::Display for ConnectorErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = serde_json::to_string(self).unwrap_or_else(|_| "UNKNOWN".to_string());
        write!(f, "{}", s.trim_matches('"'))
    }
}

pub type ConnectorResult<T> = Result<T, ConnectorError>;

// ============================================================
// AUTHENTICATION CONFIG
// ============================================================

/// Authentication configuration for a platform connector.
/// Each connector declares which auth method it uses.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "auth_type", rename_all = "snake_case")]
pub enum AuthConfig {
    /// OAuth2 Authorization Code flow (most modern platforms)
    OAuth2 {
        /// The OAuth2 authorization endpoint URL
        auth_url: String,
        /// The OAuth2 token endpoint URL
        token_url: String,
        /// The OAuth2 client ID (public, safe to store in code)
        client_id: String,
        /// Scopes required for this connector
        scopes: Vec<String>,
        /// Whether PKCE is required (recommended for desktop apps)
        use_pkce: bool,
    },
    /// Simple API key authentication
    ApiKey {
        /// How the API key is sent (header name or query param name)
        header_name: String,
        /// Whether the key is sent as "Bearer <key>" or raw
        bearer_prefix: bool,
    },
    /// HTTP Basic authentication
    BasicAuth,
    /// No authentication required (unlikely for production platforms)
    None,
}

// ============================================================
// FIELD MAPPING
// ============================================================

/// Maps a platform's native field names to RiteDoc's internal field names.
///
/// Example for ShiftCare:
///   "client_name"     → "participant_name"
///   "shift_start"     → "time"
///   "shift_notes"     → "raw_text"
///   "worker_name"     → "support_worker"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldMapping {
    /// The field name as it appears in the platform's API response
    pub platform_field: String,
    /// The corresponding RiteDoc internal field name
    pub ritedoc_field: String,
    /// Whether this field is required for processing
    pub required: bool,
    /// Optional transformation hint (e.g. "ISO8601_to_date", "strip_html")
    pub transform: Option<String>,
}

// ============================================================
// PLATFORM INFO
// ============================================================

/// Metadata returned by `get_platform_info()`.
/// Describes the platform's capabilities and field structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformInfo {
    /// Unique identifier for this platform (e.g. "shiftcare", "brevity")
    pub platform_id: String,
    /// Human-readable display name (e.g. "ShiftCare")
    pub display_name: String,
    /// Platform API version this connector targets
    pub api_version: String,
    /// RiteDoc connector version
    pub connector_version: String,
    /// Authentication method used by this connector
    pub auth_config: AuthConfig,
    /// Field mappings from platform fields to RiteDoc fields
    pub field_mappings: Vec<FieldMapping>,
    /// Platform-specific section names for the results screen
    /// Keys are RiteDoc section IDs ("section_1" through "section_4")
    pub section_labels: HashMap<String, String>,
    /// Whether this platform supports pushing rewritten notes back
    pub supports_push: bool,
    /// Whether this platform supports fetching notes by date range
    pub supports_date_filter: bool,
    /// Whether this platform supports fetching notes by participant
    pub supports_participant_filter: bool,
    /// Base URL for the platform API (may be overridden per-client)
    pub base_api_url: String,
    /// Link to the platform's API documentation
    pub docs_url: Option<String>,
}

// ============================================================
// FETCH OPTIONS
// ============================================================

/// Options for `fetch_notes()`.
/// All fields are optional — connectors should apply sensible defaults.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FetchOptions {
    /// Only fetch notes from this date onwards (inclusive)
    pub date_from: Option<DateTime<Utc>>,
    /// Only fetch notes up to this date (inclusive)
    pub date_to: Option<DateTime<Utc>>,
    /// Only fetch notes for this participant (platform-specific ID)
    pub participant_id: Option<String>,
    /// Only fetch notes by this support worker (platform-specific ID)
    pub worker_id: Option<String>,
    /// Maximum number of notes to return (0 = no limit)
    pub limit: usize,
    /// Pagination offset
    pub offset: usize,
}

// ============================================================
// PUSH RESULT
// ============================================================

/// Result of a `push_note()` operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResult {
    /// Whether the push was successful
    pub success: bool,
    /// The platform-assigned ID of the updated note (if available)
    pub platform_note_id: Option<String>,
    /// Human-readable message from the platform (if any)
    pub message: Option<String>,
    /// Any warnings (e.g. "Note was truncated to 2000 characters")
    pub warnings: Vec<String>,
}

// ============================================================
// CONNECTOR STATUS
// ============================================================

/// Current connection status for a platform connector.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ConnectorStatus {
    /// Not configured — no credentials have been provided
    NotConfigured,
    /// Configured but not yet tested
    Untested,
    /// Connection is healthy and authenticated
    Connected,
    /// Authentication has expired — re-auth required
    AuthExpired,
    /// Connection test failed
    Error,
    /// Disabled by the user
    Disabled,
}

impl fmt::Display for ConnectorStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let label = match self {
            ConnectorStatus::NotConfigured => "Not configured",
            ConnectorStatus::Untested => "Untested",
            ConnectorStatus::Connected => "Connected",
            ConnectorStatus::AuthExpired => "Authentication expired",
            ConnectorStatus::Error => "Connection error",
            ConnectorStatus::Disabled => "Disabled",
        };
        write!(f, "{}", label)
    }
}

/// Snapshot of a connector's current state, used for the UI.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectorStatusSnapshot {
    pub platform_id: String,
    pub display_name: String,
    pub status: ConnectorStatus,
    pub last_connected: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub notes_fetched_total: u64,
    pub notes_pushed_total: u64,
}

// ============================================================
// THE TRAIT
// ============================================================

/// The core interface that every platform connector must implement.
///
/// # Design principles
///
/// 1. **Async-first**: All methods are async to support non-blocking I/O.
/// 2. **Offline-aware**: Connectors must check `OnlineMode` before making
///    any network calls and return `ConnectorErrorCode::OfflineModeActive`
///    if network access is not permitted.
/// 3. **Stateless methods**: The trait methods do not hold state. State
///    (tokens, config) is managed by `TokenStore` and passed in via the
///    `app_data_dir` path.
/// 4. **No panics**: All errors are returned as `ConnectorError`, never
///    unwrapped or panicked.
/// 5. **Idempotent push**: `push_note()` should be safe to call multiple
///    times for the same note (e.g. if the first call timed out).
///
/// # Implementing a new connector
///
/// 1. Create `src-tauri/src/connectors/your_platform.rs`
/// 2. Define a zero-sized struct: `pub struct YourPlatformConnector;`
/// 3. Implement `PlatformConnector` for it
/// 4. Register it in `ConnectorRegistry::all_connectors()`
/// 5. Add field mappings to `get_platform_info()`
///
/// # Example skeleton
///
/// ```rust
/// use crate::connector::*;
/// use crate::online_mode::OnlineMode;
/// use std::path::Path;
///
/// pub struct ShiftCareConnector;
///
/// #[async_trait::async_trait]
/// impl PlatformConnector for ShiftCareConnector {
///     async fn authenticate(&self, app_data_dir: &Path, online_mode: &OnlineMode)
///         -> ConnectorResult<()> { todo!() }
///
///     async fn fetch_notes(&self, app_data_dir: &Path, online_mode: &OnlineMode,
///         options: FetchOptions) -> ConnectorResult<Vec<RawNote>> { todo!() }
///
///     async fn push_note(&self, app_data_dir: &Path, online_mode: &OnlineMode,
///         note_id: &str, rewritten_text: &str) -> ConnectorResult<PushResult> { todo!() }
///
///     fn get_platform_info(&self) -> PlatformInfo { todo!() }
///
///     async fn test_connection(&self, app_data_dir: &Path, online_mode: &OnlineMode)
///         -> ConnectorResult<ConnectorStatusSnapshot> { todo!() }
/// }
/// ```
#[async_trait::async_trait]
pub trait PlatformConnector: Send + Sync {
    /// Authenticate with the platform and store the resulting token.
    ///
    /// For OAuth2 connectors, this initiates the authorization code flow
    /// (opening a browser window for the user to log in) and exchanges
    /// the code for tokens, which are stored via `TokenStore`.
    ///
    /// For API key connectors, this validates the key against the platform
    /// and stores it.
    ///
    /// This method MUST check `online_mode.is_online()` before making any
    /// network calls and return `ConnectorErrorCode::OfflineModeActive` if
    /// the app is in offline mode.
    ///
    /// # Arguments
    /// * `app_data_dir` — Path to the app's data directory (for token storage)
    /// * `online_mode` — Current online/offline mode state
    async fn authenticate(
        &self,
        app_data_dir: &std::path::Path,
        online_mode: &crate::online_mode::OnlineMode,
    ) -> ConnectorResult<()>;

    /// Fetch raw notes from the platform.
    ///
    /// Returns a list of `RawNote` objects that can be fed directly into
    /// RiteDoc's processing pipeline. The connector is responsible for
    /// mapping platform-specific fields to `RawNote` fields using the
    /// field mappings defined in `get_platform_info()`.
    ///
    /// This method MUST check `online_mode.is_online()` before making any
    /// network calls.
    ///
    /// # Arguments
    /// * `app_data_dir` — Path to the app's data directory (for token retrieval)
    /// * `online_mode` — Current online/offline mode state
    /// * `options` — Filtering and pagination options
    async fn fetch_notes(
        &self,
        app_data_dir: &std::path::Path,
        online_mode: &crate::online_mode::OnlineMode,
        options: FetchOptions,
    ) -> ConnectorResult<Vec<RawNote>>;

    /// Push a rewritten note back to the platform.
    ///
    /// The `note_id` is the platform's native note identifier (stored in
    /// `RawNote` when fetched). The `rewritten_text` is the final output
    /// from RiteDoc's pipeline.
    ///
    /// Connectors that do not support push should return
    /// `ConnectorErrorCode::NotImplemented`.
    ///
    /// This method MUST check `online_mode.is_online()` before making any
    /// network calls.
    ///
    /// # Arguments
    /// * `app_data_dir` — Path to the app's data directory (for token retrieval)
    /// * `online_mode` — Current online/offline mode state
    /// * `note_id` — The platform's native note identifier
    /// * `rewritten_text` — The rewritten note text to push
    async fn push_note(
        &self,
        app_data_dir: &std::path::Path,
        online_mode: &crate::online_mode::OnlineMode,
        note_id: &str,
        rewritten_text: &str,
    ) -> ConnectorResult<PushResult>;

    /// Return static metadata about this platform connector.
    ///
    /// This is a synchronous method — it returns compile-time information
    /// about the platform (field mappings, auth config, section labels, etc.)
    /// and does not make any network calls.
    fn get_platform_info(&self) -> PlatformInfo;

    /// Test the connection to the platform and return a status snapshot.
    ///
    /// This should make a lightweight API call (e.g. GET /me or GET /ping)
    /// to verify that stored credentials are still valid.
    ///
    /// This method MUST check `online_mode.is_online()` before making any
    /// network calls.
    ///
    /// # Arguments
    /// * `app_data_dir` — Path to the app's data directory (for token retrieval)
    /// * `online_mode` — Current online/offline mode state
    async fn test_connection(
        &self,
        app_data_dir: &std::path::Path,
        online_mode: &crate::online_mode::OnlineMode,
    ) -> ConnectorResult<ConnectorStatusSnapshot>;
}

// ============================================================
// CONNECTOR REGISTRY
// ============================================================

/// The set of platforms supported (or planned) by RiteDoc.
/// Used for the "Connected Platforms" UI and for routing fetch/push
/// operations to the correct connector.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum SupportedPlatform {
    ShiftCare,
    Brevity,
    Lumary,
    Astalty,
    SupportAbility,
    CareMaster,
    /// A generic REST API connector for custom platforms
    Generic,
}

impl SupportedPlatform {
    /// Returns the platform's display name.
    pub fn display_name(&self) -> &str {
        match self {
            SupportedPlatform::ShiftCare => "ShiftCare",
            SupportedPlatform::Brevity => "Brevity",
            SupportedPlatform::Lumary => "Lumary",
            SupportedPlatform::Astalty => "Astalty",
            SupportedPlatform::SupportAbility => "SupportAbility",
            SupportedPlatform::CareMaster => "CareMaster",
            SupportedPlatform::Generic => "Custom Platform",
        }
    }

    /// Returns the platform's internal ID string (matches CSV parser detection).
    pub fn platform_id(&self) -> &str {
        match self {
            SupportedPlatform::ShiftCare => "shiftcare",
            SupportedPlatform::Brevity => "brevity",
            SupportedPlatform::Lumary => "lumary",
            SupportedPlatform::Astalty => "astalty",
            SupportedPlatform::SupportAbility => "supportability",
            SupportedPlatform::CareMaster => "caremaster",
            SupportedPlatform::Generic => "generic",
        }
    }

    /// Returns all supported platforms in display order.
    pub fn all() -> Vec<SupportedPlatform> {
        vec![
            SupportedPlatform::ShiftCare,
            SupportedPlatform::Brevity,
            SupportedPlatform::Lumary,
            SupportedPlatform::Astalty,
            SupportedPlatform::SupportAbility,
            SupportedPlatform::CareMaster,
        ]
    }

    /// Returns whether a connector has been implemented for this platform.
    /// Update this as connectors are built.
    pub fn is_implemented(&self) -> bool {
        // No connectors implemented yet — this is the interface layer only.
        // Set to true as each connector is built.
        false
    }

    /// Returns the implementation status label for the UI.
    pub fn implementation_status(&self) -> &str {
        if self.is_implemented() {
            "Available"
        } else {
            "Coming soon"
        }
    }
}

/// A lightweight descriptor for a platform shown in the "Connected Platforms" UI.
/// Does not require an actual connector instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformDescriptor {
    pub platform_id: String,
    pub display_name: String,
    pub is_implemented: bool,
    pub implementation_status: String,
    pub status: ConnectorStatus,
}

impl PlatformDescriptor {
    /// Build a descriptor for a platform with no active connection.
    pub fn not_configured(platform: &SupportedPlatform) -> Self {
        Self {
            platform_id: platform.platform_id().to_string(),
            display_name: platform.display_name().to_string(),
            is_implemented: platform.is_implemented(),
            implementation_status: platform.implementation_status().to_string(),
            status: ConnectorStatus::NotConfigured,
        }
    }
}

/// Returns a list of all known platforms with their current status.
/// In the future, this will query the `TokenStore` to determine
/// which platforms have stored credentials.
///
/// This is the function called by the "Connected Platforms" settings section.
pub fn list_all_platforms(app_data_dir: &std::path::Path) -> Vec<PlatformDescriptor> {
    SupportedPlatform::all()
        .iter()
        .map(|p| {
            // In the future: check TokenStore for existing credentials
            // and return the real status. For now, all are NotConfigured.
            let _ = app_data_dir; // will be used when TokenStore is queried
            PlatformDescriptor::not_configured(p)
        })
        .collect()
}
