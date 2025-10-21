use crate::filter::PathFilter;
use crate::paths;
use anyhow::{Context, Result};
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Walks a directory tree and collects all directory paths (excluding files).
/// Returns a sorted set of relative paths from the base directory.
///
/// This function:
/// - Only collects directories, not files
/// - Skips symlinks to avoid infinite loops
/// - Applies the provided filter to exclude unwanted directories
/// - Returns paths relative to the base directory
pub fn collect_directories<P: AsRef<Path>>(
    base: P,
    filter: &PathFilter,
) -> Result<BTreeSet<PathBuf>> {
    let base = base.as_ref();
    let base_normalized = paths::normalize_path(base)
        .with_context(|| format!("Failed to normalize base path: {}", base.display()))?;

    let mut dirs = BTreeSet::new();

    for entry in WalkDir::new(&base_normalized)
        .follow_links(false) // Never follow symlinks per spec
        .into_iter()
        .filter_entry(|e| {
            // Skip if it's a symlink
            if PathFilter::is_symlink(e.path()) {
                return false;
            }

            // Skip if the filter says to exclude
            // Compute relative path for filtering
            if let Ok(rel) = paths::relative_path(&base_normalized, e.path()) {
                if filter.should_exclude(&rel) {
                    return false;
                }
            }

            true
        })
    {
        let entry = entry.with_context(|| "Error walking directory")?;

        // Only process directories, skip files
        if !entry.file_type().is_dir() {
            continue;
        }

        let entry_path = entry.path();

        // Skip the base directory itself
        if entry_path == base_normalized {
            continue;
        }

        // Compute relative path
        match paths::relative_path(&base_normalized, entry_path) {
            Ok(rel_path) => {
                // Double-check exclusion (defensive)
                if !filter.should_exclude(&rel_path) {
                    dirs.insert(rel_path);
                }
            }
            Err(_) => {
                // Skip paths we can't compute relative paths for
                continue;
            }
        }
    }

    Ok(dirs)
}

/// Collects directories from both scripts and data paths and returns their union.
/// This is the core operation for sync-full.
pub fn collect_union<P: AsRef<Path>, Q: AsRef<Path>>(
    scripts_path: P,
    data_path: Q,
    filter: &PathFilter,
) -> Result<(BTreeSet<PathBuf>, BTreeSet<PathBuf>, BTreeSet<PathBuf>)> {
    let scripts_dirs = collect_directories(&scripts_path, filter)
        .with_context(|| format!("Failed to walk scripts path: {}", scripts_path.as_ref().display()))?;

    let data_dirs = collect_directories(&data_path, filter)
        .with_context(|| format!("Failed to walk data path: {}", data_path.as_ref().display()))?;

    // Compute union
    let union: BTreeSet<PathBuf> = scripts_dirs.union(&data_dirs).cloned().collect();

    Ok((scripts_dirs, data_dirs, union))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_tree(base: &Path) -> Result<()> {
        // Create a test directory structure
        fs::create_dir_all(base.join("dir1/subdir1"))?;
        fs::create_dir_all(base.join("dir1/subdir2"))?;
        fs::create_dir_all(base.join("dir2"))?;
        fs::create_dir_all(base.join("dir3/nested/deep"))?;

        // Create some files (should be ignored)
        fs::write(base.join("file.txt"), "content")?;
        fs::write(base.join("dir1/file.R"), "R script")?;

        // Create directories that should be filtered
        fs::create_dir_all(base.join(".git/objects"))?;
        fs::create_dir_all(base.join(".vscode"))?;
        fs::create_dir_all(base.join("dir1/.hidden"))?;

        Ok(())
    }

    #[test]
    fn test_collect_directories_basic() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        create_test_tree(base).unwrap();

        let filter = PathFilter::new().unwrap();
        let dirs = collect_directories(base, &filter).unwrap();

        // Should contain the non-filtered directories
        assert!(dirs.contains(Path::new("dir1")));
        assert!(dirs.contains(Path::new("dir1/subdir1")));
        assert!(dirs.contains(Path::new("dir1/subdir2")));
        assert!(dirs.contains(Path::new("dir2")));
        assert!(dirs.contains(Path::new("dir3")));
        assert!(dirs.contains(Path::new("dir3/nested")));
        assert!(dirs.contains(Path::new("dir3/nested/deep")));

        // Should NOT contain filtered directories
        assert!(!dirs.contains(Path::new(".git")));
        assert!(!dirs.contains(Path::new(".git/objects")));
        assert!(!dirs.contains(Path::new(".vscode")));
        assert!(!dirs.contains(Path::new("dir1/.hidden")));
    }

    #[test]
    fn test_collect_directories_with_spaces() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        fs::create_dir_all(base.join("dir with spaces")).unwrap();
        fs::create_dir_all(base.join("dir with spaces/nested")).unwrap();

        let filter = PathFilter::new().unwrap();
        let dirs = collect_directories(base, &filter).unwrap();

        assert!(dirs.contains(Path::new("dir with spaces")));
        assert!(dirs.contains(Path::new("dir with spaces/nested")));
    }

    #[test]
    fn test_collect_directories_with_unicode() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        let unicode_name = "folder_\u{4E2D}\u{6587}"; // "folder_中文"
        fs::create_dir_all(base.join(unicode_name)).unwrap();

        let filter = PathFilter::new().unwrap();
        let dirs = collect_directories(base, &filter).unwrap();

        assert!(dirs.contains(Path::new(unicode_name)));
    }

    #[test]
    fn test_collect_union() {
        let temp_dir = TempDir::new().unwrap();
        let scripts_base = temp_dir.path().join("scripts");
        let data_base = temp_dir.path().join("data");

        fs::create_dir_all(&scripts_base).unwrap();
        fs::create_dir_all(&data_base).unwrap();

        // Create different directory structures
        fs::create_dir_all(scripts_base.join("scripts_only")).unwrap();
        fs::create_dir_all(scripts_base.join("shared")).unwrap();
        fs::create_dir_all(data_base.join("data_only")).unwrap();
        fs::create_dir_all(data_base.join("shared")).unwrap();

        let filter = PathFilter::new().unwrap();
        let (scripts_dirs, data_dirs, union) =
            collect_union(&scripts_base, &data_base, &filter).unwrap();

        // Check scripts_dirs
        assert!(scripts_dirs.contains(Path::new("scripts_only")));
        assert!(scripts_dirs.contains(Path::new("shared")));
        assert!(!scripts_dirs.contains(Path::new("data_only")));

        // Check data_dirs
        assert!(data_dirs.contains(Path::new("data_only")));
        assert!(data_dirs.contains(Path::new("shared")));
        assert!(!data_dirs.contains(Path::new("scripts_only")));

        // Check union
        assert!(union.contains(Path::new("scripts_only")));
        assert!(union.contains(Path::new("data_only")));
        assert!(union.contains(Path::new("shared")));
        assert_eq!(union.len(), 3);
    }

    #[test]
    fn test_symlink_skipping() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        // Create a regular directory
        fs::create_dir_all(base.join("regular")).unwrap();

        // Create a symlink (Unix only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let target = base.join("regular");
            let link = base.join("link");
            symlink(&target, &link).unwrap();

            let filter = PathFilter::new().unwrap();
            let dirs = collect_directories(base, &filter).unwrap();

            // Should contain regular but not link
            assert!(dirs.contains(Path::new("regular")));
            assert!(!dirs.contains(Path::new("link")));
        }
    }

    #[test]
    fn test_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        let filter = PathFilter::new().unwrap();
        let dirs = collect_directories(base, &filter).unwrap();

        // Empty directory should return empty set
        assert!(dirs.is_empty());
    }
}
