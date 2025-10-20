# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-20

### Added

#### Rust Binary (sandbox-sync)
- One-shot directory structure sync between two sandboxes
- Watch mode for continuous directory monitoring
- Check command to report missing directories
- Version command
- Glob-based filtering with default excludes
- `.gitkeep` file creation for empty directories
- Dry-run mode
- Configurable log levels (info, debug, warn, error)
- Cross-platform support (Windows, Linux)
- Path normalization and validation
- Safe concurrent directory creation

#### Positron Extension (sandbox-switcher)
- Toggle between Scripts and Data sandboxes
- Focus Scripts command (`Ctrl+Shift+S`)
- Focus Data command (`Ctrl+Shift+D`)
- Toggle Root command (`Ctrl+Shift+T`)
- Sync Now command (`Ctrl+Shift+Y`)
- Open Both Folders command (multi-root workspace)
- Automatic `setwd()` integration with R terminal
- Auto-sync on Positron startup (configurable)
- Optional watch mode during session
- Extension settings configuration
- Path quoting for paths with spaces (Windows compatibility)

#### R Integration
- `.Rprofile` template for auto-sync on R session start
- `sandbox.config.json` configuration support
- Windows path quoting in R scripts
- Automatic binary path resolution

#### Documentation
- Comprehensive README with quick start guide
- Positron setup guide with troubleshooting
- Quick start checklist
- Contributing guidelines
- Docker-based development environment
- Example configurations

#### Infrastructure
- Docker Compose development environment
- Cross-compilation setup for Windows
- GitHub Actions CI/CD (planned)
- Automated testing framework

### Fixed
- Path handling for Windows paths containing spaces
- OneDrive path compatibility ("OneDrive - Company" format)
- Wildcard pattern expansion in Windows shell
- Extension binary path resolution
- Working directory synchronization in Positron

### Known Issues
- macOS binary requires native compilation (no cross-compile support yet)
- Multi-root workspace mode may disrupt R session in Positron
- Watch mode may hit file watcher limits on very large directories (Linux)

### Performance
- Directory sync: O(n) where n = number of directories
- Typical sync time: <2 seconds for 1000+ directories
- Watch mode reaction: <300ms per directory creation
- No file hydration for OneDrive Files On-Demand

### Security
- Path traversal prevention
- No symlink following
- No file deletion (directories only)
- No file content modification

## [Unreleased]

### Planned
- macOS binary releases
- GitHub Actions CI/CD pipeline
- Additional keyboard shortcuts customization
- Configuration import/export
- Sync conflict resolution
- Performance optimizations for very large trees
- Additional exclude pattern templates

---

[0.1.0]: https://github.com/yourusername/sandbox-sync/releases/tag/v0.1.0
