# Sandbox Sync for Positron

> Fast, cross-platform toolkit for seamless workflows between Git-tracked R scripts and OneDrive-backed data directories in Positron IDE.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)]()

## Overview

**Sandbox Sync** solves a common workflow challenge for R developers: keeping scripts under version control while managing large data files separately. This toolkit provides:

-   **sandbox-sync**: Rust CLI binary for bidirectional directory structure mirroring
-   **sandbox-switcher**: Positron/VS Code extension for instant workspace switching
-   **R integration**: Automatic synchronization on R session startup

### Key Features

-   ✅ **Directory-only sync** – Creates missing directories; never touches files
-   ✅ **Instant switching** – Toggle between Scripts and Data with `Ctrl+Alt+W`
-   ✅ **R integration** – Automatically updates working directory with `setwd()`
-   ✅ **OneDrive-friendly** – No file access that would hydrate large placeholders
-   ✅ **Cross-platform** – Windows, macOS, Linux
-   ✅ **Fast** – Built in Rust for performance
-   ✅ **Safe** – Never deletes anything; directory creation is idempotent

## Quick Start

### Prerequisites

-   [Positron IDE](https://github.com/posit-dev/positron) or VS Code
-   R installed and configured
-   Two directories: one for scripts (Git-tracked) and one for data (OneDrive/cloud)

### Installation

1.  **Install the Positron extension**

    ``` powershell
    # Install from .vsix file
    positron --install-extension sandbox-switcher-0.1.0.vsix
    ```

2.  **Copy the Rust binary to system path** (Windows)

    ``` powershell
    # Run as Administrator
    Copy-Item "C:\Users\<username>\.positron\extensions\pnnl.sandbox-switcher-0.1.0\bin\win32-x64\sandbox-sync.exe" -Destination "C:\Windows\System32\"
    ```

3.  **Copy the Rust binary to system path** (Mac)

    ``` bash
    cp sandbox-sync/target/release/mac/sandbox-sync "$HOME/.local/bin/"
    chmod +x "$HOME/.local/bin/sandbox-sync"
    ```

4.  **Configure your R environment**

    Create `.Renviron` in your script sandbox root:

    ``` bash
    SCRIPT_PATH="C:/path/to/r_script_sandbox"
    DATA_PATH="C:/path/to/data_sandbox"
    ```

    Add `.Rprofile` to your script sandbox root (see [examples/](examples/) for template)

5.  **Restart R and start working!**

For detailed instructions, see [docs/QUICK_START.md](docs/QUICK_START.md).

## How It Works

### The Problem

R developers typically work with: - **Scripts** in Git (version controlled, small files) - **Data** in OneDrive/cloud (large files, not in Git)

Traditional workflow = manual navigation + R restarts + sync headaches

### The Solution

**Bidirectional directory mirroring:**

```         
r_script_sandbox/          data_sandbox/
├── project1/      ←──→    ├── project1/
├── project2/      ←──→    ├── project2/
└── outputs/       ←──→    └── outputs/
```

**Instant workspace switching:** - One keyboard shortcut (`Ctrl+Alt+W`) - Explorer reveals paired folder - `setwd()` updates as needed - No R restart required!

## Usage

### Keyboard Shortcuts

| Command                | Shortcut     | Description                            |
|----------------------|------------------|--------------------------------|
| Switch WD to Opposite  | `Ctrl+Alt+W` | Switch working directory to paired dir |
| Setup Paired Workspace | —            | Show counterpart folder in explorer    |
| Sync Directories Now   | —            | Manual full sync                       |

### CLI Commands

``` bash
# Full bidirectional sync (automatically run on R startup)
sandbox-sync --scripts-path <path> --data-path <path> sync-full --json

# Ensure a single relative path exists on both sides
sandbox-sync --scripts-path <path> --data-path <path> --relative <path> ensure-path --json
```

See `sandbox-sync --help` for all options.

## Project Structure

```         
ADDINS.PNNL.VSC/
├── sandbox-sync/         # Rust CLI binary
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   └── Cargo.toml
├── sandbox-switcher/     # Positron/VS Code extension
│   ├── src/
│   │   └── extension.ts
│   ├── package.json
│   └── sandbox-switcher-0.1.0.vsix   
├── examples/             # Configuration templates
│   ├── .Renviron.example
│   └── .Rprofile.example
├── docs/                 # Documentation
│   ├── QUICK_START.md
│   └── POSITRON_SETUP_GUIDE.md
└── docker-compose.yml    # Development environment
```

## Development

### Building from Source

**Rust binary:**

``` bash
cd sandbox-sync
cargo build --release
```

**Positron extension:**

``` bash
cd sandbox-switcher
npm install
npm run compile
npm run package  # Creates .vsix file
```

### Docker Development Environment

``` bash
cp .env.example .env
# Edit .env with your paths

docker-compose up -d
docker exec -it sandbox-sync-dev bash

# Inside container
cargo build --release
cargo test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Platform Support

| Platform | Binary | Extension | R Integration |
|----------|--------|-----------|---------------|
| Windows  | ✅     | ✅        | ✅            |
| Linux    | ✅     | ✅        | ✅            |
| macOS    | ✅\*   | ✅        | ✅            |

\* macOS: Build from source required

## Troubleshooting

See [docs/POSITRON_SETUP_GUIDE.md](docs/POSITRON_SETUP_GUIDE.md) for comprehensive troubleshooting.

**Common issues:**

-   **Binary not found** → Ensure `sandbox-sync` is in your system PATH or set full path in extension settings
-   **Paths with spaces** → Use forward slashes and quotes in `.Renviron`
-   **R not updating** → Ensure an active R terminal is running in Positron

## Documentation

-   [**Quick Start Guide**](docs/QUICK_START.md) – Installation and setup
-   [**Setup Guide**](docs/POSITRON_SETUP_GUIDE.md) – Comprehensive configuration reference
-   [**CLAUDE.md**](CLAUDE.md) – Complete specification and architecture

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License – see [LICENSE](LICENSE) for details.

## Credits

Built with [Rust](https://www.rust-lang.org/), [clap](https://docs.rs/clap/), [rayon](https://docs.rs/rayon/), [walkdir](https://docs.rs/walkdir/), and the [Positron Extension API](https://positron.posit.co/extension-development.html).

Developed for PNNL R developers.

------------------------------------------------------------------------

**Documentation:** [docs/](docs/) **Issues:** [GitHub Issues](https://github.com/pnnl/sandbox-sync/issues) **Releases:** [GitHub Releases](https://github.com/pnnl/sandbox-sync/releases)