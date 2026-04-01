use crate::models::{HardwareProfile, ProcessingMode};
use serde::{Deserialize, Serialize};
use sysinfo::System;

/// LLM Configuration for local inference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub model_path: String,
    pub n_ctx: u32,
    pub n_threads: u32,
    pub n_gpu_layers: i32,
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
    pub repeat_penalty: f32,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            model_path: String::new(),
            n_ctx: 4096,
            n_threads: 4,
            n_gpu_layers: -1,
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 2048,
            repeat_penalty: 1.1,
        }
    }
}

/// Detect hardware capabilities and determine processing mode
/// Follows hardware_detection_spec.md thresholds:
/// - Turbo: RAM >= 32GB OR GPU with >= 8GB VRAM
/// - Standard: RAM 16-31GB, no qualifying GPU
/// - Failure: RAM < 16GB
pub fn detect_hardware() -> Result<HardwareProfile, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total_ram_bytes = sys.total_memory();
    let ram_gb = total_ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0);

    let cpu_cores = sys.cpus().len() as u32;

    // GPU detection: check for NVIDIA via /proc/driver or environment
    let (has_gpu, gpu_name, gpu_vram_gb) = detect_gpu();

    // Mode selection per spec
    let mode = if ram_gb >= 32.0 || (has_gpu && gpu_vram_gb.unwrap_or(0.0) >= 8.0) {
        ProcessingMode::Turbo
    } else if ram_gb >= 16.0 {
        ProcessingMode::Standard
    } else {
        return Err(format!(
            "Insufficient system memory: {:.1}GB detected. RiteDoc requires at least 16GB RAM to run the compliance engine. Please close other applications or upgrade your system memory.",
            ram_gb
        ));
    };

    let recommended_threads = match mode {
        ProcessingMode::Turbo => (cpu_cores / 2).max(4),
        ProcessingMode::Standard => (cpu_cores / 2).max(2),
    };

    let recommended_gpu_layers = if has_gpu { -1 } else { 0 };

    Ok(HardwareProfile {
        mode,
        cpu_cores,
        ram_gb,
        has_gpu,
        gpu_name,
        gpu_vram_gb,
        recommended_threads,
        recommended_gpu_layers,
    })
}

/// Attempt GPU detection (NVIDIA via sysfs/proc, Apple Metal via platform)
fn detect_gpu() -> (bool, Option<String>, Option<f64>) {
    // Try NVIDIA detection via /proc
    if let Ok(content) = std::fs::read_to_string("/proc/driver/nvidia/version") {
        let name = content.lines().next().unwrap_or("NVIDIA GPU").to_string();
        // Try to read VRAM from nvidia-smi
        if let Ok(output) = std::process::Command::new("nvidia-smi")
            .args(["--query-gpu=memory.total", "--format=csv,noheader,nounits"])
            .output()
        {
            if output.status.success() {
                let vram_str = String::from_utf8_lossy(&output.stdout);
                if let Ok(vram_mb) = vram_str.trim().parse::<f64>() {
                    return (true, Some(name), Some(vram_mb / 1024.0));
                }
            }
        }
        return (true, Some(name), None);
    }

    // Check for Apple Metal (macOS)
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("system_profiler")
            .args(["SPDisplaysDataType"])
            .output()
        {
            if output.status.success() {
                let info = String::from_utf8_lossy(&output.stdout);
                if info.contains("Metal") {
                    let gpu_name = info
                        .lines()
                        .find(|l| l.contains("Chipset Model"))
                        .map(|l| l.split(':').nth(1).unwrap_or("Apple GPU").trim().to_string())
                        .unwrap_or_else(|| "Apple Metal GPU".to_string());
                    return (true, Some(gpu_name), None);
                }
            }
        }
    }

    (false, None, None)
}

/// Check available RAM for dynamic downgrade decisions
pub fn check_available_ram_gb() -> f64 {
    let mut sys = System::new();
    sys.refresh_memory();
    sys.available_memory() as f64 / (1024.0 * 1024.0 * 1024.0)
}

/// Check available disk space in GB
pub fn check_disk_space_gb(path: &std::path::Path) -> f64 {
    // Use statvfs on Unix
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        if let Ok(output) = std::process::Command::new("df")
            .args(["--output=avail", "-B1"])
            .arg(path)
            .output()
        {
            if output.status.success() {
                let out = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = out.lines().nth(1) {
                    if let Ok(bytes) = line.trim().parse::<f64>() {
                        return bytes / (1024.0 * 1024.0 * 1024.0);
                    }
                }
            }
        }
        // Fallback: try metadata
        if let Ok(_meta) = std::fs::metadata(path) {
            return 10.0; // Safe default
        }
    }
    10.0 // Default fallback
}

/// Format a prompt for the Phi-4-mini chat template
pub fn format_phi4_prompt(system_prompt: &str, user_message: &str) -> String {
    format!(
        "<|system|>\n{}<|end|>\n<|user|>\n{}<|end|>\n<|assistant|>\n",
        system_prompt, user_message
    )
}

/// Extract a JSON block from LLM output text
pub fn extract_json_block(text: &str) -> String {
    let trimmed = text.trim();

    // Check for ```json ... ``` wrapper
    if let Some(start) = trimmed.find("```json") {
        let json_start = start + 7;
        if let Some(end) = trimmed[json_start..].find("```") {
            return trimmed[json_start..json_start + end].trim().to_string();
        }
    }

    // Check for ``` ... ``` wrapper
    if let Some(start) = trimmed.find("```") {
        let json_start = start + 3;
        let actual_start = trimmed[json_start..]
            .find('\n')
            .map(|n| json_start + n + 1)
            .unwrap_or(json_start);
        if let Some(end) = trimmed[actual_start..].find("```") {
            return trimmed[actual_start..actual_start + end].trim().to_string();
        }
    }

    // Try to find raw JSON object or array
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            return trimmed[start..=end].to_string();
        }
    }

    trimmed.to_string()
}
