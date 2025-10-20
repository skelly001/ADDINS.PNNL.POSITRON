#!/bin/bash
# Docker entrypoint script for sandbox-sync development environment
# Sets up permissions, test directories, and environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sandbox-Sync Development Environment${NC}"
echo -e "${BLUE}========================================${NC}"

# ============================================================================
# Environment Information
# ============================================================================
echo -e "\n${GREEN}Environment Information:${NC}"
echo "  User: $(whoami)"
echo "  Working Directory: $(pwd)"
echo "  Rust Version: $(rustc --version)"
echo "  Cargo Version: $(cargo --version)"
echo "  Node Version: $(node --version)"
echo "  NPM Version: $(npm --version)"
echo "  R Version: $(R --version | head -n1)"

# ============================================================================
# Setup Test Directories
# ============================================================================
echo -e "\n${GREEN}Setting up test directories...${NC}"

# Create test-scripts directory structure if it doesn't exist
if [ ! -d "/test-scripts" ]; then
    echo -e "${YELLOW}Creating /test-scripts directory${NC}"
    sudo mkdir -p /test-scripts
    sudo chown -R $(whoami):$(id -gn) /test-scripts
fi

# Create test-data directory structure if it doesn't exist
if [ ! -d "/test-data" ]; then
    echo -e "${YELLOW}Creating /test-data directory${NC}"
    sudo mkdir -p /test-data
    sudo chown -R $(whoami):$(id -gn) /test-data
fi

# Create sample directory structure for testing if empty
if [ -z "$(ls -A /test-scripts)" ]; then
    echo -e "${YELLOW}Initializing test-scripts with sample structure...${NC}"
    mkdir -p /test-scripts/{project1,project2,shared/utils}
    touch /test-scripts/README.md
    echo "# Test Scripts Sandbox" > /test-scripts/README.md
    echo "This is a test directory for the scripts sandbox (Git-tracked)." >> /test-scripts/README.md

    # Create .gitkeep files to preserve directory structure
    find /test-scripts -type d -exec touch {}/.gitkeep \;
fi

if [ -z "$(ls -A /test-data)" ]; then
    echo -e "${YELLOW}Initializing test-data with sample structure...${NC}"
    mkdir -p /test-data/{datasets,outputs,temp}
    touch /test-data/README.md
    echo "# Test Data Sandbox" > /test-data/README.md
    echo "This is a test directory for the data sandbox (OneDrive, no Git)." >> /test-data/README.md
fi

echo -e "${GREEN}Test directories ready:${NC}"
echo "  Scripts: /test-scripts"
echo "  Data: /test-data"

# ============================================================================
# Fix Permissions for Workspace
# ============================================================================
echo -e "\n${GREEN}Checking workspace permissions...${NC}"

# Ensure the workspace directory is writable
if [ -d "/workspace" ]; then
    # Try to create a test file to check permissions
    if ! touch /workspace/.permission-test 2>/dev/null; then
        echo -e "${YELLOW}Fixing workspace permissions...${NC}"
        sudo chown -R $(whoami):$(id -gn) /workspace 2>/dev/null || true
    else
        rm -f /workspace/.permission-test
    fi
fi

# ============================================================================
# Initialize Cargo and NPM Caches
# ============================================================================
echo -e "\n${GREEN}Initializing package manager caches...${NC}"

# Ensure cargo directories exist
mkdir -p ~/.cargo/{registry,git}

# Ensure npm cache directory exists
mkdir -p ~/.npm

# ============================================================================
# Display Project Structure (if workspace has content)
# ============================================================================
if [ -d "/workspace/sandbox-sync" ] || [ -d "/workspace/sandbox-switcher" ]; then
    echo -e "\n${GREEN}Project Structure:${NC}"
    tree -L 2 -d /workspace 2>/dev/null || ls -la /workspace
fi

# ============================================================================
# Environment Variables
# ============================================================================
echo -e "\n${GREEN}Environment Variables:${NC}"
echo "  RUST_BACKTRACE: ${RUST_BACKTRACE:-not set}"
echo "  CARGO_HOME: ${CARGO_HOME}"
echo "  SCRIPT_PATH: ${SCRIPT_PATH}"
echo "  DATA_PATH: ${DATA_PATH}"
echo "  LOG_LEVEL: ${LOG_LEVEL:-info}"

# ============================================================================
# Quick Start Help
# ============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Quick Start Commands:${NC}"
echo -e "${BLUE}========================================${NC}"
cat <<'EOF'

Rust Binary (sandbox-sync):
  cd sandbox-sync
  cargo build                    # Build in debug mode
  cargo build --release          # Build optimized binary
  cargo test                     # Run tests
  cargo run -- --help            # Run with args

VS Code Extension (sandbox-switcher):
  cd sandbox-switcher
  npm install                    # Install dependencies
  npm run compile                # Compile TypeScript
  npm run watch                  # Watch mode for development
  npm test                       # Run tests
  npm run package                # Create .vsix package

R Integration:
  R                              # Start R console
  source(".Rprofile")            # Load startup script

Testing:
  ./scripts/test-all.sh          # Run all tests
  ./scripts/test-sync.sh         # Test sync functionality

EOF

# ============================================================================
# Execute Command
# ============================================================================
echo -e "${GREEN}Container ready!${NC}\n"

# If no command specified, start bash
if [ $# -eq 0 ]; then
    exec /bin/bash
else
    exec "$@"
fi
