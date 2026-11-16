use crate::walk::WalkResult;
use anyhow::{anyhow, Context, Result};
use rayon::prelude::*;
use std::collections::BTreeSet;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::Duration;

/// Configuration for retry behavior when creating directories.
const MAX_RETRIES: u32 = 3;
const INITIAL_RETRY_DELAY_MS: u64 = 50;
const RETRY_BACKOFF_MULTIPLIER: u64 = 2;

/// Upper bound on parallel mkdir calls, to avoid thrashing the cloud drive.
const MAX_THREADS: usize = 4;

/// Result of a sync operation.
#[derive(Debug, Clone, Default)]
pub struct SyncResult {
    pub created_in_scripts: usize,
    pub created_in_data: usize,
    pub existing_in_scripts: usize,
    pub existing_in_data: usize,
    pub errors: Vec<String>,
}

impl SyncResult {
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

/// True for errors that are worth retrying (EBUSY / ACCESS_DENIED style).
fn is_retryable(e: &std::io::Error) -> bool {
    if e.kind() == ErrorKind::PermissionDenied {
        return true;
    }

    #[cfg(windows)]
    {
        const ERROR_SHARING_VIOLATION: i32 = 32;
        const ERROR_LOCK_VIOLATION: i32 = 33;
        if matches!(
            e.raw_os_error(),
            Some(ERROR_SHARING_VIOLATION) | Some(ERROR_LOCK_VIOLATION)
        ) {
            return true;
        }
    }

    #[cfg(unix)]
    {
        const EBUSY: i32 = 16;
        if e.raw_os_error() == Some(EBUSY) {
            return true;
        }
    }

    false
}

/// Creates a directory (and any missing parents), retrying transient failures
/// with exponential backoff. An existing directory is success; an existing
/// file with the same name is an error.
fn create_dir_with_retry(path: &Path) -> Result<()> {
    let mut delay_ms = INITIAL_RETRY_DELAY_MS;

    for attempt in 0..=MAX_RETRIES {
        match fs::create_dir_all(path) {
            Ok(()) => return Ok(()),
            Err(e) if e.kind() == ErrorKind::AlreadyExists && path.is_dir() => return Ok(()),
            Err(e) if e.kind() == ErrorKind::AlreadyExists => {
                return Err(anyhow!(
                    "Cannot create directory {}: a file with that name already exists",
                    path.display()
                ));
            }
            Err(e) if is_retryable(&e) && attempt < MAX_RETRIES => {
                thread::sleep(Duration::from_millis(delay_ms));
                delay_ms *= RETRY_BACKOFF_MULTIPLIER;
            }
            Err(e) => {
                return Err(anyhow!(
                    "Failed to create directory {} after {} attempt(s): {}",
                    path.display(),
                    attempt + 1,
                    e
                ));
            }
        }
    }

    unreachable!("the final attempt always returns")
}

/// Creates each relative directory under `base`, in parallel.
/// Returns how many were created and the error messages for those that failed.
fn create_missing(base: &Path, missing: &[&PathBuf], side: &str) -> (usize, Vec<String>) {
    // A directory the walk did not report can still be there (for example
    // under a name that differs only in case). Check before anything is
    // created, so that the count does not depend on the creation order.
    let missing: Vec<&PathBuf> = missing
        .iter()
        .copied()
        .filter(|rel| !base.join(rel).is_dir())
        .collect();

    let results: Vec<Result<()>> = missing
        .par_iter()
        .map(|rel| create_dir_with_retry(&base.join(rel)))
        .collect();

    let mut created = 0;
    let mut errors = Vec::new();
    for (rel, result) in missing.iter().zip(results) {
        match result {
            Ok(()) => created += 1,
            Err(e) => errors.push(format!(
                "Failed to create {} in {}: {}",
                rel.display(),
                side,
                e
            )),
        }
    }
    (created, errors)
}

/// True if `rel` is, or lies below, one of the symlinks in `links`.
fn is_behind_link(rel: &Path, links: &BTreeSet<PathBuf>) -> bool {
    !links.is_empty() && rel.ancestors().any(|a| links.contains(a))
}

/// Directories of `from` that `to` lacks, leaving out everything at or below
/// a symlink on the `to` side: creating those would write outside the base.
fn missing_on_side<'a>(from: &'a WalkResult, to: &WalkResult) -> Vec<&'a PathBuf> {
    from.dirs
        .iter()
        .filter(|rel| !to.dirs.contains(*rel) && !is_behind_link(rel, &to.links))
        .collect()
}

/// Mirrors directories between the two bases: every directory that exists on
/// one side only is created on the other. Directories present on both sides
/// are not touched, and nothing is created through a symlink. Both bases must
/// already be normalized.
pub fn sync_directories(
    scripts_base: &Path,
    data_base: &Path,
    scripts: &WalkResult,
    data: &WalkResult,
) -> Result<SyncResult> {
    let missing_in_scripts = missing_on_side(data, scripts);
    let missing_in_data = missing_on_side(scripts, data);

    let mut result = SyncResult {
        existing_in_scripts: scripts.dirs.len(),
        existing_in_data: data.dirs.len(),
        ..SyncResult::default()
    };

    if missing_in_scripts.is_empty() && missing_in_data.is_empty() {
        return Ok(result);
    }

    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(MAX_THREADS)
        .build()
        .context("Failed to create thread pool")?;

    let ((created_s, errors_s), (created_d, errors_d)) = pool.install(|| {
        (
            create_missing(scripts_base, &missing_in_scripts, "scripts"),
            create_missing(data_base, &missing_in_data, "data"),
        )
    });

    result.created_in_scripts = created_s;
    result.created_in_data = created_d;
    result.errors.extend(errors_s);
    result.errors.extend(errors_d);

    Ok(result)
}

/// Counts how many directories of the chain `base/rel` do not exist yet.
fn count_missing_in_chain(base: &Path, rel: &Path) -> usize {
    let mut current = base.to_path_buf();
    let mut missing = 0;
    for component in rel.components() {
        current.push(component);
        if missing > 0 || !current.is_dir() {
            missing += 1;
        }
    }
    missing
}

/// Ensures a single relative path exists under both bases.
/// Returns the number of directories created in each chain (scripts, data).
/// Both bases must already be normalized and `rel_path` validated.
pub fn ensure_single_path(
    scripts_base: &Path,
    data_base: &Path,
    rel_path: &Path,
) -> Result<(usize, usize)> {
    let scripts_missing = count_missing_in_chain(scripts_base, rel_path);
    let data_missing = count_missing_in_chain(data_base, rel_path);

    create_dir_with_retry(&scripts_base.join(rel_path))?;
    create_dir_with_retry(&data_base.join(rel_path))?;

    Ok((scripts_missing, data_missing))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn bases() -> (TempDir, PathBuf, PathBuf) {
        let temp_dir = TempDir::new().unwrap();
        let scripts = temp_dir.path().join("scripts");
        let data = temp_dir.path().join("data");
        fs::create_dir(&scripts).unwrap();
        fs::create_dir(&data).unwrap();
        (temp_dir, scripts, data)
    }

    fn set(paths: &[&str]) -> WalkResult {
        WalkResult {
            dirs: paths.iter().map(PathBuf::from).collect(),
            ..WalkResult::default()
        }
    }

    #[test]
    fn test_create_dir_new_and_existing() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("new_dir");

        create_dir_with_retry(&path).unwrap();
        assert!(path.is_dir());
        // Existing directory is success.
        create_dir_with_retry(&path).unwrap();
    }

    #[test]
    fn test_create_dir_rejects_file_clash() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("results");
        fs::write(&path, "not a directory").unwrap();

        let err = create_dir_with_retry(&path).unwrap_err();
        assert!(err.to_string().contains("a file with that name"));
    }

    #[test]
    fn test_sync_nothing_to_do() {
        let (_tmp, scripts, data) = bases();
        let result = sync_directories(&scripts, &data, &set(&[]), &set(&[])).unwrap();

        assert_eq!(result.created_total(), 0);
        assert_eq!(result.existing_total(), 0);
        assert!(result.is_ok());
    }

    #[test]
    fn test_sync_creates_only_missing() {
        let (_tmp, scripts, data) = bases();
        fs::create_dir_all(scripts.join("dir1/subdir")).unwrap();
        fs::create_dir_all(scripts.join("shared")).unwrap();
        fs::create_dir_all(data.join("shared")).unwrap();
        fs::create_dir_all(data.join("dir2")).unwrap();

        let scripts_dirs = set(&["dir1", "dir1/subdir", "shared"]);
        let data_dirs = set(&["shared", "dir2"]);
        let result = sync_directories(&scripts, &data, &scripts_dirs, &data_dirs).unwrap();

        assert!(result.is_ok());
        assert_eq!(result.created_in_scripts, 1);
        assert_eq!(result.created_in_data, 2);
        assert_eq!(result.existing_total(), 5);
        assert!(scripts.join("dir2").is_dir());
        assert!(data.join("dir1/subdir").is_dir());
    }

    #[test]
    fn test_sync_counts_are_deterministic() {
        let dirs = set(&["a", "a/b", "a/b/c", "a/b/c/d", "e", "e/f", "e/f/g"]);
        for _ in 0..20 {
            let (_tmp, scripts, data) = bases();
            fs::create_dir_all(scripts.join("a/b/c/d")).unwrap();
            fs::create_dir_all(scripts.join("e/f/g")).unwrap();

            let result = sync_directories(&scripts, &data, &dirs, &set(&[])).unwrap();
            assert_eq!(result.created_in_data, 7);
            assert_eq!(result.created_in_scripts, 0);
        }
    }

    #[test]
    fn test_sync_reports_file_clash() {
        let (_tmp, scripts, data) = bases();
        fs::create_dir_all(scripts.join("results")).unwrap();
        fs::create_dir_all(scripts.join("other")).unwrap();
        fs::write(data.join("results"), "a file").unwrap();

        let result =
            sync_directories(&scripts, &data, &set(&["results", "other"]), &set(&[])).unwrap();

        assert!(!result.is_ok());
        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.created_in_data, 1);
        assert!(data.join("other").is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn test_sync_never_creates_through_a_symlink() {
        use std::os::unix::fs::symlink;

        let (tmp, scripts, data) = bases();
        let outside = tmp.path().join("outside");
        fs::create_dir_all(outside.join("present")).unwrap();
        fs::create_dir_all(scripts.join("lib")).unwrap();
        symlink(&outside, scripts.join("lib/pkg")).unwrap();
        fs::create_dir_all(data.join("lib/pkg/present")).unwrap();
        fs::create_dir_all(data.join("lib/pkg/absent")).unwrap();

        for _ in 0..2 {
            let scripts_walk = crate::walk::collect_directories(&scripts);
            let data_walk = crate::walk::collect_directories(&data);
            let result = sync_directories(&scripts, &data, &scripts_walk, &data_walk).unwrap();

            assert!(result.is_ok());
            assert_eq!(result.created_total(), 0);
            assert!(!outside.join("absent").exists());
        }
    }

    #[test]
    fn test_sync_does_not_count_existing_as_created() {
        let (_tmp, scripts, data) = bases();
        fs::create_dir_all(scripts.join("present")).unwrap();

        // The walk of the scripts side missed a directory that is there.
        let result = sync_directories(&scripts, &data, &set(&[]), &set(&["present"])).unwrap();
        assert!(result.is_ok());
        assert_eq!(result.created_total(), 0);
    }

    #[test]
    fn test_sync_spaces_and_unicode() {
        let (_tmp, scripts, data) = bases();
        let unicode_name = "folder_\u{4E2D}\u{6587}";
        let dirs = set(&["dir with spaces", unicode_name]);

        let result = sync_directories(&scripts, &data, &set(&[]), &dirs).unwrap();

        assert!(result.is_ok());
        assert!(scripts.join("dir with spaces").is_dir());
        assert!(scripts.join(unicode_name).is_dir());
    }

    #[test]
    fn test_ensure_single_path_counts_chain() {
        let (_tmp, scripts, data) = bases();
        fs::create_dir_all(scripts.join("deep")).unwrap();

        let rel = PathBuf::from("deep/nested/path");
        let (scripts_count, data_count) = ensure_single_path(&scripts, &data, &rel).unwrap();

        assert_eq!(scripts_count, 2);
        assert_eq!(data_count, 3);
        assert!(scripts.join(&rel).is_dir());
        assert!(data.join(&rel).is_dir());

        // Second call finds everything in place.
        assert_eq!(ensure_single_path(&scripts, &data, &rel).unwrap(), (0, 0));
    }

    #[test]
    fn test_ensure_single_path_empty_relative() {
        let (_tmp, scripts, data) = bases();
        assert_eq!(
            ensure_single_path(&scripts, &data, Path::new("")).unwrap(),
            (0, 0)
        );
    }
}
