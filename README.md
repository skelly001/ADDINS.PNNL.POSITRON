# Sandbox Sync for Positron

Fast, cross-platform tool for seamless workflow between Git-tracked R scripts and OneDrive-backed data directories in Positron IDE.

## Overview

**Sandbox Sync** solves a common workflow challenge for R developers: working with scripts in Git while keeping data in OneDrive (or other non-Git storage). This toolkit provides:

- **sandbox-sync**: Rust binary that mirrors directory structures between two sandboxes (scripts ↔ data)
- **sandbox-switcher**: Positron/VS Code extension for instant workspace switching with keyboard shortcuts
- **R integration**: Automatic sync on R session startup

## Key Features

- ✅ **Directory-only sync** - Creates missing directories; never touches files
- ✅ **Instant switching** - Toggle between Scripts and Data with `Ctrl+Shift+S/D`
- ✅ **R integration** - Automatically updates working directory with `setwd()`
- ✅ **OneDrive-friendly** - No file access that would hydrate large placeholders
- ✅ **Cross-platform** - Windows, macOS, Linux
- ✅ **Fast** - Built in Rust for performance
- ✅ **Safe** - Never deletes anything; dry-run mode available

## Quick Start

See [docs/QUICK_START.md](docs/QUICK_START.md) for detailed installation instructions.

### Installation Summary

1. Download binary from [Releases](https://github.com/yourusername/sandbox-sync/releases)
2. Install Positron extension (`.vsix` file)
3. Configure paths in Positron settings
4. Start using keyboard shortcuts!

### Keyboard Shortcuts

- `Ctrl+Shift+S` → Switch to Scripts
- `Ctrl+Shift+D` → Switch to Data  
- `Ctrl+Shift+T` → Toggle between them
- `Ctrl+Shift+Y` → Sync now

## Documentation

- **[Quick Start Guide](docs/QUICK_START.md)** - Get up and running in 5 minutes
- **[Setup Guide](docs/POSITRON_SETUP_GUIDE.md)** - Comprehensive installation and configuration
- **[CLAUDE.md](CLAUDE.md)** - Complete specification and architecture

## Project Structure

```
sandbox-sync/
├── sandbox-sync/          # Rust binary
├── sandbox-switcher/      # Positron extension
├── examples/              # Configuration examples
├── docs/                  # User documentation
└── docker-compose.yml     # Development environment
```

## How It Works

### The Problem

R developers typically have:
- **Scripts** in Git (version controlled)
- **Data** in OneDrive/cloud (not in Git)

Traditional workflow = manual navigation + R restart + sync headaches

### The Solution

**Bidirectional directory mirroring:**
```
r_script_sandbox/          data_sandbox/
├── project1/       ←──→   ├── project1/
├── project2/       ←──→   ├── project2/
└── outputs/        ←──→   └── outputs/
```

**Instant workspace switching:**
One keyboard shortcut → Explorer switches + `setwd()` updates (no R restart!)

## Commands

### Binary

```bash
# Sync directories
sandbox-sync --scripts <path> --data <path> sync

# Check missing directories
sandbox-sync --scripts <path> --data <path> check

# Watch for changes
sandbox-sync --scripts <path> --data <path> watch
```

### Extension

| Command | Shortcut | Description |
|---------|----------|-------------|
| Focus Scripts | `Ctrl+Shift+S` | Switch to scripts |
| Focus Data | `Ctrl+Shift+D` | Switch to data |
| Toggle | `Ctrl+Shift+T` | Toggle between |
| Sync Now | `Ctrl+Shift+Y` | Manual sync |

## Development

### Build from Source

```bash
# Rust binary
cd sandbox-sync
cargo build --release

# Positron extension
cd sandbox-switcher
npm install
npm run compile
npm run package
```

### Docker Development

```bash
cp .env.example .env
# Edit .env with your paths

docker-compose up -d
docker exec -it sandbox-sync-dev bash

# Inside container
cargo build --release
cargo test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Platform Support

| Platform | Binary | Extension | R Integration |
|----------|--------|-----------|---------------|
| Windows | ✅ | ✅ | ✅ |
| Linux | ✅ | ✅ | ✅ |
| macOS | ⚠️ Build from source | ✅ | ✅ |

## Troubleshooting

See [docs/POSITRON_SETUP_GUIDE.md](docs/POSITRON_SETUP_GUIDE.md) for comprehensive troubleshooting.

**Common issues:**
- Binary not found → Set full path in settings
- Paths with spaces → Use forward slashes
- R not updating → Ensure R console is active

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE)

## Credits

Built with Rust, clap, notify, jwalk, and VS Code Extension API.

Developed for PNNL R developers.

---

**Documentation:** [docs/](docs/)  
**Issues:** [GitHub Issues](https://github.com/yourusername/sandbox-sync/issues)  
**Releases:** [GitHub Releases](https://github.com/yourusername/sandbox-sync/releases)
