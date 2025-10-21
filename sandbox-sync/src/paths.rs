use anyhow::{anyhow, Context, Result};
use dunce::canonicalize;
use pathdiff::diff_paths;
use std::path::{Path, PathBuf};

/// Normalizes a path by resolving symlinks, removing '.' and '..' components,
/// and converting to an absolute path. On Windows, strips UNC prefix if present.
pub fn normalize_path<P: AsRef<Path>>(path: P) -> Result<PathBuf> {
    let path = path.as_ref();

    // Use dunce to canonicalize - this handles UNC paths on Windows gracefully
    let canonical = canonicalize(path)
        .with_context(|| format!("Failed to normalize path: {}", path.display()))?;

    Ok(canonical)
}

/// Computes the relative path from base to target.
/// Returns an error if target is not a descendant of base.
pub fn relative_path<P: AsRef<Path>, Q: AsRef<Path>>(base: P, target: Q) -> Result<PathBuf> {
    let base = base.as_ref();
    let target = target.as_ref();

    let rel = diff_paths(target, base)
        .ok_or_else(|| anyhow!("Cannot compute relative path from {} to {}", base.display(), target.display()))?;

    // Ensure the path doesn't escape the base (no ".." components at the start)
    if rel.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err(anyhow!(
            "Path {} escapes base {} (contains '..')",
            target.display(),
            base.display()
        ));
    }

    Ok(rel)
}

/// Validates that a relative path is safe (no '..' components, not absolute).
/// This prevents directory traversal attacks.
pub fn validate_relative_path<P: AsRef<Path>>(rel_path: P) -> Result<PathBuf> {
    let rel_path = rel_path.as_ref();

    // Check if absolute
    if rel_path.is_absolute() {
        return Err(anyhow!(
            "Path must be relative, not absolute: {}",
            rel_path.display()
        ));
    }

    // Check for ".." components
    for component in rel_path.components() {
        if matches!(component, std::path::Component::ParentDir) {
            return Err(anyhow!(
                "Path contains '..' which is not allowed: {}",
                rel_path.display()
            ));
        }
    }

    Ok(rel_path.to_path_buf())
}

/// Validates that target is a descendant of base.
/// Both paths should be normalized before calling this.
pub fn is_descendant<P: AsRef<Path>, Q: AsRef<Path>>(base: P, target: Q) -> bool {
    let base = base.as_ref();
    let target = target.as_ref();

    target.starts_with(base)
}

/// Converts a path to use forward slashes, even on Windows.
/// This is useful for R's setwd() which prefers forward slashes.
pub fn to_forward_slashes<P: AsRef<Path>>(path: P) -> String {
    path.as_ref()
        .to_string_lossy()
        .replace('\\', "/")
}

/// Safely joins a base path with a relative path, ensuring the result is within base.
pub fn safe_join<P: AsRef<Path>, Q: AsRef<Path>>(base: P, rel_path: Q) -> Result<PathBuf> {
    let base = base.as_ref();
    let rel_path = rel_path.as_ref();

    // Validate relative path first
    validate_relative_path(rel_path)?;

    // Join paths
    let joined = base.join(rel_path);

    // Normalize to resolve any remaining issues
    let normalized = normalize_path(&joined)?;

    // Ensure result is still within base
    if !is_descendant(base, &normalized) {
        return Err(anyhow!(
            "Joined path {} escapes base {}",
            normalized.display(),
            base.display()
        ));
    }

    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_normalize_path() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path();

        // Test that normalization works
        let normalized = normalize_path(path).unwrap();
        assert!(normalized.is_absolute());
        assert_eq!(normalized, path);
    }

    #[test]
    fn test_relative_path() {
        let base = PathBuf::from("/foo/bar");
        let target = PathBuf::from("/foo/bar/baz/qux");

        let rel = relative_path(&base, &target).unwrap();
        assert_eq!(rel, PathBuf::from("baz/qux"));
    }

    #[test]
    fn test_relative_path_rejects_escape() {
        let base = PathBuf::from("/foo/bar");
        let target = PathBuf::from("/foo");

        // This should fail because target is not a descendant
        let result = relative_path(&base, &target);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_relative_path_accepts_valid() {
        let valid = PathBuf::from("foo/bar/baz");
        assert!(validate_relative_path(&valid).is_ok());
    }

    #[test]
    fn test_validate_relative_path_rejects_parent_dir() {
        let invalid = PathBuf::from("foo/../bar");
        assert!(validate_relative_path(&invalid).is_err());

        let invalid2 = PathBuf::from("../foo");
        assert!(validate_relative_path(&invalid2).is_err());
    }

    #[test]
    fn test_validate_relative_path_rejects_absolute() {
        let invalid = PathBuf::from("/foo/bar");
        assert!(validate_relative_path(&invalid).is_err());
    }

    #[test]
    fn test_is_descendant() {
        let base = PathBuf::from("/foo/bar");
        let child = PathBuf::from("/foo/bar/baz");
        let not_child = PathBuf::from("/foo/baz");

        assert!(is_descendant(&base, &child));
        assert!(!is_descendant(&base, &not_child));
    }

    #[test]
    fn test_to_forward_slashes() {
        // Test with backslashes (Windows-style)
        let path = "C:\\Users\\test\\file.txt";
        assert_eq!(to_forward_slashes(path), "C:/Users/test/file.txt");

        // Test with forward slashes (already correct)
        let path = "/home/user/file.txt";
        assert_eq!(to_forward_slashes(path), "/home/user/file.txt");
    }

    #[test]
    fn test_safe_join() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        // Create a subdirectory
        let subdir = base.join("subdir");
        fs::create_dir(&subdir).unwrap();

        // Test valid join
        let result = safe_join(base, "subdir").unwrap();
        assert!(result.starts_with(base));

        // Test invalid join with ".."
        let result = safe_join(base, "../escape");
        assert!(result.is_err());
    }

    #[test]
    fn test_paths_with_spaces() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        // Create directory with spaces
        let space_dir = base.join("dir with spaces");
        fs::create_dir(&space_dir).unwrap();

        // Test normalization
        let normalized = normalize_path(&space_dir).unwrap();
        assert!(normalized.is_absolute());
        assert!(normalized.to_string_lossy().contains("dir with spaces"));
    }

    #[test]
    fn test_paths_with_unicode() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        // Create directory with Unicode characters (using escape sequences to avoid encoding issues)
        let unicode_name = "folder_\u{4E2D}\u{6587}"; // "folder_中文"
        let unicode_dir = base.join(unicode_name);
        fs::create_dir(&unicode_dir).unwrap();

        // Test normalization
        let normalized = normalize_path(&unicode_dir).unwrap();
        assert!(normalized.is_absolute());
        assert!(normalized.to_string_lossy().contains("folder_"));
    }
}
