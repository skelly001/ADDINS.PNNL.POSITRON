use crate::paths;
use anyhow::{anyhow, Context, Result};
use rayon::prelude::*;
use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

/// Configuration for retry behavior when creating directories.
const MAX_RETRIES: u32 = 3;
const INITIAL_RETRY_DELAY_MS: u64 = 50;
const RETRY_BACKOFF_MULTIPLIER: u32 = 2;

/// Result of a sync operation.
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub created_in_scripts: usize,
    pub created_in_data: usize,
    pub existing_in_scripts: usize,
    pub existing_in_data: usize,
    pub warnings: Vec<String>,
    pub errors: Vec<String>,
}

impl SyncResult {
    pub fn new() -> Self {
        Self {
            created_in_scripts: 0,
            created_in_data: 0,
            existing_in_scripts: 0,
            existing_in_data: 0,
            warnings: Vec::new(),
            errors: Vec::new(),
        }
    }

    pub fn created_total(&self) -> usize {
        self.created_in_scripts + self.created_in_data
    }

    pub fn existing_total(&self) -> usize {
        self.existing_in_scripts + self.existing_in_data
    }

    pub fn is_ok(&self) -> bool {
        self.errors.is_empty()
    }
}

impl Default for SyncResult {
    fn default() -> Self {
        Self::new()
    }
}

/// Creates a directory with retry logic for transient failures.
/// Handles EBUSY and ACCESS_DENIED errors with exponential backoff.
/// Returns Ok(true) if the directory was newly created, Ok(false) if it already existed.
fn create_dir_with_retry<P: AsRef<Path>>(path: P) -> Result<bool> {
    let path = path.as_ref();
    let mut delay_ms = INITIAL_RETRY_DELAY_MS;

    // Check if directory already exists before attempting creation
    let existed_before = path.exists() && path.is_dir();

    for attempt in 0..=MAX_RETRIES {
        match fs::create_dir_all(path) {
            Ok(_) => {
                // Successfully created (or already existed)
                // Return whether it was newly created
                return Ok(!existed_before);
            }
            Err(e) => {
                // Check if this is a retryable error
                let is_retryable = match e.kind() {
                    std::io::ErrorKind::PermissionDenied => true,
                    std::io::ErrorKind::AlreadyExists => {
                        // Already exists is actually success
                        return Ok(false);
                    }
                    // On Windows, EBUSY might manifest as other error types
                    _ => {
                        #[cfg(windows)]
                        {
                            // Check for Windows-specific busy/sharing violation errors
                            if let Some(code) = e.raw_os_error() {
                                const ERROR_SHARING_VIOLATION: i32 = 32;
                                const ERROR_LOCK_VIOLATION: i32 = 33;
                                code == ERROR_SHARING_VIOLATION || code == ERROR_LOCK_VIOLATION
                            } else {
                                false
                            }
                        }
                        #[cfg(not(windows))]
                        {
                            false
                        }
                    }
                };

                if is_retryable && attempt < MAX_RETRIES {
                    // Wait and retry
                    thread::sleep(Duration::from_millis(delay_ms));
                    delay_ms *= RETRY_BACKOFF_MULTIPLIER as u64;
                } else {
                    // Not retryable or out of retries
                    return Err(anyhow!(
                        "Failed to create directory {} after {} attempts: {}",
                        path.display(),
                        attempt + 1,
                        e
                    ));
                }
            }
        }
    }

    Err(anyhow!(
        "Failed to create directory {} after {} retries",
        path.display(),
        MAX_RETRIES
    ))
}

/// Synchronizes a set of relative directories to both scripts and data paths.
/// Creates missing directories in parallel with moderate concurrency.
pub fn sync_directories<P: AsRef<Path>, Q: AsRef<Path>>(
    scripts_path: P,
    data_path: Q,
    union_dirs: &BTreeSet<PathBuf>,
) -> Result<SyncResult> {
    let scripts_path = scripts_path.as_ref();
    let data_path = data_path.as_ref();

    // Normalize base paths
    let scripts_normalized = paths::normalize_path(scripts_path)?;
    let data_normalized = paths::normalize_path(data_path)?;

    // Convert to vector for parallel processing
    let dirs_vec: Vec<&PathBuf> = union_dirs.iter().collect();

    // Use rayon with moderate concurrency to avoid thrashing OneDrive
    // Default rayon thread pool is usually num_cpus, we'll limit it
    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(4.min(rayon::current_num_threads()))
        .build()
        .context("Failed to create thread pool")?;

    // Process directories in parallel
    let results: Vec<(PathBuf, Result<bool>, Result<bool>)> = pool.install(|| {
        dirs_vec
            .par_iter()
            .map(|rel_path| {
                let scripts_target = scripts_normalized.join(rel_path);
                let data_target = data_normalized.join(rel_path);

                let scripts_result = create_dir_with_retry(&scripts_target);
                let data_result = create_dir_with_retry(&data_target);

                ((*rel_path).clone(), scripts_result, data_result)
            })
            .collect()
    });

    // Collect results
    let mut sync_result = SyncResult::new();

    for (rel_path, scripts_res, data_res) in results {
        match scripts_res {
            Ok(created) => {
                if created {
                    sync_result.created_in_scripts += 1;
                } else {
                    sync_result.existing_in_scripts += 1;
                }
            }
            Err(e) => {
                sync_result.errors.push(format!(
                    "Failed to create {} in scripts: {}",
                    rel_path.display(),
                    e
                ));
            }
        }

        match data_res {
            Ok(created) => {
                if created {
                    sync_result.created_in_data += 1;
                } else {
                    sync_result.existing_in_data += 1;
                }
            }
            Err(e) => {
                sync_result.errors.push(format!(
                    "Failed to create {} in data: {}",
                    rel_path.display(),
                    e
                ));
            }
        }
    }

    Ok(sync_result)
}

/// Ensures a single relative path exists in both scripts and data directories.
/// This is used by the ensure-path command.
pub fn ensure_single_path<P: AsRef<Path>, Q: AsRef<Path>, R: AsRef<Path>>(
    scripts_path: P,
    data_path: Q,
    rel_path: R,
) -> Result<(usize, usize)> {
    let scripts_path = scripts_path.as_ref();
    let data_path = data_path.as_ref();
    let rel_path = rel_path.as_ref();

    // Validate relative path
    paths::validate_relative_path(rel_path)?;

    // Normalize base paths
    let scripts_normalized = paths::normalize_path(scripts_path)?;
    let data_normalized = paths::normalize_path(data_path)?;

    // Build full paths
    let scripts_target = scripts_normalized.join(rel_path);
    let data_target = data_normalized.join(rel_path);

    // Create directories (all parent directories in the chain)
    let scripts_created = create_dir_with_retry(&scripts_target)?;
    let data_created = create_dir_with_retry(&data_target)?;

    // Count how many were created in the chain
    // For simplicity, we return 1 if created, 0 if existed
    let scripts_count = if scripts_created { 1 } else { 0 };
    let data_count = if data_created { 1 } else { 0 };

    Ok((scripts_count, data_count))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeSet;
    use tempfile::TempDir;

    #[test]
    fn test_create_dir_with_retry_success() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("new_dir");

        let created = create_dir_with_retry(&test_path).unwrap();
        assert!(created); // Should be newly created
        assert!(test_path.exists());
    }

    #[test]
    fn test_create_dir_with_retry_already_exists() {
        let temp_dir = TempDir::new().unwrap();
        let test_path = temp_dir.path().join("existing_dir");

        fs::create_dir(&test_path).unwrap();

        let created = create_dir_with_retry(&test_path).unwrap();
        assert!(!created); // Should already exist
    }

    #[test]
    fn test_sync_directories_empty() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let union = BTreeSet::new();
        let result = sync_directories(&scripts, &data, &union).unwrap();

        assert_eq!(result.created_total(), 0);
        assert_eq!(result.existing_total(), 0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_sync_directories_creates_missing() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let mut union = BTreeSet::new();
        union.insert(PathBuf::from("dir1"));
        union.insert(PathBuf::from("dir1/subdir"));
        union.insert(PathBuf::from("dir2"));

        let result = sync_directories(&scripts, &data, &union).unwrap();

        assert!(result.is_ok());
        assert_eq!(result.created_total(), 6); // 3 dirs × 2 locations

        // Verify directories exist
        assert!(scripts.join("dir1").exists());
        assert!(scripts.join("dir1/subdir").exists());
        assert!(scripts.join("dir2").exists());
        assert!(data.join("dir1").exists());
        assert!(data.join("dir1/subdir").exists());
        assert!(data.join("dir2").exists());
    }

    #[test]
    fn test_sync_directories_idempotent() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let mut union = BTreeSet::new();
        union.insert(PathBuf::from("dir1"));

        // First sync
        let result1 = sync_directories(&scripts, &data, &union).unwrap();
        assert_eq!(result1.created_total(), 2);
        assert_eq!(result1.existing_total(), 0);

        // Second sync - should find existing
        let result2 = sync_directories(&scripts, &data, &union).unwrap();
        assert_eq!(result2.created_total(), 0);
        assert_eq!(result2.existing_total(), 2);
    }

    #[test]
    fn test_ensure_single_path() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let rel_path = PathBuf::from("deep/nested/path");
        let (scripts_count, data_count) = ensure_single_path(&scripts, &data, &rel_path).unwrap();

        assert_eq!(scripts_count, 1);
        assert_eq!(data_count, 1);

        // Verify paths exist
        assert!(scripts.join(&rel_path).exists());
        assert!(data.join(&rel_path).exists());
    }

    #[test]
    fn test_ensure_single_path_rejects_traversal() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let bad_path = PathBuf::from("../escape");
        let result = ensure_single_path(&scripts, &data, &bad_path);

        assert!(result.is_err());
    }

    #[test]
    fn test_sync_with_spaces() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let mut union = BTreeSet::new();
        union.insert(PathBuf::from("dir with spaces"));

        let result = sync_directories(&scripts, &data, &union).unwrap();

        assert!(result.is_ok());
        assert!(scripts.join("dir with spaces").exists());
        assert!(data.join("dir with spaces").exists());
    }

    #[test]
    fn test_sync_with_unicode() {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");

        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();

        let unicode_name = "folder_\u{4E2D}\u{6587}";
        let mut union = BTreeSet::new();
        union.insert(PathBuf::from(unicode_name));

        let result = sync_directories(&scripts, &data, &union).unwrap();

        assert!(result.is_ok());
        assert!(scripts.join(unicode_name).exists());
        assert!(data.join(unicode_name).exists());
    }
}
