use crate::filter::is_excluded_name;
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Directories found under one base, plus any problems met while walking.
#[derive(Debug, Default)]
pub struct WalkResult {
    /// Relative paths of every non-excluded directory under the base.
    pub dirs: BTreeSet<PathBuf>,
    /// Relative paths of symlinks met on the way. Nothing is ever created at
    /// or below one of these, because that would write outside the base.
    pub links: BTreeSet<PathBuf>,
    /// Sub-trees that could not be read. They are skipped, not fatal.
    pub warnings: Vec<String>,
}

/// Walks a directory tree and collects all directory paths relative to `base`.
///
/// - Only real directories are collected. Files, symlinks and Windows
///   junctions are skipped and never descended into.
/// - Excluded directories (see `filter`) are pruned together with their contents.
/// - A sub-tree that cannot be read becomes a warning; the walk continues.
///
/// `base` must already be normalized.
pub fn collect_directories(base: &Path) -> WalkResult {
    let mut result = WalkResult::default();

    let walker = WalkDir::new(base)
        .follow_links(false)
        .min_depth(1)
        .into_iter()
        .filter_entry(|e| {
            (e.file_type().is_dir() || e.path_is_symlink()) && !is_excluded_name(e.file_name())
        });

    for entry in walker {
        match entry {
            Ok(entry) => {
                if let Ok(rel) = entry.path().strip_prefix(base) {
                    if entry.path_is_symlink() {
                        result.links.insert(rel.to_path_buf());
                    } else {
                        result.dirs.insert(rel.to_path_buf());
                    }
                }
            }
            Err(e) => {
                let location = e
                    .path()
                    .map(|p| p.display().to_string())
                    .unwrap_or_else(|| base.display().to_string());
                result
                    .warnings
                    .push(format!("Skipped unreadable path {}: {}", location, e));
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_collect_directories_basic() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        fs::create_dir_all(base.join("dir1/subdir1")).unwrap();
        fs::create_dir_all(base.join("dir1/subdir2")).unwrap();
        fs::create_dir_all(base.join("dir2")).unwrap();
        fs::create_dir_all(base.join("dir3/nested/deep")).unwrap();
        fs::write(base.join("file.txt"), "content").unwrap();
        fs::write(base.join("dir1/file.R"), "R script").unwrap();
        fs::create_dir_all(base.join(".git/objects")).unwrap();
        fs::create_dir_all(base.join(".vscode")).unwrap();
        fs::create_dir_all(base.join("dir1/.hidden")).unwrap();
        fs::create_dir_all(base.join("dir2/tmp/inner")).unwrap();

        let result = collect_directories(base);
        let expected: BTreeSet<PathBuf> = [
            "dir1",
            "dir1/subdir1",
            "dir1/subdir2",
            "dir2",
            "dir3",
            "dir3/nested",
            "dir3/nested/deep",
        ]
        .iter()
        .map(PathBuf::from)
        .collect();

        assert_eq!(result.dirs, expected);
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn test_collect_directories_spaces_and_unicode() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();
        let unicode_name = "folder_\u{4E2D}\u{6587}";

        fs::create_dir_all(base.join("dir with spaces/nested")).unwrap();
        fs::create_dir_all(base.join(unicode_name)).unwrap();

        let result = collect_directories(base);
        assert!(result.dirs.contains(Path::new("dir with spaces")));
        assert!(result.dirs.contains(Path::new("dir with spaces/nested")));
        assert!(result.dirs.contains(Path::new(unicode_name)));
    }

    #[cfg(unix)]
    #[test]
    fn test_symlinks_are_skipped() {
        use std::os::unix::fs::symlink;

        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();
        fs::create_dir_all(base.join("regular/inner")).unwrap();
        symlink(base.join("regular"), base.join("link")).unwrap();

        let result = collect_directories(base);
        assert!(result.dirs.contains(Path::new("regular")));
        assert!(result.dirs.contains(Path::new("regular/inner")));
        assert!(!result.dirs.contains(Path::new("link")));
        assert!(!result.dirs.contains(Path::new("link/inner")));
        assert!(result.links.contains(Path::new("link")));
        assert_eq!(result.links.len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn test_unreadable_subdir_is_a_warning() {
        use std::os::unix::fs::PermissionsExt;

        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();
        let locked = base.join("locked");
        fs::create_dir_all(locked.join("inner")).unwrap();
        fs::create_dir_all(base.join("open")).unwrap();
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o000)).unwrap();

        let result = collect_directories(base);

        // Restore so the temp dir can be cleaned up.
        fs::set_permissions(&locked, fs::Permissions::from_mode(0o755)).unwrap();

        assert!(result.dirs.contains(Path::new("open")));
        assert!(result.dirs.contains(Path::new("locked")));
        // Root can read anything, in which case there is nothing to warn about.
        if !result.dirs.contains(Path::new("locked/inner")) {
            assert_eq!(result.warnings.len(), 1);
        }
    }

    #[test]
    fn test_empty_directory() {
        let temp_dir = TempDir::new().unwrap();
        assert!(collect_directories(temp_dir.path()).dirs.is_empty());
    }
}
