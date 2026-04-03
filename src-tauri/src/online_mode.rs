/// online_mode.rs — Network Permission Toggle for RiteDoc
///
/// RiteDoc is an offline-first application. All core functionality
/// (note processing, PII scrubbing, compliance scoring) works without
/// any internet connection.
///
/// API connections to NDIS platforms (ShiftCare, Brevity, etc.) require
/// an explicit "online mode" to be enabled by the user. This is a
/// deliberate design choice:
///
/// 1. **Privacy**: Participants' data never leaves the device unless the
///    user explicitly enables online mode for a specific purpose.
/// 2. **Compliance**: NDIS providers must be able to demonstrate that
///    participant data is handled appropriately. An explicit toggle
///    creates a clear audit trail.
/// 3. **Trust**: Support workers and agency managers can see at a glance
///    whether the app is making network connections.
///
/// # Online mode states
///
/// ```
/// Offline (default)
///   └─ No network connections permitted (except activation check on first run
///      and silent cartridge updates — these are the only two exceptions)
///
/// Online (user-enabled)
///   └─ Platform connector API calls permitted
///   └─ Automatically reverts to Offline after the session ends
///      (or after a configurable timeout)
/// ```
///
/// # Persistence
///
/// Online mode state is NOT persisted across app restarts. The app always
/// starts in Offline mode. The user must explicitly enable Online mode
/// each session if they want to use platform connectors.
///
/// # Thread safety
///
/// `OnlineMode` is designed to be shared via `Arc<Mutex<OnlineMode>>` in
/// `AppState`. All state mutations go through `&mut self` methods.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

// ============================================================
// ONLINE MODE STATE
// ============================================================

/// The reason online mode was enabled.
/// Stored for audit/display purposes.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OnlineModeReason {
    /// User explicitly enabled online mode from the Settings screen
    UserEnabled,
    /// Online mode was enabled to fetch notes from a specific platform
    FetchNotes { platform_id: String },
    /// Online mode was enabled to push notes to a specific platform
    PushNotes { platform_id: String },
    /// Online mode was enabled for initial platform authentication
    Authenticate { platform_id: String },
}

impl std::fmt::Display for OnlineModeReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OnlineModeReason::UserEnabled => write!(f, "Enabled by user"),
            OnlineModeReason::FetchNotes { platform_id } =>
                write!(f, "Fetching notes from {}", platform_id),
            OnlineModeReason::PushNotes { platform_id } =>
                write!(f, "Pushing notes to {}", platform_id),
            OnlineModeReason::Authenticate { platform_id } =>
                write!(f, "Authenticating with {}", platform_id),
        }
    }
}

/// An entry in the online mode audit log.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineModeLogEntry {
    /// Whether online mode was enabled (true) or disabled (false)
    pub enabled: bool,
    /// The reason for the state change
    pub reason: Option<OnlineModeReason>,
    /// When the state change occurred
    pub timestamp: DateTime<Utc>,
    /// How long online mode was active (in seconds), if this is a disable entry
    pub duration_seconds: Option<u64>,
}

/// The current online mode state, including metadata for display.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineModeStatus {
    /// Whether online mode is currently enabled
    pub is_online: bool,
    /// When online mode was last enabled (if currently online)
    pub enabled_at: Option<DateTime<Utc>>,
    /// The reason online mode was enabled
    pub reason: Option<OnlineModeReason>,
    /// The configured session timeout in minutes (0 = no timeout)
    pub session_timeout_minutes: u32,
    /// How many minutes remain before automatic timeout (if timeout is set)
    pub minutes_remaining: Option<u32>,
    /// The audit log of online mode state changes (most recent first, max 20 entries)
    pub recent_log: Vec<OnlineModeLogEntry>,
}

// ============================================================
// ONLINE MODE MANAGER
// ============================================================

/// Manages the online/offline mode state for the application.
///
/// This is stored in `AppState` and shared across all Tauri commands.
///
/// # Example
///
/// ```rust
/// // In a Tauri command that needs online access:
/// let online_mode = state.online_mode.lock().unwrap();
/// if !online_mode.is_online() {
///     return Err("Online mode is not enabled. Enable it in Settings > Connected Platforms.".into());
/// }
/// // Proceed with API call...
/// ```
pub struct OnlineMode {
    /// Atomic flag for fast lock-free reads in hot paths
    is_online: Arc<AtomicBool>,
    /// When online mode was enabled
    enabled_at: Option<DateTime<Utc>>,
    /// The reason online mode was enabled
    current_reason: Option<OnlineModeReason>,
    /// Session timeout in minutes (0 = no timeout)
    session_timeout_minutes: u32,
    /// Audit log (most recent first)
    log: Vec<OnlineModeLogEntry>,
}

impl Default for OnlineMode {
    fn default() -> Self {
        Self::new()
    }
}

impl OnlineMode {
    /// Create a new `OnlineMode` in the default Offline state.
    pub fn new() -> Self {
        Self {
            is_online: Arc::new(AtomicBool::new(false)),
            enabled_at: None,
            current_reason: None,
            session_timeout_minutes: 30, // Default: auto-disable after 30 minutes
            log: Vec::new(),
        }
    }

    // ----------------------------------------------------------
    // STATE CHECKS
    // ----------------------------------------------------------

    /// Returns true if online mode is currently enabled.
    ///
    /// This is a fast, lock-free read using an atomic boolean.
    /// Use this in hot paths (e.g. before every API call).
    pub fn is_online(&self) -> bool {
        self.is_online.load(Ordering::Relaxed)
    }

    /// Returns true if the app is in offline mode (the default).
    pub fn is_offline(&self) -> bool {
        !self.is_online()
    }

    /// Check if the session has timed out and disable online mode if so.
    /// Call this periodically (e.g. on every Tauri command invocation).
    ///
    /// Returns true if online mode was disabled due to timeout.
    pub fn check_timeout(&mut self) -> bool {
        if !self.is_online() || self.session_timeout_minutes == 0 {
            return false;
        }

        if let Some(enabled_at) = self.enabled_at {
            let elapsed = Utc::now()
                .signed_duration_since(enabled_at)
                .num_minutes() as u32;

            if elapsed >= self.session_timeout_minutes {
                self.disable(Some("Session timeout".to_string()));
                return true;
            }
        }

        false
    }

    // ----------------------------------------------------------
    // STATE MUTATIONS
    // ----------------------------------------------------------

    /// Enable online mode.
    ///
    /// # Arguments
    /// * `reason` — Why online mode is being enabled (for audit log)
    pub fn enable(&mut self, reason: OnlineModeReason) {
        if self.is_online() {
            // Already online — update the reason but don't reset the timer
            self.current_reason = Some(reason);
            return;
        }

        self.is_online.store(true, Ordering::Relaxed);
        self.enabled_at = Some(Utc::now());
        self.current_reason = Some(reason.clone());

        self.add_log_entry(OnlineModeLogEntry {
            enabled: true,
            reason: Some(reason),
            timestamp: Utc::now(),
            duration_seconds: None,
        });

        log::info!("Online mode ENABLED: {}", self.current_reason.as_ref().unwrap());
    }

    /// Disable online mode.
    ///
    /// # Arguments
    /// * `reason` — Optional reason for disabling (for audit log)
    pub fn disable(&mut self, reason: Option<String>) {
        if !self.is_online() {
            return; // Already offline
        }

        let duration_seconds = self.enabled_at.map(|t| {
            Utc::now().signed_duration_since(t).num_seconds().max(0) as u64
        });

        self.is_online.store(false, Ordering::Relaxed);
        self.enabled_at = None;
        self.current_reason = None;

        let log_reason = reason.as_deref().unwrap_or("User disabled");
        log::info!(
            "Online mode DISABLED: {} (was active for {}s)",
            log_reason,
            duration_seconds.unwrap_or(0)
        );

        self.add_log_entry(OnlineModeLogEntry {
            enabled: false,
            reason: None,
            timestamp: Utc::now(),
            duration_seconds,
        });
    }

    /// Toggle online mode.
    /// If online, disables it. If offline, enables it with `UserEnabled` reason.
    pub fn toggle(&mut self) {
        if self.is_online() {
            self.disable(Some("User toggled off".to_string()));
        } else {
            self.enable(OnlineModeReason::UserEnabled);
        }
    }

    // ----------------------------------------------------------
    // CONFIGURATION
    // ----------------------------------------------------------

    /// Set the session timeout in minutes.
    /// Set to 0 to disable automatic timeout.
    pub fn set_session_timeout(&mut self, minutes: u32) {
        self.session_timeout_minutes = minutes;
    }

    // ----------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------

    /// Get the current online mode status for display in the UI.
    pub fn get_status(&self) -> OnlineModeStatus {
        let minutes_remaining = if self.is_online() && self.session_timeout_minutes > 0 {
            self.enabled_at.map(|t| {
                let elapsed = Utc::now()
                    .signed_duration_since(t)
                    .num_minutes()
                    .max(0) as u32;
                self.session_timeout_minutes.saturating_sub(elapsed)
            })
        } else {
            None
        };

        OnlineModeStatus {
            is_online: self.is_online(),
            enabled_at: self.enabled_at,
            reason: self.current_reason.clone(),
            session_timeout_minutes: self.session_timeout_minutes,
            minutes_remaining,
            recent_log: self.log.iter().take(20).cloned().collect(),
        }
    }

    // ----------------------------------------------------------
    // INTERNAL
    // ----------------------------------------------------------

    fn add_log_entry(&mut self, entry: OnlineModeLogEntry) {
        self.log.insert(0, entry);
        // Keep at most 50 entries
        if self.log.len() > 50 {
            self.log.truncate(50);
        }
    }
}

// ============================================================
// NETWORK PERMISSION GUARD
// ============================================================

/// A RAII guard that enables online mode for the duration of a block
/// and automatically disables it when dropped.
///
/// Use this in connector methods to ensure online mode is always
/// cleaned up, even if the operation fails:
///
/// ```rust
/// async fn fetch_notes(&self, ...) -> ConnectorResult<Vec<RawNote>> {
///     let _guard = OnlineModeGuard::acquire(online_mode, reason)?;
///     // Online mode is now enabled
///     // ... make API calls ...
///     // Online mode is automatically disabled when _guard is dropped
/// }
/// ```
///
/// NOTE: This is a design sketch. The actual implementation requires
/// `Arc<Mutex<OnlineMode>>` to be passed in, which will be wired up
/// when the first connector is built.
pub struct OnlineModeGuard {
    // In the real implementation, this will hold an Arc<Mutex<OnlineMode>>
    // and disable online mode on Drop.
    _private: (),
}

impl OnlineModeGuard {
    /// Attempt to acquire an online mode guard.
    /// Returns an error if online mode cannot be enabled.
    ///
    /// In the current stub implementation, this always succeeds.
    /// The real implementation will check user permissions and
    /// potentially prompt the user.
    pub fn acquire(
        _online_mode: &mut OnlineMode,
        _reason: OnlineModeReason,
    ) -> Result<Self, String> {
        // TODO: In the real implementation:
        // 1. Check if the user has granted permission for this operation
        // 2. Enable online mode with the given reason
        // 3. Return a guard that disables online mode on drop
        Ok(Self { _private: () })
    }
}

impl Drop for OnlineModeGuard {
    fn drop(&mut self) {
        // TODO: Disable online mode when the guard is dropped
        // online_mode.disable(Some("Operation complete".to_string()));
    }
}

// ============================================================
// SERIALIZABLE CONFIG (for settings persistence)
// ============================================================

/// User-configurable online mode settings.
/// Persisted to `{app_data_dir}/online_mode_config.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnlineModeConfig {
    /// Session timeout in minutes (0 = no timeout)
    pub session_timeout_minutes: u32,
    /// Whether to show a notification when online mode is enabled
    pub show_enable_notification: bool,
    /// Whether to show a notification when online mode times out
    pub show_timeout_notification: bool,
    /// Whether to log online mode events to the audit log
    pub audit_logging_enabled: bool,
}

impl Default for OnlineModeConfig {
    fn default() -> Self {
        Self {
            session_timeout_minutes: 30,
            show_enable_notification: true,
            show_timeout_notification: true,
            audit_logging_enabled: true,
        }
    }
}

impl OnlineModeConfig {
    /// Load config from disk, falling back to defaults if not found.
    pub fn load(app_data_dir: &std::path::Path) -> Self {
        let path = app_data_dir.join("online_mode_config.json");
        if let Ok(content) = std::fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str::<Self>(&content) {
                return config;
            }
        }
        Self::default()
    }

    /// Save config to disk.
    pub fn save(&self, app_data_dir: &std::path::Path) -> Result<(), String> {
        let path = app_data_dir.join("online_mode_config.json");
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }
}

// ============================================================
// TESTS
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_starts_offline() {
        let mode = OnlineMode::new();
        assert!(!mode.is_online());
        assert!(mode.is_offline());
    }

    #[test]
    fn test_enable_disable() {
        let mut mode = OnlineMode::new();
        mode.enable(OnlineModeReason::UserEnabled);
        assert!(mode.is_online());

        mode.disable(None);
        assert!(!mode.is_online());
    }

    #[test]
    fn test_toggle() {
        let mut mode = OnlineMode::new();
        assert!(!mode.is_online());

        mode.toggle();
        assert!(mode.is_online());

        mode.toggle();
        assert!(!mode.is_online());
    }

    #[test]
    fn test_enable_twice_does_not_reset_timer() {
        let mut mode = OnlineMode::new();
        mode.enable(OnlineModeReason::UserEnabled);
        let first_enabled_at = mode.enabled_at;

        // Enable again — should not reset the timer
        mode.enable(OnlineModeReason::FetchNotes {
            platform_id: "shiftcare".to_string(),
        });
        assert_eq!(mode.enabled_at, first_enabled_at);
    }

    #[test]
    fn test_status_returns_correct_state() {
        let mut mode = OnlineMode::new();
        let status = mode.get_status();
        assert!(!status.is_online);
        assert!(status.enabled_at.is_none());

        mode.enable(OnlineModeReason::UserEnabled);
        let status = mode.get_status();
        assert!(status.is_online);
        assert!(status.enabled_at.is_some());
    }

    #[test]
    fn test_log_entries_are_recorded() {
        let mut mode = OnlineMode::new();
        mode.enable(OnlineModeReason::UserEnabled);
        mode.disable(None);
        mode.enable(OnlineModeReason::FetchNotes {
            platform_id: "brevity".to_string(),
        });

        let status = mode.get_status();
        // Most recent first: enable, disable, enable
        assert_eq!(status.recent_log.len(), 3);
        assert!(status.recent_log[0].enabled); // Most recent: enable
        assert!(!status.recent_log[1].enabled); // Second: disable
        assert!(status.recent_log[2].enabled); // Third: first enable
    }

    #[test]
    fn test_timeout_check() {
        let mut mode = OnlineMode::new();
        mode.set_session_timeout(0); // No timeout
        mode.enable(OnlineModeReason::UserEnabled);

        // Should not time out with timeout=0
        let timed_out = mode.check_timeout();
        assert!(!timed_out);
        assert!(mode.is_online());
    }
}
