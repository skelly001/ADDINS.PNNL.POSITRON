use anyhow::{Context, Result};
use jwalk::WalkDir;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::filter::PathFilter;
use crate::paths::{normalize_path, relativize_path};

/// Walk a directory tree and return a set of all directory paths (relative to root)
/// Only directories are returned, files are ignored
/// Symlinks are not followed (treated as files)
pub fn walk_directories(root: &Path, filter: &PathFilter) -> Result<HashSet<PathBuf>> {
    let root_normalized = normalize_path(root)?;

    // Ensure root exists
    if !root_normalized.exists() {
        log::warn!("Root path does not exist: {}", root_normalized.display());
        return Ok(HashSet::new());
    }

    if !root_normalized.is_dir() {
        anyhow::bail!("Root path is not a directory: {}", root_normalized.display());
    }

    let mut directories = HashSet::new();

    // Use jwalk for parallel directory traversal
    for entry in WalkDir::new(&root_normalized)
        .follow_links(false) // Don't follow symlinks
        .skip_hidden(false) // We handle filtering ourselves
    {
        let entry = entry.with_context(|| {
            format!(
                "Failed to read directory entry in {}",
                root_normalized.display()
            )
        })?;

        let path = entry.path();

        // Only process directories
        if !path.is_dir() {
            continue;
        }

        // Skip the root itself
        if path == root_normalized {
            continue;
        }

        // Compute relative path
        let relative_path = relativize_path(&root_normalized, &path)?;

        // Check if this path should be excluded
        if filter.should_exclude(&relative_path) {
            log::debug!("Excluding directory: {}", relative_path.display());
            continue;
        }

        directories.insert(relative_path);
    }

    log::info!(
        "Found {} directories in {}",
        directories.len(),
        root_normalized.display()
    );

    Ok(directories)
}

/// Compare two sets of directories and return the differences
pub struct DirectoryDiff {
    /// Directories in left but not in right
    pub missing_in_right: HashSet<PathBuf>,
    /// Directories in right but not in left
    pub missing_in_left: HashSet<PathBuf>,
}

impl DirectoryDiff {
    /// Compute the difference between two directory sets
    pub fn compute(left: &HashSet<PathBuf>, right: &HashSet<PathBuf>) -> Self {
        let missing_in_right: HashSet<PathBuf> = left.difference(right).cloned().collect();
        let missing_in_left: HashSet<PathBuf> = right.difference(left).cloned().collect();

        Self {
            missing_in_right,
            missing_in_left,
        }
    }

    /// Check if there are any differences
    pub fn has_differences(&self) -> bool {
        !self.missing_in_right.is_empty() || !self.missing_in_left.is_empty()
    }

    /// Get total number of differences
    pub fn total_differences(&self) -> usize {
        self.missing_in_right.len() + self.missing_in_left.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_structure(root: &Path) -> Result<()> {
        fs::create_dir_all(root.join("dir1"))?;
        fs::create_dir_all(root.join("dir2/subdir"))?;
        fs::create_dir_all(root.join("dir3/sub1/sub2"))?;

        // Create some files (should be ignored)
        fs::write(root.join("file.txt"), "content")?;
        fs::write(root.join("dir1/file.txt"), "content")?;

        Ok(())
    }

    #[test]
    fn test_walk_directories_basic() -> Result<()> {
        let temp = TempDir::new()?;
        create_test_structure(temp.path())?;

        let filter = PathFilter::with_defaults()?;
        let dirs = walk_directories(temp.path(), &filter)?;

        // Should find all directories but not files
        assert!(dirs.contains(&PathBuf::from("dir1")));
        assert!(dirs.contains(&PathBuf::from("dir2")));
        assert!(dirs.contains(&PathBuf::from("dir2/subdir")));
        assert!(dirs.contains(&PathBuf::from("dir3")));
        assert!(dirs.contains(&PathBuf::from("dir3/sub1")));
        assert!(dirs.contains(&PathBuf::from("dir3/sub1/sub2")));

        Ok(())
    }

    #[test]
    fn test_walk_directories_with_filter() -> Result<()> {
        let temp = TempDir::new()?;
        fs::create_dir_all(temp.path().join("normal"))?;
        fs::create_dir_all(temp.path().join(".git"))?;
        fs::create_dir_all(temp.path().join(".git/objects"))?;
        fs::create_dir_all(temp.path().join("data/.Rproj.user"))?;

        let filter = PathFilter::with_defaults()?;
        let dirs = walk_directories(temp.path(), &filter)?;

        // Should include normal directories
        assert!(dirs.contains(&PathBuf::from("normal")));
        assert!(dirs.contains(&PathBuf::from("data")));

        // Should exclude .git and .Rproj.user
        assert!(!dirs.contains(&PathBuf::from(".git")));
        assert!(!dirs.contains(&PathBuf::from(".git/objects")));
        assert!(!dirs.contains(&PathBuf::from("data/.Rproj.user")));

        Ok(())
    }

    #[test]
    fn test_walk_nonexistent_directory() -> Result<()> {
        let temp = TempDir::new()?;
        let nonexistent = temp.path().join("does-not-exist");

        let filter = PathFilter::with_defaults()?;
        let dirs = walk_directories(&nonexistent, &filter)?;

        // Should return empty set for nonexistent directory
        assert!(dirs.is_empty());

        Ok(())
    }

    #[test]
    fn test_directory_diff_compute() {
        let mut left = HashSet::new();
        left.insert(PathBuf::from("common1"));
        left.insert(PathBuf::from("common2"));
        left.insert(PathBuf::from("only_left"));

        let mut right = HashSet::new();
        right.insert(PathBuf::from("common1"));
        right.insert(PathBuf::from("common2"));
        right.insert(PathBuf::from("only_right"));

        let diff = DirectoryDiff::compute(&left, &right);

        assert_eq!(diff.missing_in_right.len(), 1);
        assert!(diff.missing_in_right.contains(&PathBuf::from("only_left")));

        assert_eq!(diff.missing_in_left.len(), 1);
        assert!(diff.missing_in_left.contains(&PathBuf::from("only_right")));

        assert!(diff.has_differences());
        assert_eq!(diff.total_differences(), 2);
    }

    #[test]
    fn test_directory_diff_no_differences() {
        let mut set = HashSet::new();
        set.insert(PathBuf::from("dir1"));
        set.insert(PathBuf::from("dir2"));

        let diff = DirectoryDiff::compute(&set, &set);

        assert!(!diff.has_differences());
        assert_eq!(diff.total_differences(), 0);
    }
}
