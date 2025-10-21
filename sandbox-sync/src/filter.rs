use globset::{Glob, GlobSet, GlobSetBuilder};
use std::path::Path;

/// Builds a filter for excluding directories and files that should not be synced.
/// Exclusions include:
/// - .git, .Rproj.user, .vscode, .positron
/// - __pycache__, .DS_Store, Thumbs.db
/// - tmp, hidden system dirs
/// - Any custom patterns provided by the user
pub struct PathFilter {
    glob_set: GlobSet,
}

impl PathFilter {
    /// Creates a new PathFilter with default exclusions.
    pub fn new() -> anyhow::Result<Self> {
        Self::with_custom_patterns(&[])
    }

    /// Creates a new PathFilter with default exclusions plus custom patterns.
    pub fn with_custom_patterns(custom: &[&str]) -> anyhow::Result<Self> {
        let mut builder = GlobSetBuilder::new();

        // Default exclusions per CLAUDE.md spec
        let default_patterns = vec![
            "**/.git",
            "**/.git/**",
            "**/.Rproj.user",
            "**/.Rproj.user/**",
            "**/.vscode",
            "**/.vscode/**",
            "**/.positron",
            "**/.positron/**",
            "**/__pycache__",
            "**/__pycache__/**",
            "**/.DS_Store",
            "**/Thumbs.db",
            "**/tmp",
            "**/tmp/**",
            "**/.Trash*",
            "**/.Trash*/**",
            "**/System Volume Information",
            "**/System Volume Information/**",
            "**/$RECYCLE.BIN",
            "**/$RECYCLE.BIN/**",
            // Hidden files and directories (starting with .)
            "**/.*",
        ];

        // Add default patterns
        for pattern in default_patterns {
            builder.add(Glob::new(pattern)?);
        }

        // Add custom patterns
        for pattern in custom {
            builder.add(Glob::new(pattern)?);
        }

        let glob_set = builder.build()?;

        Ok(PathFilter { glob_set })
    }

    /// Checks if a path should be excluded based on the filter.
    pub fn should_exclude<P: AsRef<Path>>(&self, path: P) -> bool {
        let path = path.as_ref();

        // Check against glob patterns
        if self.glob_set.is_match(path) {
            return true;
        }

        // Additional check: exclude any path component that starts with '.'
        // except for the special case of just "." (current dir)
        for component in path.components() {
            if let Some(name) = component.as_os_str().to_str() {
                if name.starts_with('.') && name != "." {
                    return true;
                }
            }
        }

        false
    }

    /// Checks if a path is a symlink or reparse point (Windows).
    /// These should be skipped to avoid infinite loops.
    #[cfg(unix)]
    pub fn is_symlink<P: AsRef<Path>>(path: P) -> bool {
        use std::os::unix::fs::FileTypeExt;

        if let Ok(metadata) = std::fs::symlink_metadata(path.as_ref()) {
            metadata.file_type().is_symlink()
        } else {
            false
        }
    }

    #[cfg(windows)]
    pub fn is_symlink<P: AsRef<Path>>(path: P) -> bool {
        use std::os::windows::fs::MetadataExt;

        if let Ok(metadata) = std::fs::symlink_metadata(path.as_ref()) {
            // Check for reparse point (includes symlinks and junctions)
            const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
            (metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT) != 0
        } else {
            false
        }
    }

    #[cfg(not(any(unix, windows)))]
    pub fn is_symlink<P: AsRef<Path>>(path: P) -> bool {
        // Fallback for other platforms
        if let Ok(metadata) = std::fs::symlink_metadata(path.as_ref()) {
            metadata.file_type().is_symlink()
        } else {
            false
        }
    }
}

impl Default for PathFilter {
    fn default() -> Self {
        Self::new().expect("Failed to create default PathFilter")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_filter_excludes_git() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude(".git"));
        assert!(filter.should_exclude("foo/.git"));
        assert!(filter.should_exclude("foo/.git/objects"));
    }

    #[test]
    fn test_filter_excludes_rproj_user() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude(".Rproj.user"));
        assert!(filter.should_exclude("project/.Rproj.user"));
        assert!(filter.should_exclude("project/.Rproj.user/settings"));
    }

    #[test]
    fn test_filter_excludes_vscode_positron() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude(".vscode"));
        assert!(filter.should_exclude(".positron"));
        assert!(filter.should_exclude("foo/.vscode/settings.json"));
    }

    #[test]
    fn test_filter_excludes_pycache() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude("__pycache__"));
        assert!(filter.should_exclude("module/__pycache__"));
    }

    #[test]
    fn test_filter_excludes_system_files() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude(".DS_Store"));
        assert!(filter.should_exclude("Thumbs.db"));
        assert!(filter.should_exclude("folder/.DS_Store"));
    }

    #[test]
    fn test_filter_excludes_tmp() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude("tmp"));
        assert!(filter.should_exclude("tmp/file"));
        assert!(filter.should_exclude("foo/tmp"));
    }

    #[test]
    fn test_filter_excludes_hidden() {
        let filter = PathFilter::new().unwrap();
        assert!(filter.should_exclude(".hidden"));
        assert!(filter.should_exclude("foo/.hidden"));
        assert!(filter.should_exclude(".config"));
    }

    #[test]
    fn test_filter_allows_normal_paths() {
        let filter = PathFilter::new().unwrap();
        assert!(!filter.should_exclude("foo"));
        assert!(!filter.should_exclude("foo/bar"));
        assert!(!filter.should_exclude("data/results"));
        assert!(!filter.should_exclude("my_script.R"));
    }

    #[test]
    fn test_custom_patterns() {
        let filter = PathFilter::with_custom_patterns(&["**/test_*", "**/*.bak"]).unwrap();
        assert!(filter.should_exclude("test_file.txt"));
        assert!(filter.should_exclude("foo/test_data"));
        assert!(filter.should_exclude("backup.bak"));
        assert!(filter.should_exclude("data/old.bak"));
    }

    #[test]
    fn test_is_symlink_detection() {
        let temp_dir = TempDir::new().unwrap();
        let base = temp_dir.path();

        // Create a regular directory
        let regular_dir = base.join("regular");
        fs::create_dir(&regular_dir).unwrap();

        // Regular directory should not be detected as symlink
        assert!(!PathFilter::is_symlink(&regular_dir));

        // Create a symlink (Unix only for this test)
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let link_path = base.join("link");
            symlink(&regular_dir, &link_path).unwrap();
            assert!(PathFilter::is_symlink(&link_path));
        }
    }

    #[test]
    fn test_filter_with_spaces() {
        let filter = PathFilter::new().unwrap();
        assert!(!filter.should_exclude("dir with spaces"));
        assert!(!filter.should_exclude("path/to/dir with spaces"));
    }

    #[test]
    fn test_filter_with_unicode() {
        let filter = PathFilter::new().unwrap();
        let unicode_path = "folder_\u{4E2D}\u{6587}"; // "folder_中文"
        assert!(!filter.should_exclude(unicode_path));
    }
}
