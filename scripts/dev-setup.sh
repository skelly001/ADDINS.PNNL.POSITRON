#!/bin/bash
# Development setup script
# Initializes project scaffolding for sandbox-sync development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sandbox-Sync Development Setup${NC}"
echo -e "${BLUE}========================================${NC}\n"

WORKSPACE_ROOT="${WORKSPACE_ROOT:-/workspace}"

# ============================================================================
# Create Rust Project Structure
# ============================================================================
if [ ! -d "$WORKSPACE_ROOT/sandbox-sync" ]; then
    echo -e "${YELLOW}=== Setting up Rust project ===${NC}\n"

    cd "$WORKSPACE_ROOT"
    cargo new sandbox-sync --name sandbox-sync
    cd sandbox-sync

    echo -e "${GREEN}✓ Created Rust project: sandbox-sync${NC}"

    # Create module structure
    mkdir -p src/{cli,paths,filter,walk,sync,watch}

    # Create module files
    touch src/cli.rs
    touch src/paths.rs
    touch src/filter.rs
    touch src/walk.rs
    touch src/sync.rs
    touch src/watch.rs

    echo -e "${GREEN}✓ Created module structure${NC}"

    # Create tests directory
    mkdir -p tests
    touch tests/integration_tests.rs

    echo -e "${GREEN}✓ Created tests directory${NC}"

    # Update Cargo.toml with dependencies
    cat > Cargo.toml <<'EOF'
[package]
name = "sandbox-sync"
version = "0.1.0"
edition = "2021"
authors = ["PNNL Development Team"]
description = "Fast directory structure synchronization tool for R sandbox workflows"
license = "MIT"

[dependencies]
clap = { version = "4.4", features = ["derive"] }
notify = "6.1"
ignore = "0.4"
jwalk = "0.8"
rayon = "1.8"
anyhow = "1.0"
thiserror = "1.0"
log = "0.4"
env_logger = "0.11"
globset = "0.4"

[dev-dependencies]
tempfile = "3.8"
assert_cmd = "2.0"
predicates = "3.0"

[[bin]]
name = "sandbox-sync"
path = "src/main.rs"
EOF

    echo -e "${GREEN}✓ Updated Cargo.toml with dependencies${NC}\n"
else
    echo -e "${YELLOW}Rust project already exists, skipping...${NC}\n"
fi

# ============================================================================
# Create VS Code Extension Project Structure
# ============================================================================
if [ ! -d "$WORKSPACE_ROOT/sandbox-switcher" ]; then
    echo -e "${YELLOW}=== Setting up VS Code extension project ===${NC}\n"

    mkdir -p "$WORKSPACE_ROOT/sandbox-switcher/src"
    cd "$WORKSPACE_ROOT/sandbox-switcher"

    # Create package.json
    cat > package.json <<'EOF'
{
  "name": "sandbox-switcher",
  "displayName": "Sandbox Switcher",
  "description": "Quickly switch between R script and data sandboxes in Positron",
  "version": "0.1.0",
  "publisher": "pnnl",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "sandbox.toggleRoot",
        "title": "Sandbox: Toggle Between Scripts and Data"
      },
      {
        "command": "sandbox.focusScripts",
        "title": "Sandbox: Focus Scripts"
      },
      {
        "command": "sandbox.focusData",
        "title": "Sandbox: Focus Data"
      },
      {
        "command": "sandbox.openBoth",
        "title": "Sandbox: Open Both (Multi-root)"
      },
      {
        "command": "sandbox.syncNow",
        "title": "Sandbox: Sync Now"
      }
    ],
    "keybindings": [
      {
        "command": "sandbox.toggleRoot",
        "key": "ctrl+shift+t",
        "mac": "cmd+shift+t"
      },
      {
        "command": "sandbox.focusScripts",
        "key": "ctrl+shift+s",
        "mac": "cmd+shift+s"
      },
      {
        "command": "sandbox.focusData",
        "key": "ctrl+shift+d",
        "mac": "cmd+shift+d"
      },
      {
        "command": "sandbox.syncNow",
        "key": "ctrl+shift+y",
        "mac": "cmd+shift+y"
      }
    ],
    "configuration": {
      "title": "Sandbox Switcher",
      "properties": {
        "sandbox.scriptsPath": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the scripts sandbox (Git-tracked)"
        },
        "sandbox.dataPath": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the data sandbox (OneDrive)"
        },
        "sandbox.syncBinaryPath": {
          "type": "string",
          "default": "",
          "description": "Path to sandbox-sync binary (optional, uses PATH if empty)"
        },
        "sandbox.gitkeep": {
          "type": "boolean",
          "default": true,
          "description": "Create .gitkeep files in empty directories"
        },
        "sandbox.excludes": {
          "type": "array",
          "default": [],
          "description": "Additional glob patterns to exclude from sync"
        },
        "sandbox.autoSyncOnStartup": {
          "type": "boolean",
          "default": true,
          "description": "Automatically run sync when extension activates"
        },
        "sandbox.watchDuringSession": {
          "type": "boolean",
          "default": false,
          "description": "Watch for directory changes during session"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "package": "vsce package",
    "lint": "eslint src --ext ts"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/vscode": "^1.80.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0",
    "@vscode/vsce": "^2.22.0"
  }
}
EOF

    # Create tsconfig.json
    cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
EOF

    # Create basic extension.ts
    mkdir -p src
    cat > src/extension.ts <<'EOF'
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Sandbox Switcher extension is now active');

    // TODO: Implement commands
    let toggleCommand = vscode.commands.registerCommand('sandbox.toggleRoot', () => {
        vscode.window.showInformationMessage('Toggle Root - To be implemented');
    });

    let focusScriptsCommand = vscode.commands.registerCommand('sandbox.focusScripts', () => {
        vscode.window.showInformationMessage('Focus Scripts - To be implemented');
    });

    let focusDataCommand = vscode.commands.registerCommand('sandbox.focusData', () => {
        vscode.window.showInformationMessage('Focus Data - To be implemented');
    });

    let openBothCommand = vscode.commands.registerCommand('sandbox.openBoth', () => {
        vscode.window.showInformationMessage('Open Both - To be implemented');
    });

    let syncNowCommand = vscode.commands.registerCommand('sandbox.syncNow', () => {
        vscode.window.showInformationMessage('Sync Now - To be implemented');
    });

    context.subscriptions.push(
        toggleCommand,
        focusScriptsCommand,
        focusDataCommand,
        openBothCommand,
        syncNowCommand
    );
}

export function deactivate() {}
EOF

    # Create .vscodeignore
    cat > .vscodeignore <<'EOF'
.vscode/**
.vscode-test/**
src/**
.gitignore
tsconfig.json
**/*.ts
**/*.map
node_modules/**
EOF

    echo -e "${GREEN}✓ Created VS Code extension project: sandbox-switcher${NC}\n"
else
    echo -e "${YELLOW}VS Code extension project already exists, skipping...${NC}\n"
fi

# ============================================================================
# Create Examples Directory
# ============================================================================
if [ ! -d "$WORKSPACE_ROOT/examples" ]; then
    echo -e "${YELLOW}=== Setting up examples ===${NC}\n"

    mkdir -p "$WORKSPACE_ROOT/examples"
    cd "$WORKSPACE_ROOT/examples"

    # Create sample .Rprofile
    cat > .Rprofile <<'EOF'
# Sandbox-Sync R Integration
# Auto-sync script and data directories on R startup

.sandbox_sync <- function() {
  # Configuration
  config_file <- ".sandbox.config.json"
  binary_name <- "sandbox-sync"

  # Try to find binary
  binary_path <- Sys.which(binary_name)

  if (binary_path == "") {
    # Try configured path
    if (file.exists(config_file)) {
      config <- jsonlite::fromJSON(config_file)
      if (!is.null(config$binaryPath) && file.exists(config$binaryPath)) {
        binary_path <- config$binaryPath
      }
    }
  }

  if (binary_path == "" || !file.exists(binary_path)) {
    message("sandbox-sync binary not found in PATH")
    return(invisible(NULL))
  }

  # Load configuration
  scripts_path <- Sys.getenv("SCRIPT_PATH", "")
  data_path <- Sys.getenv("DATA_PATH", "")

  if (file.exists(config_file)) {
    config <- jsonlite::fromJSON(config_file)
    if (is.null(scripts_path) || scripts_path == "") scripts_path <- config$scriptsPath
    if (is.null(data_path) || data_path == "") data_path <- config$dataPath
  }

  if (scripts_path == "" || data_path == "") {
    message("Sandbox paths not configured")
    return(invisible(NULL))
  }

  # Run sync
  tryCatch({
    message("Running sandbox-sync...")
    result <- system2(
      binary_path,
      c("sync", "--scripts", scripts_path, "--data", data_path),
      stdout = TRUE,
      stderr = TRUE
    )

    if (!is.null(attr(result, "status")) && attr(result, "status") != 0) {
      warning("sandbox-sync failed with status: ", attr(result, "status"))
    } else {
      message("Sandbox sync completed successfully")
    }
  }, error = function(e) {
    warning("Error running sandbox-sync: ", e$message)
  })

  invisible(NULL)
}

# Run sync on startup
if (interactive()) {
  .sandbox_sync()
}
EOF

    # Create sample config
    cat > sandbox.config.json <<'EOF'
{
  "scriptsPath": "/test-scripts",
  "dataPath": "/test-data",
  "binaryPath": "",
  "gitkeep": true,
  "excludes": [
    ".git",
    ".Rproj.user",
    "node_modules"
  ]
}
EOF

    echo -e "${GREEN}✓ Created examples directory with .Rprofile and config${NC}\n"
else
    echo -e "${YELLOW}Examples directory already exists, skipping...${NC}\n"
fi

# ============================================================================
# Create Documentation Directory
# ============================================================================
if [ ! -d "$WORKSPACE_ROOT/docs" ]; then
    echo -e "${YELLOW}=== Setting up documentation ===${NC}\n"

    mkdir -p "$WORKSPACE_ROOT/docs"

    echo -e "${GREEN}✓ Created docs directory${NC}\n"
else
    echo -e "${YELLOW}Docs directory already exists, skipping...${NC}\n"
fi

# ============================================================================
# Make Scripts Executable
# ============================================================================
echo -e "${YELLOW}=== Making scripts executable ===${NC}\n"

chmod +x "$WORKSPACE_ROOT/scripts/"*.sh 2>/dev/null || true

echo -e "${GREEN}✓ Scripts are executable${NC}\n"

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${GREEN}Project structure created:${NC}"
tree -L 2 "$WORKSPACE_ROOT" 2>/dev/null || find "$WORKSPACE_ROOT" -maxdepth 2 -type d

echo -e "\n${BLUE}Next steps:${NC}"
echo "  1. Build Rust binary:       cd sandbox-sync && cargo build"
echo "  2. Build extension:          cd sandbox-switcher && npm install && npm run compile"
echo "  3. Run tests:                ./scripts/test-all.sh"
echo "  4. Build everything:         ./scripts/build-all.sh"
echo ""
