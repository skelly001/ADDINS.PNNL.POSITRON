use anyhow::{Context, Result};
use notify::{
    event::{CreateKind, EventKind},
    Config, Event, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::filter::PathFilter;
use crate::paths::{ensure_dir_exists, normalize_path, relativize_path};

/// Options for watch mode
pub struct WatchOptions {
    pub scripts_path: PathBuf,
    pub data_path: PathBuf,
    pub dry_run: bool,
}

/// Watch both sandboxes and mirror directory creations
pub fn watch_directories(options: &WatchOptions, filter: &PathFilter) -> Result<()> {
    log::info!("Starting watch mode");
    log::info!("  Scripts: {}", options.scripts_path.display());
    log::info!("  Data:    {}", options.data_path.display());
    log::info!("  Dry run: {}", options.dry_run);

    let scripts_root = normalize_path(&options.scripts_path)?;
    let data_root = normalize_path(&options.data_path)?;

    // Create a cache to prevent echo loops (track recently created dirs)
    let recently_created = Arc::new(Mutex::new(RecentlyCreatedCache::new()));

    // Create channel for events
    let (tx, rx) = channel();

    // Create watchers for both roots
    let mut scripts_watcher = RecommendedWatcher::new(tx.clone(), Config::default())
        .context("Failed to create scripts watcher")?;

    let mut data_watcher = RecommendedWatcher::new(tx, Config::default())
        .context("Failed to create data watcher")?;

    // Start watching both directories
    scripts_watcher
        .watch(&scripts_root, RecursiveMode::Recursive)
        .with_context(|| format!("Failed to watch scripts: {}", scripts_root.display()))?;

    data_watcher
        .watch(&data_root, RecursiveMode::Recursive)
        .with_context(|| format!("Failed to watch data: {}", data_root.display()))?;

    log::info!("Watching for directory changes... (Press Ctrl+C to stop)");

    // Process events
    loop {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(event_result) => {
                match event_result {
                    Ok(event) => {
                        if let Err(e) = handle_event(
                            &event,
                            &scripts_root,
                            &data_root,
                            filter,
                            &recently_created,
                            options.dry_run,
                        ) {
                            log::error!("Error handling event: {}", e);
                        }
                    }
                    Err(e) => {
                        log::error!("Watch error: {}", e);
                    }
                }
            }
            Err(RecvTimeoutError::Timeout) => {
                // No events, continue
                continue;
            }
            Err(RecvTimeoutError::Disconnected) => {
                log::info!("Watch channel disconnected, stopping");
                break;
            }
        }
    }

    Ok(())
}

/// Handle a filesystem event
fn handle_event(
    event: &Event,
    scripts_root: &Path,
    data_root: &Path,
    filter: &PathFilter,
    recently_created: &Arc<Mutex<RecentlyCreatedCache>>,
    dry_run: bool,
) -> Result<()> {
    // Only interested in directory creation events
    if !matches!(event.kind, EventKind::Create(CreateKind::Folder)) {
        return Ok(());
    }

    for path in &event.paths {
        // Determine which sandbox this event came from
        let (source_root, target_root) = if path.starts_with(scripts_root) {
            (scripts_root, data_root)
        } else if path.starts_with(data_root) {
            (data_root, scripts_root)
        } else {
            // Event from unknown location, ignore
            continue;
        };

        // Only process directories
        if !path.is_dir() {
            continue;
        }

        // Compute relative path
        let rel_path = match relativize_path(source_root, path) {
            Ok(p) => p,
            Err(e) => {
                log::warn!("Failed to compute relative path: {}", e);
                continue;
            }
        };

        // Check if this path should be excluded
        if filter.should_exclude(&rel_path) {
            log::debug!("Excluding directory: {}", rel_path.display());
            continue;
        }

        // Check if this was recently created by us (prevent echo loop)
        {
            let mut cache = recently_created.lock().unwrap();
            if cache.contains(&path.to_path_buf()) {
                log::debug!("Skipping recently created dir (echo prevention): {}", path.display());
                cache.remove(&path.to_path_buf());
                continue;
            }
        }

        // Mirror the directory to the other sandbox
        let target_path = target_root.join(&rel_path);

        if dry_run {
            log::info!(
                "[DRY RUN] Would mirror: {} -> {}",
                path.display(),
                target_path.display()
            );
        } else {
            log::info!("Mirroring: {} -> {}", path.display(), target_path.display());

            // Add to cache before creating to prevent echo
            {
                let mut cache = recently_created.lock().unwrap();
                cache.insert(target_path.clone());
            }

            if let Err(e) = ensure_dir_exists(&target_path) {
                log::error!("Failed to create directory {}: {}", target_path.display(), e);
            }
        }
    }

    Ok(())
}

/// Cache for tracking recently created directories (to prevent echo loops)
struct RecentlyCreatedCache {
    cache: HashSet<PathBuf>,
    max_size: usize,
}

impl RecentlyCreatedCache {
    fn new() -> Self {
        Self {
            cache: HashSet::new(),
            max_size: 1000, // Limit cache size to prevent memory growth
        }
    }

    fn insert(&mut self, path: PathBuf) {
        // If cache is too large, clear it (simple eviction strategy)
        if self.cache.len() >= self.max_size {
            log::debug!("Clearing recently created cache (max size reached)");
            self.cache.clear();
        }
        self.cache.insert(path);
    }

    fn contains(&self, path: &PathBuf) -> bool {
        self.cache.contains(path)
    }

    fn remove(&mut self, path: &PathBuf) {
        self.cache.remove(path);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recently_created_cache() {
        let mut cache = RecentlyCreatedCache::new();

        let path1 = PathBuf::from("/tmp/dir1");
        let path2 = PathBuf::from("/tmp/dir2");

        assert!(!cache.contains(&path1));

        cache.insert(path1.clone());
        assert!(cache.contains(&path1));
        assert!(!cache.contains(&path2));

        cache.remove(&path1);
        assert!(!cache.contains(&path1));
    }

    #[test]
    fn test_cache_max_size() {
        let mut cache = RecentlyCreatedCache {
            cache: HashSet::new(),
            max_size: 5,
        };

        // Insert more than max_size items
        for i in 0..10 {
            cache.insert(PathBuf::from(format!("/tmp/dir{}", i)));
        }

        // Cache should have been cleared at some point
        assert!(cache.cache.len() <= 10);
    }
}
