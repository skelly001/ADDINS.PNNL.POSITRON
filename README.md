# To use:

1. install the .vsix from sandbox-switcher/sandbox-switcher-0.1.0.vsix
2. copy the bundled rust binary to System32:
   terminal w admin (copy "C:\Users\kell343\.positron\extensions\pnnl.sandbox-switcher-0.1.0\bin\win32-x64\sandbox-sync.exe" C:\Windows\System32\)
3. add the .Rprofile & .Renviron with correct paths to the script sandbox root

# Development Project - Fresh Start# Sandbox Sync for Positron

This repository is set up with a Docker development environment ready for building your tool with Claude Code.Fast, cross-platform tool for seamless workflow between Git-tracked R scripts and OneDrive-backed data directories in Positron IDE.

## Docker Environment## Overview

The Docker container is pre-configured with:**Sandbox Sync** solves a common workflow challenge for R developers: working with scripts in Git while keeping data in OneDrive (or other non-Git storage). This toolkit provides:

- **Rust** (latest stable with cargo, rustfmt, clippy)

- **Node.js** (v20.x LTS with npm, TypeScript, VS Code extension tools)- **sandbox-sync**: Rust binary that mirrors directory structures between two sandboxes (scripts ↔ data)

- **R** (with essential packages)- **sandbox-switcher**: Positron/VS Code extension for instant workspace switching with keyboard shortcuts

- Cross-compilation tools for multiple platforms- **R integration**: Automatic sync on R session startup

## Getting Started## Key Features

### 1. Configure Your Paths- ✅ **Directory-only sync** - Creates missing directories; never touches files

- ✅ **Instant switching** - Toggle between Scripts and Data with `Ctrl+Shift+S/D`

Create or edit `.env` file from the example:- ✅ **R integration** - Automatically updates working directory with `setwd()`

- ✅ **OneDrive-friendly** - No file access that would hydrate large placeholders

````powershell- ✅ **Cross-platform** - Windows, macOS, Linux

# Copy the example (if not already done)- ✅ **Fast** - Built in Rust for performance

Copy-Item .env.example .env- ✅ **Safe** - Never deletes anything; dry-run mode available



# Edit with your preferred editor## Quick Start

notepad .env

```See [docs/QUICK_START.md](docs/QUICK_START.md) for detailed installation instructions.



Update the paths to match your environment:### Installation Summary

- `SCRIPT_PATH`: Your scripts directory

- `DATA_PATH`: Your data directory1. Download binary from [Releases](https://github.com/yourusername/sandbox-sync/releases)

2. Install Positron extension (`.vsix` file)

### 2. Build and Start Docker Container3. Configure paths in Positron settings

4. Start using keyboard shortcuts!

```powershell

# Build the container (first time)### Keyboard Shortcuts

docker-compose build

- `Ctrl+Shift+S` → Switch to Scripts

# Start interactive development environment- `Ctrl+Shift+D` → Switch to Data

docker-compose run --rm sandbox-dev- `Ctrl+Shift+T` → Toggle between them

```- `Ctrl+Shift+Y` → Sync now



### 3. Start Building with Claude Code## Documentation



The container provides a clean development environment with all necessary tools installed. You can now use Claude Code to:- **[Quick Start Guide](docs/QUICK_START.md)** - Get up and running in 5 minutes

- Design your project architecture- **[Setup Guide](docs/POSITRON_SETUP_GUIDE.md)** - Comprehensive installation and configuration

- Generate code for your tool- **[CLAUDE.md](CLAUDE.md)** - Complete specification and architecture

- Build and test iteratively

## Project Structure

## Available Scripts

````

Located in `scripts/` directory:sandbox-sync/

- `build-all.sh` - Build all project components├── sandbox-sync/ # Rust binary

- `dev-setup.sh` - Initialize project scaffolding├── sandbox-switcher/ # Positron extension

- `test-all.sh` - Run all tests├── examples/ # Configuration examples

- `test-sync.sh` - Test sync functionality├── docs/ # User documentation

└── docker-compose.yml # Development environment

## Files in This Repository```

### Docker Configuration## How It Works

- `Dockerfile` - Multi-stage Docker build configuration

- `docker-compose.yml` - Docker Compose service definition### The Problem

- `docker-entrypoint.sh` - Container initialization script

- `.env.example` - Environment variables templateR developers typically have:

- `README.docker.md` - Detailed Docker documentation- **Scripts** in Git (version controlled)

- **Data** in OneDrive/cloud (not in Git)

### Build Scripts

- `scripts/` - Shell scripts for building and testingTraditional workflow = manual navigation + R restart + sync headaches

### License### The Solution

- `LICENSE` - MIT License

**Bidirectional directory mirroring:**

## Next Steps```

r_script_sandbox/ data_sandbox/

1. **Plan Your Project**: Define what you want to build├── project1/ ←──→ ├── project1/

2. **Use Claude Code**: Let Claude help you design and implement├── project2/ ←──→ ├── project2/

3. **Iterate**: Build, test, and refine in the Docker environment└── outputs/ ←──→ └── outputs/

````

## Resources

**Instant workspace switching:**

- Docker documentation: See `README.docker.md`One keyboard shortcut → Explorer switches + `setwd()` updates (no R restart!)

- Run `docker-compose run --rm sandbox-dev` to enter the development environment

- Inside the container, run any command to see the quick start guide## Commands



---### Binary



**Ready to build something amazing!** 🚀```bash

# Sync directories
sandbox-sync --scripts <path> --data <path> sync

# Check missing directories
sandbox-sync --scripts <path> --data <path> check

# Watch for changes
sandbox-sync --scripts <path> --data <path> watch
````

### Extension

| Command       | Shortcut       | Description       |
| ------------- | -------------- | ----------------- |
| Focus Scripts | `Ctrl+Shift+S` | Switch to scripts |
| Focus Data    | `Ctrl+Shift+D` | Switch to data    |
| Toggle        | `Ctrl+Shift+T` | Toggle between    |
| Sync Now      | `Ctrl+Shift+Y` | Manual sync       |

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

| Platform | Binary               | Extension | R Integration |
| -------- | -------------------- | --------- | ------------- |
| Windows  | ✅                   | ✅        | ✅            |
| Linux    | ✅                   | ✅        | ✅            |
| macOS    | ⚠️ Build from source | ✅        | ✅            |

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
