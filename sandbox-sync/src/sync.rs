use anyhow::{Context, Result};
use rayon::prelude::*;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::filter::PathFilter;
use crate::paths::{ensure_dir_exists, normalize_path};
use crate::walk::{walk_directories, DirectoryDiff};

/// Options for synchronization
pub struct SyncOptions {
    pub scripts_path: PathBuf,
    pub data_path: PathBuf,
    pub gitkeep: bool,
    pub dry_run: bool,
}

/// Result of a synchronization operation
pub struct SyncResult {
    pub scripts_dirs: HashSet<PathBuf>,
    pub data_dirs: HashSet<PathBuf>,
    pub created_in_scripts: Vec<PathBuf>,
    pub created_in_data: Vec<PathBuf>,
    pub gitkeep_files_created: usize,
}

impl SyncResult {
    /// Check if any changes were made
    pub fn has_changes(&self) -> bool {
        !self.created_in_scripts.is_empty()
            || !self.created_in_data.is_empty()
            || self.gitkeep_files_created > 0
    }

    /// Get total number of directories created
    pub fn total_created(&self) -> usize {
        self.created_in_scripts.len() + self.created_in_data.len()
    }
}

/// Perform a one-shot sync between scripts and data sandboxes
pub fn sync_directories(options: &SyncOptions, filter: &PathFilter) -> Result<SyncResult> {
    log::info!("Starting directory synchronization");
    log::info!("  Scripts: {}", options.scripts_path.display());
    log::info!("  Data:    {}", options.data_path.display());
    log::info!("  Dry run: {}", options.dry_run);
    log::info!("  Gitkeep: {}", options.gitkeep);

    // Normalize paths
    let scripts_root = normalize_path(&options.scripts_path)?;
    let data_root = normalize_path(&options.data_path)?;

    // Ensure roots exist (create if missing)
    if !options.dry_run {
        if !scripts_root.exists() {
            log::info!("Creating scripts root: {}", scripts_root.display());
            ensure_dir_exists(&scripts_root)?;
        }
        if !data_root.exists() {
            log::info!("Creating data root: {}", data_root.display());
            ensure_dir_exists(&data_root)?;
        }
    } else {
        if !scripts_root.exists() {
            log::info!("[DRY RUN] Would create scripts root: {}", scripts_root.display());
        }
        if !data_root.exists() {
            log::info!("[DRY RUN] Would create data root: {}", data_root.display());
        }
    }

    // Walk both directory trees
    log::info!("Scanning directory structures...");
    let scripts_dirs = walk_directories(&scripts_root, filter)?;
    let data_dirs = walk_directories(&data_root, filter)?;

    log::info!("  Scripts: {} directories", scripts_dirs.len());
    log::info!("  Data:    {} directories", data_dirs.len());

    // Compute differences
    let diff = DirectoryDiff::compute(&scripts_dirs, &data_dirs);

    if !diff.has_differences() {
        log::info!("No differences found - directories are in sync");
        return Ok(SyncResult {
            scripts_dirs,
            data_dirs,
            created_in_scripts: vec![],
            created_in_data: vec![],
            gitkeep_files_created: 0,
        });
    }

    log::info!(
        "Found {} differences ({} missing in data, {} missing in scripts)",
        diff.total_differences(),
        diff.missing_in_right.len(),
        diff.missing_in_left.len()
    );

    // Create missing directories in parallel
    let created_in_data = if !diff.missing_in_right.is_empty() {
        create_directories(&data_root, &diff.missing_in_right, options.dry_run)?
    } else {
        vec![]
    };

    let created_in_scripts = if !diff.missing_in_left.is_empty() {
        create_directories(&scripts_root, &diff.missing_in_left, options.dry_run)?
    } else {
        vec![]
    };

    // Create .gitkeep files if requested (only in scripts sandbox)
    let gitkeep_count = if options.gitkeep && !options.dry_run {
        create_gitkeep_files(&scripts_root, &scripts_dirs)?
    } else if options.gitkeep && options.dry_run {
        log::info!("[DRY RUN] Would create .gitkeep files in empty directories");
        0
    } else {
        0
    };

    log::info!("Synchronization complete:");
    log::info!("  Created in scripts: {}", created_in_scripts.len());
    log::info!("  Created in data:    {}", created_in_data.len());
    if options.gitkeep {
        log::info!("  .gitkeep files:     {}", gitkeep_count);
    }

    Ok(SyncResult {
        scripts_dirs,
        data_dirs,
        created_in_scripts,
        created_in_data,
        gitkeep_files_created: gitkeep_count,
    })
}

/// Create directories in parallel
fn create_directories(
    root: &Path,
    relative_dirs: &HashSet<PathBuf>,
    dry_run: bool,
) -> Result<Vec<PathBuf>> {
    let mut dirs_vec: Vec<PathBuf> = relative_dirs.iter().cloned().collect();
    dirs_vec.sort(); // Sort to create parent directories first

    if dry_run {
        for rel_path in &dirs_vec {
            let full_path = root.join(rel_path);
            log::info!("[DRY RUN] Would create: {}", full_path.display());
        }
        return Ok(vec![]);
    }

    // Use rayon for parallel directory creation
    let results: Vec<Result<PathBuf>> = dirs_vec
        .par_iter()
        .map(|rel_path| {
            let full_path = root.join(rel_path);
            ensure_dir_exists(&full_path)?;
            Ok(full_path)
        })
        .collect();

    // Collect results and check for errors
    let mut created = Vec::new();
    for result in results {
        created.push(result?);
    }

    Ok(created)
}

/// Create .gitkeep files in empty directories
fn create_gitkeep_files(root: &Path, directories: &HashSet<PathBuf>) -> Result<usize> {
    let mut count = 0;

    for rel_dir in directories {
        let dir_path = root.join(rel_dir);

        // Check if directory is empty
        let is_empty = std::fs::read_dir(&dir_path)
            .with_context(|| format!("Failed to read directory: {}", dir_path.display()))?
            .next()
            .is_none();

        if is_empty {
            let gitkeep_path = dir_path.join(".gitkeep");
            if !gitkeep_path.exists() {
                std::fs::write(&gitkeep_path, "")
                    .with_context(|| format!("Failed to create .gitkeep: {}", gitkeep_path.display()))?;
                log::debug!("Created .gitkeep: {}", gitkeep_path.display());
                count += 1;
            }
        }
    }

    Ok(count)
}

/// Check for differences without making changes
pub fn check_directories(
    scripts_path: &Path,
    data_path: &Path,
    filter: &PathFilter,
) -> Result<DirectoryDiff> {
    log::info!("Checking directory differences");

    let scripts_root = normalize_path(scripts_path)?;
    let data_root = normalize_path(data_path)?;

    let scripts_dirs = walk_directories(&scripts_root, filter)?;
    let data_dirs = walk_directories(&data_root, filter)?;

    let diff = DirectoryDiff::compute(&scripts_dirs, &data_dirs);

    if !diff.has_differences() {
        log::info!("No differences found");
    } else {
        log::info!("Found {} differences:", diff.total_differences());
        if !diff.missing_in_right.is_empty() {
            log::info!("  Missing in data ({}):", diff.missing_in_right.len());
            for dir in &diff.missing_in_right {
                log::info!("    - {}", dir.display());
            }
        }
        if !diff.missing_in_left.is_empty() {
            log::info!("  Missing in scripts ({}):", diff.missing_in_left.len());
            for dir in &diff.missing_in_left {
                log::info!("    - {}", dir.display());
            }
        }
    }

    Ok(diff)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_sync_creates_missing_dirs() -> Result<()> {
        let temp1 = TempDir::new()?;
        let temp2 = TempDir::new()?;

        // Create structure in first sandbox
        fs::create_dir_all(temp1.path().join("dir1/subdir"))?;
        fs::create_dir_all(temp1.path().join("dir2"))?;

        let options = SyncOptions {
            scripts_path: temp1.path().to_path_buf(),
            data_path: temp2.path().to_path_buf(),
            gitkeep: false,
            dry_run: false,
        };

        let filter = PathFilter::with_defaults()?;
        let result = sync_directories(&options, &filter)?;

        assert!(result.has_changes());
        assert_eq!(result.created_in_data.len(), 3); // dir1, dir1/subdir, dir2

        // Verify directories were created
        assert!(temp2.path().join("dir1").is_dir());
        assert!(temp2.path().join("dir1/subdir").is_dir());
        assert!(temp2.path().join("dir2").is_dir());

        Ok(())
    }

    #[test]
    fn test_sync_bidirectional() -> Result<()> {
        let temp1 = TempDir::new()?;
        let temp2 = TempDir::new()?;

        // Create different structures in each sandbox
        fs::create_dir_all(temp1.path().join("only_in_scripts"))?;
        fs::create_dir_all(temp2.path().join("only_in_data"))?;
        fs::create_dir_all(temp1.path().join("common"))?;
        fs::create_dir_all(temp2.path().join("common"))?;

        let options = SyncOptions {
            scripts_path: temp1.path().to_path_buf(),
            data_path: temp2.path().to_path_buf(),
            gitkeep: false,
            dry_run: false,
        };

        let filter = PathFilter::with_defaults()?;
        let result = sync_directories(&options, &filter)?;

        assert!(result.has_changes());
        assert_eq!(result.created_in_data.len(), 1); // only_in_scripts
        assert_eq!(result.created_in_scripts.len(), 1); // only_in_data

        // Verify both sandboxes now have all directories
        assert!(temp1.path().join("only_in_data").is_dir());
        assert!(temp2.path().join("only_in_scripts").is_dir());

        Ok(())
    }

    #[test]
    fn test_dry_run_no_changes() -> Result<()> {
        let temp1 = TempDir::new()?;
        let temp2 = TempDir::new()?;

        fs::create_dir_all(temp1.path().join("test_dir"))?;

        let options = SyncOptions {
            scripts_path: temp1.path().to_path_buf(),
            data_path: temp2.path().to_path_buf(),
            gitkeep: false,
            dry_run: true,
        };

        let filter = PathFilter::with_defaults()?;
        let result = sync_directories(&options, &filter)?;

        // Dry run should not create any directories
        assert!(!result.has_changes());
        assert!(!temp2.path().join("test_dir").exists());

        Ok(())
    }

    #[test]
    fn test_check_reports_differences() -> Result<()> {
        let temp1 = TempDir::new()?;
        let temp2 = TempDir::new()?;

        fs::create_dir_all(temp1.path().join("in_scripts"))?;
        fs::create_dir_all(temp2.path().join("in_data"))?;

        let filter = PathFilter::with_defaults()?;
        let diff = check_directories(temp1.path(), temp2.path(), &filter)?;

        assert!(diff.has_differences());
        assert_eq!(diff.missing_in_right.len(), 1);
        assert_eq!(diff.missing_in_left.len(), 1);

        Ok(())
    }
}
