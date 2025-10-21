use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Exit codes for the CLI as specified in CLAUDE.md
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExitCode {
    Success = 0,
    InvalidArguments = 2,
    DataPathUnavailable = 3,
    FilesystemError = 4,
    UnexpectedError = 5,
}

impl ExitCode {
    pub fn as_i32(self) -> i32 {
        self as i32
    }
}

/// JSON output for the sync-full command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncFullOutput {
    pub ok: bool,
    pub created_in_scripts: usize,
    pub created_in_data: usize,
    pub created_total: usize,
    pub existing_total: usize,
    pub duration_ms: u64,
    pub scripts_path: String,
    pub data_path: String,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

impl SyncFullOutput {
    pub fn new(
        scripts_path: PathBuf,
        data_path: PathBuf,
        created_in_scripts: usize,
        created_in_data: usize,
        existing_total: usize,
        duration_ms: u64,
        warnings: Vec<String>,
        errors: Vec<String>,
    ) -> Self {
        let ok = errors.is_empty();
        let created_total = created_in_scripts + created_in_data;

        Self {
            ok,
            created_in_scripts,
            created_in_data,
            created_total,
            existing_total,
            duration_ms,
            scripts_path: scripts_path.display().to_string(),
            data_path: data_path.display().to_string(),
            warnings,
            errors,
        }
    }

    pub fn to_json(&self) -> serde_json::Result<String> {
        serde_json::to_string_pretty(self)
    }

    pub fn to_human_string(&self) -> String {
        if !self.ok {
            format!(
                "Sync failed with {} error(s):\n{}",
                self.errors.len(),
                self.errors.join("\n")
            )
        } else {
            format!(
                "Synced {} directories ({} created, {} existing) in {}ms",
                self.created_total + self.existing_total,
                self.created_total,
                self.existing_total,
                self.duration_ms
            )
        }
    }
}

/// JSON output for the ensure-path command
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnsurePathOutput {
    pub ok: bool,
    pub ensured_relative: String,
    pub ensured_scripts_path: String,
    pub ensured_data_path: String,
    pub created_in_scripts_chain: usize,
    pub created_in_data_chain: usize,
    pub duration_ms: u64,
    pub scripts_path: String,
    pub data_path: String,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

impl EnsurePathOutput {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        scripts_path: PathBuf,
        data_path: PathBuf,
        relative_path: PathBuf,
        created_in_scripts_chain: usize,
        created_in_data_chain: usize,
        duration_ms: u64,
        warnings: Vec<String>,
        errors: Vec<String>,
    ) -> Self {
        let ok = errors.is_empty();

        let ensured_scripts_path = scripts_path.join(&relative_path);
        let ensured_data_path = data_path.join(&relative_path);

        Self {
            ok,
            ensured_relative: relative_path.display().to_string(),
            ensured_scripts_path: ensured_scripts_path.display().to_string(),
            ensured_data_path: ensured_data_path.display().to_string(),
            created_in_scripts_chain,
            created_in_data_chain,
            duration_ms,
            scripts_path: scripts_path.display().to_string(),
            data_path: data_path.display().to_string(),
            warnings,
            errors,
        }
    }

    pub fn to_json(&self) -> serde_json::Result<String> {
        serde_json::to_string_pretty(self)
    }

    pub fn to_human_string(&self) -> String {
        if !self.ok {
            format!(
                "Ensure path failed with {} error(s):\n{}",
                self.errors.len(),
                self.errors.join("\n")
            )
        } else {
            let total_created = self.created_in_scripts_chain + self.created_in_data_chain;
            if total_created > 0 {
                format!(
                    "Ensured path '{}' ({} created) in {}ms",
                    self.ensured_relative, total_created, self.duration_ms
                )
            } else {
                format!(
                    "Path '{}' already exists in {}ms",
                    self.ensured_relative, self.duration_ms
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_full_output_serialization() {
        let output = SyncFullOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            5,
            3,
            10,
            150,
            vec![],
            vec![],
        );

        assert!(output.ok);
        assert_eq!(output.created_in_scripts, 5);
        assert_eq!(output.created_in_data, 3);
        assert_eq!(output.created_total, 8);
        assert_eq!(output.existing_total, 10);
        assert_eq!(output.duration_ms, 150);

        // Test JSON serialization
        let json = output.to_json().unwrap();
        assert!(json.contains("\"ok\": true"));
        assert!(json.contains("\"created_total\": 8"));
    }

    #[test]
    fn test_sync_full_output_with_errors() {
        let output = SyncFullOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            0,
            0,
            0,
            50,
            vec![],
            vec!["Error 1".to_string(), "Error 2".to_string()],
        );

        assert!(!output.ok);
        assert_eq!(output.errors.len(), 2);

        let human = output.to_human_string();
        assert!(human.contains("failed"));
        assert!(human.contains("Error 1"));
    }

    #[test]
    fn test_sync_full_output_human_string() {
        let output = SyncFullOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            5,
            3,
            10,
            150,
            vec![],
            vec![],
        );

        let human = output.to_human_string();
        assert!(human.contains("18 directories")); // 8 created + 10 existing
        assert!(human.contains("8 created"));
        assert!(human.contains("10 existing"));
        assert!(human.contains("150ms"));
    }

    #[test]
    fn test_ensure_path_output_serialization() {
        let output = EnsurePathOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            PathBuf::from("dir1/dir2"),
            1,
            1,
            50,
            vec![],
            vec![],
        );

        assert!(output.ok);
        assert_eq!(output.ensured_relative, "dir1/dir2");
        assert_eq!(output.created_in_scripts_chain, 1);
        assert_eq!(output.created_in_data_chain, 1);

        // Test JSON serialization
        let json = output.to_json().unwrap();
        assert!(json.contains("\"ok\": true"));
        assert!(json.contains("\"ensured_relative\": \"dir1/dir2\""));
    }

    #[test]
    fn test_ensure_path_output_human_string_created() {
        let output = EnsurePathOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            PathBuf::from("new/path"),
            1,
            1,
            50,
            vec![],
            vec![],
        );

        let human = output.to_human_string();
        assert!(human.contains("Ensured path 'new/path'"));
        assert!(human.contains("2 created"));
    }

    #[test]
    fn test_ensure_path_output_human_string_existed() {
        let output = EnsurePathOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            PathBuf::from("existing/path"),
            0,
            0,
            20,
            vec![],
            vec![],
        );

        let human = output.to_human_string();
        assert!(human.contains("already exists"));
    }

    #[test]
    fn test_exit_code_values() {
        assert_eq!(ExitCode::Success.as_i32(), 0);
        assert_eq!(ExitCode::InvalidArguments.as_i32(), 2);
        assert_eq!(ExitCode::DataPathUnavailable.as_i32(), 3);
        assert_eq!(ExitCode::FilesystemError.as_i32(), 4);
        assert_eq!(ExitCode::UnexpectedError.as_i32(), 5);
    }

    #[test]
    fn test_json_roundtrip_sync_full() {
        let output = SyncFullOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            5,
            3,
            10,
            150,
            vec!["warning".to_string()],
            vec![],
        );

        let json = serde_json::to_string(&output).unwrap();
        let deserialized: SyncFullOutput = serde_json::from_str(&json).unwrap();

        assert_eq!(output.ok, deserialized.ok);
        assert_eq!(output.created_total, deserialized.created_total);
        assert_eq!(output.warnings, deserialized.warnings);
    }

    #[test]
    fn test_json_roundtrip_ensure_path() {
        let output = EnsurePathOutput::new(
            PathBuf::from("/test/scripts"),
            PathBuf::from("/test/data"),
            PathBuf::from("dir1/dir2"),
            1,
            1,
            50,
            vec![],
            vec![],
        );

        let json = serde_json::to_string(&output).unwrap();
        let deserialized: EnsurePathOutput = serde_json::from_str(&json).unwrap();

        assert_eq!(output.ensured_relative, deserialized.ensured_relative);
        assert_eq!(
            output.created_in_scripts_chain,
            deserialized.created_in_scripts_chain
        );
    }
}
