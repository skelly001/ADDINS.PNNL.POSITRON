use anyhow::{anyhow, Context, Result};
use std::path::{Component, Path, PathBuf};

/// Resolves a base path to an absolute, canonical form (symlinks resolved).
/// On Windows, `dunce` avoids the `\\?\` prefix where it is not needed.
/// Fails if the path does not exist or is inaccessible.
pub fn normalize_path<P: AsRef<Path>>(path: P) -> Result<PathBuf> {
    let path = path.as_ref();
    dunce::canonicalize(path)
        .with_context(|| format!("Failed to normalize path: {}", path.display()))
}

/// Validates that a relative path is a safe descendant path and returns it
/// in a clean form (no `.` components). An empty path means the base itself.
///
/// Rejects absolute paths, drive or root prefixes, and `..` components.
pub fn validate_relative_path<P: AsRef<Path>>(rel_path: P) -> Result<PathBuf> {
    let rel_path = rel_path.as_ref();
    let mut clean = PathBuf::new();

    for component in rel_path.components() {
        match component {
            Component::Normal(part) => clean.push(part),
            Component::CurDir => {}
            Component::ParentDir => {
                return Err(anyhow!(
                    "Path contains '..' which is not allowed: {}",
                    rel_path.display()
                ));
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(anyhow!(
                    "Path must be relative, not absolute: {}",
                    rel_path.display()
                ));
            }
        }
    }

    Ok(clean)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_normalize_path() {
        let temp_dir = TempDir::new().unwrap();
        let normalized = normalize_path(temp_dir.path()).unwrap();

        assert!(normalized.is_absolute());
        // The temp dir may sit behind a symlink (e.g. /var on macOS), so
        // compare against the canonical form.
        assert_eq!(normalized, dunce::canonicalize(temp_dir.path()).unwrap());
    }

    #[test]
    fn test_normalize_path_missing() {
        let temp_dir = TempDir::new().unwrap();
        assert!(normalize_path(temp_dir.path().join("missing")).is_err());
    }

    #[test]
    fn test_validate_relative_path_accepts_valid() {
        assert_eq!(
            validate_relative_path("foo/bar/baz").unwrap(),
            PathBuf::from("foo/bar/baz")
        );
    }

    #[test]
    fn test_validate_relative_path_accepts_empty_and_curdir() {
        assert_eq!(validate_relative_path("").unwrap(), PathBuf::new());
        assert_eq!(validate_relative_path(".").unwrap(), PathBuf::new());
        assert_eq!(
            validate_relative_path("./foo").unwrap(),
            PathBuf::from("foo")
        );
    }

    #[test]
    fn test_validate_relative_path_accepts_dots_in_names() {
        assert!(validate_relative_path("v1..2/run").is_ok());
    }

    #[test]
    fn test_validate_relative_path_rejects_parent_dir() {
        assert!(validate_relative_path("foo/../bar").is_err());
        assert!(validate_relative_path("../foo").is_err());
    }

    #[test]
    fn test_validate_relative_path_rejects_absolute() {
        assert!(validate_relative_path("/foo/bar").is_err());
    }

    #[test]
    fn test_paths_with_spaces_and_unicode() {
        let temp_dir = TempDir::new().unwrap();
        let name = "dir with spaces \u{4E2D}\u{6587}";
        let dir = temp_dir.path().join(name);
        fs::create_dir(&dir).unwrap();

        let normalized = normalize_path(&dir).unwrap();
        assert!(normalized.is_absolute());
        assert!(normalized.ends_with(name));
    }
}
