# Docker Development Environment for Sandbox-Sync

This Docker container provides a complete, isolated development environment for building and testing the sandbox-sync tool suite, including the Rust binary, VS Code/Positron extension, and R integration.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Container Components](#container-components)
- [Usage](#usage)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop)
- **System Requirements**:
  - 8GB RAM minimum (16GB recommended)
  - 20GB free disk space
  - Windows 10/11 with WSL2, macOS 10.15+, or Linux

### Installation

**Windows**:
- Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- Ensure WSL2 backend is enabled

**macOS**:
- Install [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

**Linux**:
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

## Quick Start

### 1. Build the Container

From the project root directory:

```bash
# Build the container image
docker-compose build

# Or build with no cache (clean build)
docker-compose build --no-cache
```

### 2. Start the Development Environment

```bash
# Start container in interactive mode
docker-compose run --rm sandbox-dev

# Or start in detached mode
docker-compose up -d sandbox-dev
```

### 3. Access the Container

```bash
# If running in detached mode, attach to the container
docker exec -it sandbox-sync-dev /bin/bash
```

### 4. Verify Installation

Inside the container:

```bash
# Check installed tools
rustc --version
cargo --version
node --version
npm --version
R --version
```

## Container Components

The development container includes:

### Core Development Tools

- **Rust**: Stable toolchain with cross-compilation targets
  - `rustc`, `cargo`
  - `rustfmt`, `clippy` for code quality
  - `cargo-watch` for live rebuilding
  - Cross-compilation targets: `x86_64-unknown-linux-musl`, `x86_64-pc-windows-gnu`, `x86_64-apple-darwin`, `aarch64-apple-darwin`

- **Node.js**: Version 20.x LTS
  - `npm`, `npx`
  - TypeScript compiler
  - VS Code Extension CLI (`vsce`)
  - ESLint, Prettier for code formatting

- **R**: Version 4.3+
  - Base R with recommended packages
  - `jsonlite`, `testthat` packages pre-installed

### System Utilities

- Git for version control
- Build tools (gcc, make, pkg-config)
- Text editors (vim, nano)
- CLI utilities (ripgrep, fd, bat, jq, tree)

### Test Directories

Pre-configured test sandboxes matching project specifications:
- `/test-scripts` - Simulates Git-tracked scripts directory
- `/test-data` - Simulates OneDrive data directory

## Usage

### Using with Your Host Paths

You can map your actual Windows directories to the container by setting environment variables:

#### Windows (PowerShell)

```powershell
# Set environment variables
$env:SCRIPT_PATH = "C:\Users\kell343\dev\r_script_sandbox2_vscode_test"
$env:DATA_PATH = "C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test"

# Start container
docker-compose up -d
```

#### Windows (Command Prompt)

```cmd
set SCRIPT_PATH=C:\Users\kell343\dev\r_script_sandbox2_vscode_test
set DATA_PATH=C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test
docker-compose up -d
```

#### Linux/macOS

```bash
export SCRIPT_PATH="/path/to/r_script_sandbox"
export DATA_PATH="/path/to/data_sandbox"
docker-compose up -d
```

### Create a `.env` File (Recommended)

Create a `.env` file in the project root:

```env
# Windows paths (Docker will handle conversion)
SCRIPT_PATH=C:\Users\kell343\dev\r_script_sandbox2_vscode_test
DATA_PATH=C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test

# Optional: Set log level
LOG_LEVEL=debug

# Optional: Match host user (Linux/macOS only)
USER_UID=1000
USER_GID=1000
```

Docker Compose will automatically load these variables.

## Development Workflow

### Building the Rust Binary

```bash
# Navigate to the Rust project
cd /workspace/sandbox-sync

# Create initial project (first time only)
cargo init --name sandbox-sync

# Build in debug mode
cargo build

# Build optimized release binary
cargo build --release

# Run tests
cargo test

# Run with arguments
cargo run -- sync --scripts /test-scripts --data /test-data --dry-run

# Watch mode (auto-rebuild on changes)
cargo watch -x build
```

### Developing the VS Code Extension

```bash
# Navigate to extension project
cd /workspace/sandbox-switcher

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test

# Package extension as .vsix
npm run package
# Or using vsce directly
vsce package
```

### Testing R Integration

```bash
# Start R console
R

# Inside R console
> source("/workspace/examples/.Rprofile")
> getwd()
> # Test sync functionality
> system2("sandbox-sync", c("sync", "--scripts", "/test-scripts", "--data", "/test-data"))
```

## Testing

### Run All Tests

```bash
# From workspace root
./scripts/test-all.sh
```

### Component-Specific Tests

```bash
# Rust binary tests
cd /workspace/sandbox-sync
cargo test
cargo test -- --nocapture  # Show output

# Integration tests
cargo test --test integration_tests

# Extension tests
cd /workspace/sandbox-switcher
npm test
```

### Manual Testing

```bash
# Test sync functionality
./scripts/test-sync.sh

# Test with actual paths
sandbox-sync sync \
  --scripts /test-scripts \
  --data /test-data \
  --gitkeep \
  --log-level debug \
  --dry-run
```

## Troubleshooting

### Permission Issues

If you encounter permission issues:

```bash
# Fix workspace permissions
sudo chown -R developer:developer /workspace

# Fix test directory permissions
sudo chown -R developer:developer /test-scripts /test-data
```

### Container Won't Start

```bash
# View container logs
docker-compose logs sandbox-dev

# Rebuild without cache
docker-compose build --no-cache

# Remove all containers and volumes, then rebuild
docker-compose down -v
docker-compose build
docker-compose up
```

### Slow Build Times

Docker uses volume caching to speed up builds. If builds are slow:

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# On Windows: Ensure WSL2 integration is enabled in Docker Desktop settings
```

### OneDrive Path Issues (Windows)

OneDrive paths on Windows can be tricky:

1. Make sure OneDrive is fully synced
2. Use the actual file system path (e.g., `C:\Users\...\OneDrive\...`)
3. Check that Docker Desktop has access to the drive in Settings > Resources > File Sharing

### Cargo/NPM Cache Issues

```bash
# Clear Rust cache
docker volume rm sandbox-sync-cargo-cache sandbox-sync-cargo-git

# Clear NPM cache
docker volume rm sandbox-sync-npm-cache

# Rebuild
docker-compose build
```

## Advanced Configuration

### Custom User UID/GID (Linux/macOS)

To match your host user for seamless file permissions:

```bash
# Set in .env file
USER_UID=$(id -u)
USER_GID=$(id -g)

# Rebuild container
docker-compose build
```

### Resource Limits

Edit `docker-compose.yml` to adjust resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

### Adding Additional Tools

Edit the `Dockerfile` to add more tools:

```dockerfile
# Example: Add additional Rust tools
RUN cargo install cargo-tarpaulin cargo-outdated

# Example: Add additional R packages
RUN R -e "install.packages(c('dplyr', 'ggplot2'), repos='https://cloud.r-project.org/')"
```

Then rebuild:

```bash
docker-compose build
```

### Running Multiple Containers

You can run multiple instances for parallel development:

```bash
# Start first instance
docker-compose run --name sandbox-dev-1 --rm sandbox-dev

# In another terminal, start second instance
docker-compose run --name sandbox-dev-2 --rm sandbox-dev
```

### Persistent Development Session

To keep a container running in the background:

```bash
# Start detached
docker-compose up -d

# Attach when needed
docker exec -it sandbox-sync-dev /bin/bash

# Stop when done
docker-compose down
```

### Cross-Compilation

Build binaries for different platforms:

```bash
cd /workspace/sandbox-sync

# Linux (musl for static linking)
cargo build --release --target x86_64-unknown-linux-musl

# Windows
cargo build --release --target x86_64-pc-windows-gnu

# macOS Intel
cargo build --release --target x86_64-apple-darwin

# macOS Apple Silicon (requires macOS host or cross SDK)
cargo build --release --target aarch64-apple-darwin
```

## Container Management

### Useful Commands

```bash
# Start container
docker-compose up -d

# Stop container
docker-compose down

# View logs
docker-compose logs -f sandbox-dev

# Restart container
docker-compose restart

# Execute command in running container
docker exec -it sandbox-sync-dev <command>

# Copy files from container
docker cp sandbox-sync-dev:/workspace/sandbox-sync/target/release/sandbox-sync ./

# Clean up everything
docker-compose down -v --rmi all
```

## Next Steps

1. **Initialize Projects**: Create the Rust and extension scaffolding
2. **Implement Components**: Follow the specifications in [CLAUDE.md](CLAUDE.md)
3. **Test Iteratively**: Use the provided test scripts and directories
4. **Build Releases**: Cross-compile binaries for all target platforms
5. **Package Extension**: Create `.vsix` for Positron/VS Code

## Additional Resources

- [Rust Documentation](https://doc.rust-lang.org/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [R Documentation](https://www.r-project.org/other-docs.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review container logs: `docker-compose logs`
- Rebuild from scratch: `docker-compose down -v && docker-compose build --no-cache`
