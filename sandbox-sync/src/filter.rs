use anyhow::Result;
use globset::{Glob, GlobSet, GlobSetBuilder};
use std::path::Path;

/// Filter for excluding paths based on glob patterns
pub struct PathFilter {
    glob_set: GlobSet,
}

impl PathFilter {
    /// Create a new filter with the given exclude patterns
    pub fn new(excludes: &[String]) -> Result<Self> {
        let mut builder = GlobSetBuilder::new();

        for pattern in excludes {
            let glob = Glob::new(pattern)?;
            builder.add(glob);
        }

        let glob_set = builder.build()?;
        Ok(Self { glob_set })
    }

    /// Create a filter with default exclude patterns
    pub fn with_defaults() -> Result<Self> {
        Self::new(&Self::default_excludes())
    }

    /// Create a filter with default patterns plus custom excludes
    pub fn with_defaults_and_custom(custom_excludes: &[String]) -> Result<Self> {
        let mut all_excludes = Self::default_excludes();
        all_excludes.extend_from_slice(custom_excludes);
        Self::new(&all_excludes)
    }

    /// Get the default exclude patterns
    pub fn default_excludes() -> Vec<String> {
        vec![
            ".git".to_string(),
            ".git/**".to_string(),
            ".Rproj.user".to_string(),
            ".Rproj.user/**".to_string(),
            ".Rhistory".to_string(),
            ".Renviron".to_string(),
            ".DS_Store".to_string(),
            "Thumbs.db".to_string(),
            ".OneDrive*".to_string(),
            "~$*".to_string(),
            ".ipynb_checkpoints".to_string(),
            ".ipynb_checkpoints/**".to_string(),
        ]
    }

    /// Check if a path should be excluded
    pub fn should_exclude(&self, path: &Path) -> bool {
        // Check the full path
        if self.glob_set.is_match(path) {
            return true;
        }

        // Also check each component of the path
        for component in path.components() {
            if let Some(component_str) = component.as_os_str().to_str() {
                if self.glob_set.is_match(component_str) {
                    return true;
                }
            }
        }

        false
    }

    /// Check if a path should be included (opposite of should_exclude)
    pub fn should_include(&self, path: &Path) -> bool {
        !self.should_exclude(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_default_excludes_contains_git() {
        let excludes = PathFilter::default_excludes();
        assert!(excludes.contains(&".git".to_string()));
        assert!(excludes.contains(&".DS_Store".to_string()));
    }

    #[test]
    fn test_filter_excludes_git_dir() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from(".git");
        assert!(filter.should_exclude(&path));
        assert!(!filter.should_include(&path));
    }

    #[test]
    fn test_filter_excludes_nested_git() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from("some/path/.git/objects");
        assert!(filter.should_exclude(&path));
    }

    #[test]
    fn test_filter_includes_normal_dir() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from("src/main.rs");
        assert!(!filter.should_exclude(&path));
        assert!(filter.should_include(&path));
    }

    #[test]
    fn test_filter_excludes_rproj_user() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from(".Rproj.user");
        assert!(filter.should_exclude(&path));
    }

    #[test]
    fn test_filter_excludes_ds_store() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from("some/dir/.DS_Store");
        assert!(filter.should_exclude(&path));
    }

    #[test]
    fn test_filter_excludes_onedrive_pattern() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from(".OneDriveTemp");
        assert!(filter.should_exclude(&path));
    }

    #[test]
    fn test_filter_custom_pattern() {
        let custom = vec!["*.tmp".to_string(), "cache".to_string()];
        let filter = PathFilter::new(&custom).unwrap();

        assert!(filter.should_exclude(Path::new("file.tmp")));
        assert!(filter.should_exclude(Path::new("cache")));
        assert!(!filter.should_exclude(Path::new("file.txt")));
    }

    #[test]
    fn test_filter_with_defaults_and_custom() {
        let custom = vec!["*.log".to_string()];
        let filter = PathFilter::with_defaults_and_custom(&custom).unwrap();

        // Should exclude defaults
        assert!(filter.should_exclude(Path::new(".git")));

        // Should exclude custom
        assert!(filter.should_exclude(Path::new("debug.log")));

        // Should not exclude normal files
        assert!(!filter.should_exclude(Path::new("README.md")));
    }

    #[test]
    fn test_filter_temp_office_files() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from("~$document.docx");
        assert!(filter.should_exclude(&path));
    }

    #[test]
    fn test_filter_ipynb_checkpoints() {
        let filter = PathFilter::with_defaults().unwrap();
        let path = PathBuf::from(".ipynb_checkpoints");
        assert!(filter.should_exclude(&path));

        let nested = PathBuf::from("notebooks/.ipynb_checkpoints/notebook-checkpoint.ipynb");
        assert!(filter.should_exclude(&nested));
    }
}
