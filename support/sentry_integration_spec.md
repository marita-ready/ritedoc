# Sentry Integration Specification

This technical specification details the configuration and implementation of Sentry within the RiteDoc desktop application (Tauri 2.0 + Rust) for silent crash capture and error monitoring.

## 1. Purpose and Scope

Sentry is integrated into RiteDoc to automatically detect, capture, and report unhandled exceptions, application crashes, and significant performance bottlenecks. This data is crucial for the ReadyCompliant development team to proactively identify and resolve software bugs, improving the overall stability of the application.

Crucially, this integration is designed to operate entirely silently (without interrupting the user) and with strict adherence to the RiteDoc Data Handling Policy, ensuring absolutely no participant data or progress note content is ever transmitted.

## 2. Sentry Configuration (Free Tier)

RiteDoc utilises the Sentry Developer (Free) tier, which provides sufficient error tracking and performance monitoring for the current scale of the application.

### 2.1 Project Setup

A dedicated project named `ritedoc-desktop` is created within the ReadyCompliant Sentry organisation.

### 2.2 DSN (Data Source Name)

The unique DSN for the `ritedoc-desktop` project is securely embedded within the RiteDoc application code. This DSN directs the captured error reports to the correct Sentry project.

## 3. Implementation Details (Tauri & Rust)

The Sentry SDK is integrated into both the Rust backend and the web frontend (HTML/CSS/JS) of the Tauri application.

### 3.1 Rust Backend Integration

The `sentry` crate is added to the `Cargo.toml` dependencies.

```rust
// Example initialization in main.rs
fn main() {
    let _guard = sentry::init(("YOUR_DSN_HERE", sentry::ClientOptions {
        release: sentry::release_name!(),
        // Configure before_send to scrub data
        before_send: Some(Arc::new(|mut event| {
            // Scrubbing logic here (see Section 4)
            Some(event)
        })),
        ..Default::default()
    }));

    tauri::Builder::default()
        // ... Tauri setup ...
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 3.2 Frontend Integration

The `@sentry/browser` package is used in the frontend to capture JavaScript errors and React/Vue exceptions (depending on the specific frontend framework used).

## 4. Data Scrubbing and Privacy (Critical)

To comply with the offline-only and zero-data-transmission policies, Sentry must be aggressively configured to scrub all potentially sensitive information before any report is sent.

### 4.1 The `before_send` Hook

Both the Rust and frontend Sentry initialisations must implement a robust `before_send` hook. This hook intercepts the error event object immediately before transmission.

### 4.2 Scrubbing Rules

The `before_send` hook must enforce the following rules:

1.  **Remove all local file paths:** File paths (e.g., `C:\Users\Name\Downloads\notes.csv`) can reveal user names or client structures. These must be stripped or replaced with generic placeholders (e.g., `<local_path>`).
2.  **Strip all variable values:** Local variables captured in stack traces might contain snippets of progress notes or PII. The hook must remove the values of all local variables from the stack trace data.
3.  **Filter specific error messages:** If an error message itself contains sensitive data (e.g., "Failed to parse note for participant John Doe"), the hook must redact the sensitive portion using regex or string replacement.
4.  **Disable default integrations:** Certain default Sentry integrations (like capturing breadcrumbs of user clicks or console logs) must be disabled if they risk capturing sensitive input.

### 4.3 Allowed Telemetry

The only data permitted in the Sentry report is:

*   The stack trace (function names, line numbers, file names within the application source code).
*   The exception type and a generic error message.
*   Basic hardware/OS telemetry (OS version, architecture, RAM size) to assist in debugging environment-specific crashes.
*   The application version (`release`).

## 5. Integration with the Troubleshooting Matrix

Sentry crash reports are not isolated; they feed directly into the continuous improvement of the automated support flow.

### 5.1 Issue Triage

The ReadyCompliant development team regularly reviews new issues captured in Sentry.

### 5.2 Matrix Updates

When a new, recurring crash is identified and resolved (e.g., a specific hardware configuration causing a memory leak), the solution is documented.

If the issue can be detected by the Tauri auto-diagnosis system or resolved via a self-fix, the `troubleshooting_matrix.md` is updated. This ensures that future occurrences of the same crash are handled automatically by the support stack (Self-Fix -> Dify -> Retell) rather than requiring manual developer intervention.
