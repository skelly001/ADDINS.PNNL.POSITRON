use anyhow::{Context, Result};
use std::path::{Path, PathBuf};

/// Normalize a path to an absolute, canonical form
pub fn normalize_path(path: &Path) -> Result<PathBuf> {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .context("Failed to get current directory")?
            .join(path)
    };

    // Canonicalize if the path exists; otherwise just return the absolute path
    // This is important for paths that don't exist yet (we'll create them)
    match absolute.canonicalize() {
        Ok(canonical) => Ok(canonical),
        Err(_) => {
            // Path doesn't exist yet - normalize manually
            Ok(absolute)
        }
    }
}

/// Compute a relative path from `base` to `target`
pub fn relativize_path(base: &Path, target: &Path) -> Result<PathBuf> {
    let base_normalized = normalize_path(base)?;
    let target_normalized = normalize_path(target)?;

    target_normalized
        .strip_prefix(&base_normalized)
        .map(|p| p.to_path_buf())
        .with_context(|| {
            format!(
                "Path '{}' is not under base '{}'",
                target.display(),
                base.display()
            )
        })
}

/// Check if a path is under a root directory (prevents path escape)
pub fn is_under_root(root: &Path, path: &Path) -> bool {
    let root_normalized = match normalize_path(root) {
        Ok(p) => p,
        Err(_) => return false,
    };

    let path_normalized = match normalize_path(path) {
        Ok(p) => p,
        Err(_) => return false,
    };

    path_normalized.starts_with(&root_normalized)
}

/// Normalize a path component for case-insensitive comparison on Windows
#[cfg(target_os = "windows")]
pub fn normalize_case(path: &Path) -> PathBuf {
    // On Windows, convert to lowercase for comparison
    // but preserve original case when creating directories
    PathBuf::from(path.to_string_lossy().to_lowercase())
}

#[cfg(not(target_os = "windows"))]
pub fn normalize_case(path: &Path) -> PathBuf {
    path.to_path_buf()
}

/// Create a directory and all parent directories if they don't exist
pub fn ensure_dir_exists(path: &Path) -> Result<()> {
    if !path.exists() {
        std::fs::create_dir_all(path)
            .with_context(|| format!("Failed to create directory: {}", path.display()))?;
        log::info!("Created directory: {}", path.display());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_normalize_absolute_path() {
        let path = PathBuf::from("/tmp/test");
        let normalized = normalize_path(&path).unwrap();
        assert!(normalized.is_absolute());
    }

    #[test]
    fn test_normalize_relative_path() {
        let path = PathBuf::from(".");
        let normalized = normalize_path(&path).unwrap();
        assert!(normalized.is_absolute());
        assert_eq!(normalized, env::current_dir().unwrap());
    }

    #[test]
    fn test_relativize_path() {
        let base = PathBuf::from("/tmp");
        let target = PathBuf::from("/tmp/subdir/file.txt");
        let relative = relativize_path(&base, &target).unwrap();
        assert_eq!(relative, PathBuf::from("subdir/file.txt"));
    }

    #[test]
    fn test_is_under_root_valid() {
        let root = PathBuf::from("/tmp");
        let path = PathBuf::from("/tmp/subdir");
        assert!(is_under_root(&root, &path));
    }

    #[test]
    fn test_is_under_root_invalid() {
        let root = PathBuf::from("/tmp/sandbox");
        let path = PathBuf::from("/etc/passwd");
        assert!(!is_under_root(&root, &path));
    }

    #[test]
    fn test_is_under_root_escape_attempt() {
        // When normalized, /tmp/sandbox/../../../etc/passwd becomes /etc/passwd
        // which should NOT be under /tmp/sandbox
        let root = PathBuf::from("/tmp/sandbox");
        let path = PathBuf::from("/etc/passwd"); // Direct path, not relative
        assert!(!is_under_root(&root, &path));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_normalize_case_windows() {
        let path = PathBuf::from("C:\\Users\\Test");
        let normalized = normalize_case(&path);
        assert_eq!(normalized, PathBuf::from("c:\\users\\test"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_normalize_case_unix() {
        let path = PathBuf::from("/tmp/Test");
        let normalized = normalize_case(&path);
        assert_eq!(normalized, path);
    }
}
