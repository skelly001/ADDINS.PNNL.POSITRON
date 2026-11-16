use std::ffi::OsStr;
use std::path::Path;

/// Directory names that are never mirrored, in addition to every name that
/// starts with a dot (.git, .Rproj.user, .vscode, .positron, .Trash, ...).
const EXCLUDED_NAMES: &[&str] = &[
    "tmp",
    "__pycache__",
    // renv project libraries: package folders, often symlinks into a cache.
    "renv",
    "System Volume Information",
    "$RECYCLE.BIN",
];

/// Returns true if a single directory name should be excluded from syncing.
pub fn is_excluded_name(name: &OsStr) -> bool {
    match name.to_str() {
        Some(name) => name.starts_with('.') || EXCLUDED_NAMES.contains(&name),
        // Names that are not valid Unicode are never in the exclusion list.
        None => false,
    }
}

/// Returns true if any component of a relative path is excluded.
pub fn is_excluded_path<P: AsRef<Path>>(rel_path: P) -> bool {
    rel_path
        .as_ref()
        .components()
        .any(|c| is_excluded_name(c.as_os_str()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_excludes_hidden_and_tool_dirs() {
        for path in [
            ".git",
            "foo/.git",
            "foo/.git/objects",
            ".Rproj.user",
            "project/.Rproj.user/settings",
            ".vscode",
            ".positron",
            ".hidden",
            "foo/.config",
            ".Trash-1000",
        ] {
            assert!(is_excluded_path(path), "{path} should be excluded");
        }
    }

    #[test]
    fn test_excludes_named_dirs() {
        for path in [
            "tmp",
            "foo/tmp",
            "tmp/inner",
            "__pycache__",
            "module/__pycache__",
            "renv",
            "project/renv/library/macos",
            "System Volume Information",
            "$RECYCLE.BIN",
        ] {
            assert!(is_excluded_path(path), "{path} should be excluded");
        }
    }

    #[test]
    fn test_allows_normal_paths() {
        for path in [
            "foo",
            "foo/bar",
            "data/results",
            "dir with spaces",
            "path/to/dir with spaces",
            "folder_\u{4E2D}\u{6587}",
            "tmp_results",
            "renv_notes",
            "my.project",
        ] {
            assert!(!is_excluded_path(path), "{path} should be allowed");
        }
    }
}
