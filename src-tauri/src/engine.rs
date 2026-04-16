//! # RiteDoc Native Inference Engine
//!
//! Replaces the Docker-based HTTP server with a native llama.cpp
//! integration via the `llama-cpp-2` Rust bindings.
//!
//! Design:
//!   - Model loaded ONCE at app startup and held in memory via Tauri managed state
//!   - Inference runs on a dedicated thread (blocking) — called from async via spawn_blocking
//!   - Chat template applied using the model's built-in template
//!   - CPU-only for this initial build; GPU layers can be enabled later via n_gpu_layers
//!   - Model path is configurable (default: {app_data}/models/phi-4-mini-q4_k_m.gguf)
//!   - Graceful handling of missing model file
//!   - Zero data retention — nothing persisted from inference

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaChatMessage, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;

use std::num::NonZeroU32;
use std::path::{Path, PathBuf};
use std::pin::pin;
use std::sync::{Arc, Mutex};

// ═════════════════════════════════════════════════════════════════════════════
//  Constants
// ═════════════════════════════════════════════════════════════════════════════

/// Default model filename
pub const DEFAULT_MODEL_FILENAME: &str = "phi-4-mini-q4_k_m.gguf";

/// Default context window size (tokens)
const DEFAULT_CTX_SIZE: u32 = 4096;

/// Maximum tokens to generate per inference call
const MAX_GENERATION_TOKENS: usize = 4096;

/// Batch size for token processing
const BATCH_SIZE: usize = 512;

// ═════════════════════════════════════════════════════════════════════════════
//  Engine State — held in Tauri managed state
// ═════════════════════════════════════════════════════════════════════════════

/// The native inference engine state.
///
/// Wrapped in `Arc<Mutex<...>>` for thread-safe access from Tauri commands.
/// The `Option` allows for graceful handling when the model is not loaded
/// (e.g., model file not found at startup).
pub struct NativeEngine {
    /// The llama.cpp backend (must stay alive for the lifetime of the model)
    _backend: Option<LlamaBackend>,
    /// The loaded model (None if model file was not found)
    model: Option<LlamaModel>,
    /// Path to the model file
    model_path: PathBuf,
    /// Whether the engine is ready for inference
    ready: bool,
    /// Error message if the engine failed to initialise
    error: Option<String>,
}

// LlamaBackend and LlamaModel are not Send/Sync by default, but we only
// access them behind a Mutex and on a single thread via spawn_blocking.
unsafe impl Send for NativeEngine {}
unsafe impl Sync for NativeEngine {}

/// Thread-safe wrapper for the engine state, managed by Tauri.
pub type EngineState = Arc<Mutex<NativeEngine>>;

// ═════════════════════════════════════════════════════════════════════════════
//  Engine Status (returned to frontend)
// ═════════════════════════════════════════════════════════════════════════════

/// Engine health status returned by the `get_engine_status` command.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EngineStatus {
    /// Whether the engine is ready for inference
    pub ready: bool,
    /// Path to the model file
    pub model_path: String,
    /// Whether the model file exists on disk
    #[serde(rename = "model_found")]
    pub model_file_exists: bool,
    /// Error message (if any)
    pub error: Option<String>,
}

// ═════════════════════════════════════════════════════════════════════════════
//  Initialisation
// ═════════════════════════════════════════════════════════════════════════════

/// Resolve the model file path.
///
/// Priority:
///   1. Custom path from settings (if provided and non-empty)
///   2. Default: {app_data_dir}/models/{DEFAULT_MODEL_FILENAME}
pub fn resolve_model_path(app_data_dir: &Path, custom_path: Option<&str>) -> PathBuf {
    if let Some(p) = custom_path {
        let trimmed = p.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }
    app_data_dir.join("models").join(DEFAULT_MODEL_FILENAME)
}

/// Create an engine in a "not ready" state with an error message.
fn engine_not_ready(
    backend: Option<LlamaBackend>,
    model_path: &Path,
    error: String,
) -> EngineState {
    Arc::new(Mutex::new(NativeEngine {
        _backend: backend,
        model: None,
        model_path: model_path.to_path_buf(),
        ready: false,
        error: Some(error),
    }))
}

/// Initialise the native inference engine.
///
/// This should be called ONCE at app startup. If the model file is not found,
/// the engine is created in a "not ready" state with an error message.
/// The app can still function — it just can't do inference until the model
/// file is placed at the expected path.
pub fn init_engine(model_path: &Path) -> EngineState {
    log::info!("[engine] Initialising native inference engine...");
    log::info!("[engine] Model path: {:?}", model_path);

    // Check if model file exists
    if !model_path.exists() {
        log::warn!("[engine] Model file not found at {:?}", model_path);
        let backend = LlamaBackend::init().ok();
        return engine_not_ready(
            backend,
            model_path,
            format!(
                "Model file not found at: {}\n\n\
                 To set up the rewriting engine:\n\
                 1. Download the Phi-4-mini Q4_K_M GGUF model (~2.5 GB)\n\
                 2. Place it at the path shown above\n\
                 3. Restart the app\n\n\
                 You can change the model path in Settings.",
                model_path.display()
            ),
        );
    }

    // Initialise the llama.cpp backend
    let backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            log::error!("[engine] Failed to initialise llama.cpp backend: {}", e);
            return engine_not_ready(
                None,
                model_path,
                format!("Failed to initialise the processing engine: {}", e),
            );
        }
    };

    // Load the model
    log::info!("[engine] Loading model from {:?}...", model_path);
    let model_params = LlamaModelParams::default();
    let model_params = pin!(model_params);

    match LlamaModel::load_from_file(&backend, model_path, &model_params) {
        Ok(model) => {
            log::info!("[engine] Model loaded successfully.");
            Arc::new(Mutex::new(NativeEngine {
                _backend: Some(backend),
                model: Some(model),
                model_path: model_path.to_path_buf(),
                ready: true,
                error: None,
            }))
        }
        Err(e) => {
            log::error!("[engine] Failed to load model: {}", e);
            engine_not_ready(
                Some(backend),
                model_path,
                format!(
                    "Failed to load the model file at: {}\n\nError: {}\n\n\
                     The file may be corrupted or incompatible. \
                     Please re-download the Phi-4-mini Q4_K_M GGUF model.",
                    model_path.display(),
                    e
                ),
            )
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Status Query
// ═════════════════════════════════════════════════════════════════════════════

/// Get the current engine status (for the frontend and diagnostics).
pub fn get_status(engine: &EngineState) -> EngineStatus {
    let guard = engine.lock().unwrap_or_else(|e| e.into_inner());
    EngineStatus {
        ready: guard.ready,
        model_path: guard.model_path.display().to_string(),
        model_file_exists: guard.model_path.exists(),
        error: guard.error.clone(),
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Inference — the core function that replaces the HTTP call_llama()
// ═════════════════════════════════════════════════════════════════════════════

/// Run inference with a system prompt and user prompt.
///
/// This is the direct replacement for the old `call_llama()` HTTP function.
/// It uses the model's built-in chat template to format the prompt,
/// then runs token-by-token generation.
///
/// Must be called from a blocking context (e.g., `tokio::task::spawn_blocking`).
pub fn infer(
    engine: &EngineState,
    system_prompt: &str,
    user_prompt: &str,
) -> Result<String, String> {
    let guard = engine.lock().map_err(|e| format!("Engine lock poisoned: {}", e))?;

    if !guard.ready {
        return Err(guard.error.clone().unwrap_or_else(|| {
            "The rewriting engine is not ready. Please check Settings for details.".to_string()
        }));
    }

    let model = guard.model.as_ref().ok_or_else(|| {
        "The rewriting engine has no model loaded. Please check Settings for details.".to_string()
    })?;

    // ── Build the chat prompt using the model's template ─────────────────────
    let messages = vec![
        LlamaChatMessage::new("system".to_string(), system_prompt.to_string())
            .map_err(|e| format!("Failed to create system message: {}", e))?,
        LlamaChatMessage::new("user".to_string(), user_prompt.to_string())
            .map_err(|e| format!("Failed to create user message: {}", e))?,
    ];

    // Get the model's built-in chat template (preferred over hardcoding a template name)
    let tmpl = model
        .chat_template(None)
        .map_err(|e| format!("Failed to get chat template from model: {}", e))?;

    let prompt = model
        .apply_chat_template(&tmpl, &messages, true)
        .map_err(|e| format!("Failed to apply chat template: {}", e))?;

    // ── Tokenize ─────────────────────────────────────────────────────────────
    let tokens = model
        .str_to_token(&prompt, AddBos::Never)
        .map_err(|e| format!("Tokenization failed: {}", e))?;

    let n_prompt_tokens = tokens.len();
    log::info!(
        "[engine] Prompt tokenized: {} tokens (ctx={})",
        n_prompt_tokens,
        DEFAULT_CTX_SIZE
    );

    if n_prompt_tokens >= DEFAULT_CTX_SIZE as usize {
        return Err(format!(
            "The note is too long for the processing engine ({} tokens, max {}). \
             Please shorten the note or use Quick mode.",
            n_prompt_tokens, DEFAULT_CTX_SIZE
        ));
    }

    // ── Create a fresh context for this inference ────────────────────────────
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(Some(
            NonZeroU32::new(DEFAULT_CTX_SIZE).expect("ctx size must be > 0"),
        ));

    let backend = guard._backend.as_ref().ok_or_else(|| {
        "The processing engine backend is not initialised.".to_string()
    })?;

    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| format!("Failed to create inference context: {}", e))?;

    // ── Feed prompt tokens ───────────────────────────────────────────────────
    let mut batch = LlamaBatch::new(BATCH_SIZE, 1);

    for (i, &token) in tokens.iter().enumerate() {
        let is_last = i == n_prompt_tokens - 1;
        batch
            .add(token, i as i32, &[0], is_last)
            .map_err(|_| "Failed to add token to batch".to_string())?;

        // Flush batch when full
        if batch.n_tokens() as usize >= BATCH_SIZE {
            ctx.decode(&mut batch)
                .map_err(|e| format!("Prompt decode failed: {}", e))?;
            batch.clear();
        }
    }

    // Decode remaining prompt tokens
    if batch.n_tokens() > 0 {
        ctx.decode(&mut batch)
            .map_err(|e| format!("Prompt decode failed: {}", e))?;
    }

    // ── Generate tokens ──────────────────────────────────────────────────────
    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::temp(0.3),
        LlamaSampler::dist(42),
    ]);

    let mut output = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_generated = 0usize;

    loop {
        if n_generated >= MAX_GENERATION_TOKENS {
            log::warn!(
                "[engine] Hit max generation limit ({} tokens)",
                MAX_GENERATION_TOKENS
            );
            break;
        }

        let token = sampler.sample(&ctx, -1);
        sampler.accept(token);

        // Check for end of generation
        if model.is_eog_token(token) {
            log::info!(
                "[engine] Generation complete: {} tokens generated",
                n_generated
            );
            break;
        }

        // Decode token to text
        match model.token_to_piece(token, &mut decoder, true, None) {
            Ok(piece) => {
                output.push_str(&piece);
            }
            Err(e) => {
                log::warn!("[engine] Token decode error (continuing): {}", e);
            }
        }

        // Prepare next token
        batch.clear();
        batch
            .add(token, (n_prompt_tokens + n_generated) as i32, &[0], true)
            .map_err(|_| "Failed to add generated token to batch".to_string())?;

        ctx.decode(&mut batch)
            .map_err(|e| format!("Generation decode failed: {}", e))?;

        n_generated += 1;
    }

    let result = output.trim().to_string();

    if result.is_empty() {
        return Err(
            "The rewriting engine returned an empty response. Please try again.".to_string(),
        );
    }

    Ok(result)
}

// ═════════════════════════════════════════════════════════════════════════════
//  Tests
// ═════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_model_path_default() {
        let app_data = Path::new("/tmp/ritedoc");
        let path = resolve_model_path(app_data, None);
        assert_eq!(
            path,
            PathBuf::from("/tmp/ritedoc/models/phi-4-mini-q4_k_m.gguf")
        );
    }

    #[test]
    fn test_resolve_model_path_custom() {
        let app_data = Path::new("/tmp/ritedoc");
        let path = resolve_model_path(app_data, Some("/custom/path/model.gguf"));
        assert_eq!(path, PathBuf::from("/custom/path/model.gguf"));
    }

    #[test]
    fn test_resolve_model_path_empty_custom() {
        let app_data = Path::new("/tmp/ritedoc");
        let path = resolve_model_path(app_data, Some("  "));
        assert_eq!(
            path,
            PathBuf::from("/tmp/ritedoc/models/phi-4-mini-q4_k_m.gguf")
        );
    }

    #[test]
    fn test_init_engine_missing_model() {
        let engine = init_engine(Path::new("/nonexistent/model.gguf"));
        let status = get_status(&engine);
        assert!(!status.ready);
        assert!(!status.model_file_exists);
        assert!(status.error.is_some());
    }

    #[test]
    fn test_engine_status_structure() {
        let engine = init_engine(Path::new("/nonexistent/model.gguf"));
        let status = get_status(&engine);
        assert_eq!(status.model_path, "/nonexistent/model.gguf");
        assert!(!status.ready);
    }
}
