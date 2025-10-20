# Quickstart Guide - Sandbox-Sync Docker Development Environment

This guide will get you up and running with the Docker development environment in under 5 minutes.

## Prerequisites

- Docker Desktop installed and running
- Windows 10/11 with WSL2, macOS 10.15+, or Linux

## Step 1: Configure Your Paths

Create a `.env` file from the example:

### Windows (PowerShell)

```powershell
# Navigate to project directory
cd C:\Users\kell343\dev\ADDINS.PNNL.VSC.DC

# Copy example .env file
copy .env.example .env

# Edit .env with your preferred text editor
notepad .env
```

### Linux/macOS

```bash
# Navigate to project directory
cd /path/to/ADDINS.PNNL.VSC.DC

# Copy example .env file
cp .env.example .env

# Edit .env with your preferred text editor
nano .env
```

### Important: Update these paths in `.env`

```env
SCRIPT_PATH=C:\Users\kell343\dev\r_script_sandbox2_vscode_test
DATA_PATH=C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test
```

Or use the default test directories (recommended for first-time setup):

```env
SCRIPT_PATH=./test-scripts
DATA_PATH=./test-data
```

## Step 2: Build the Docker Container

```bash
# Build the container (first time takes 5-10 minutes)
docker-compose build
```

## Step 3: Start the Development Environment

```bash
# Start container in interactive mode
docker-compose run --rm sandbox-dev
```

You should see the container startup message and a bash prompt.

## Step 4: Initialize the Project

Inside the container, run the setup script:

```bash
# Initialize project scaffolding
./scripts/dev-setup.sh
```

This creates the directory structure for:
- `sandbox-sync` (Rust binary)
- `sandbox-switcher` (VS Code extension)
- `examples` (R integration and config samples)

## Step 5: Build the Components

### Option A: Build Everything at Once

```bash
./scripts/build-all.sh
```

### Option B: Build Components Individually

#### Build Rust Binary

```bash
cd sandbox-sync
cargo build --release
```

#### Build VS Code Extension

```bash
cd sandbox-switcher
npm install
npm run compile
```

## Step 6: Test the Installation

```bash
# Run all tests
./scripts/test-all.sh

# Or run specific tests
./scripts/test-sync.sh
```

## Verify It's Working

### Test the Binary

```bash
# From workspace root
./sandbox-sync/target/release/sandbox-sync --version

# Run a dry-run sync
./sandbox-sync/target/release/sandbox-sync sync \
  --scripts /test-scripts \
  --data /test-data \
  --dry-run
```

### Check the Extension

```bash
cd sandbox-switcher
ls -la sandbox-switcher.vsix
```

## Common First-Time Issues

### 1. Docker Permission Errors (Linux)

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then restart Docker
sudo systemctl restart docker
```

### 2. WSL2 Path Issues (Windows)

Make sure Docker Desktop has access to your drives:
1. Open Docker Desktop
2. Settings → Resources → File Sharing
3. Ensure C: drive is checked

### 3. OneDrive Sync Issues

If using OneDrive paths, ensure:
- OneDrive is fully synced
- No placeholder files (download files if needed)
- Path exists: `C:\Users\<username>\OneDrive - PNNL\Documents\...`

### 4. Container Build Fails

Try building without cache:

```bash
docker-compose build --no-cache
```

### 5. Permission Issues Inside Container

Fix workspace permissions:

```bash
# Inside container
sudo chown -R developer:developer /workspace
```

## Quick Command Reference

```bash
# Start container
docker-compose run --rm sandbox-dev

# Start in background (detached)
docker-compose up -d
docker exec -it sandbox-sync-dev /bin/bash

# Stop container
docker-compose down

# Rebuild container
docker-compose build

# View logs
docker-compose logs -f

# Clean everything and start fresh
docker-compose down -v --rmi all
docker-compose build --no-cache
```

## Next Steps

Now that your environment is running:

1. **Implement the Rust Binary**
   - Follow the module structure in [CLAUDE.md](CLAUDE.md)
   - Start with `cli.rs` for argument parsing
   - Implement path normalization, filtering, and sync logic

2. **Develop the Extension**
   - Edit `sandbox-switcher/src/extension.ts`
   - Implement workspace switching commands
   - Add R terminal integration

3. **Test Iteratively**
   - Use `./scripts/test-sync.sh` for functional tests
   - Run `cargo test` for Rust unit tests
   - Test extension in Positron/VS Code

4. **Create Cross-Platform Builds**
   ```bash
   CROSS_COMPILE=true ./scripts/build-all.sh
   ```

## Getting Help

- **Full documentation**: See [README.docker.md](README.docker.md)
- **Project specifications**: See [CLAUDE.md](CLAUDE.md)
- **Container logs**: `docker-compose logs sandbox-dev`
- **Inside container help**: The entrypoint script shows available commands

## Development Workflow

```bash
# Typical development session:

# 1. Start container
docker-compose run --rm sandbox-dev

# 2. Make changes to code
cd sandbox-sync
# Edit files...

# 3. Build and test
cargo build
cargo test

# 4. Test sync functionality
./scripts/test-sync.sh

# 5. Package for distribution
cd /workspace
CREATE_DIST=true ./scripts/build-all.sh
```

## Tips for Productive Development

1. **Use Watch Mode**: Auto-rebuild on file changes
   ```bash
   cd sandbox-sync && cargo watch -x build
   ```

2. **Keep Container Running**: Use detached mode
   ```bash
   docker-compose up -d
   docker exec -it sandbox-sync-dev /bin/bash
   ```

3. **Cache Dependencies**: Volumes persist between runs
   - Cargo cache: `~/.cargo`
   - NPM cache: `~/.npm`

4. **Edit on Host**: Files are mounted from host, so you can:
   - Use your favorite IDE on Windows/macOS
   - Changes reflect immediately in container

5. **Test in Isolation**: Container provides clean environment
   - No conflicts with host system
   - Easy to reset and start fresh

Happy coding!
