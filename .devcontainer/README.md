# Dev Container Configuration

This directory contains VS Code Dev Container configuration for developing inside the Docker container.

## Quick Start with Dev Containers

### 1. Install Dev Containers Extension

In VS Code or Positron:
- Press `Ctrl+Shift+X` to open Extensions
- Search for "Dev Containers"
- Install "Dev Containers" by Microsoft

### 2. Open in Container

**Method 1: Command Palette**
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
2. Type "Dev Containers: Reopen in Container"
3. Press Enter

**Method 2: Notification**
- VS Code should show a notification asking if you want to reopen in container
- Click "Reopen in Container"

**Method 3: Bottom-left corner**
- Click the green icon in the bottom-left corner
- Select "Reopen in Container"

### 3. Wait for Container to Build

First time takes 5-10 minutes as it builds the container and installs extensions.

### 4. You're Inside the Container!

Once ready:
- Your terminal is running inside the container
- All VS Code extensions are available
- Claude Code works normally
- Files save to your Windows directory

### 5. Initialize the Project

In the VS Code terminal (already inside container):

```bash
# Initialize project structure
./scripts/dev-setup.sh

# Build everything
./scripts/build-all.sh

# Run tests
./scripts/test-all.sh
```

## What's Installed in the Container

### Extensions (Automatically Installed)

- **Rust**: rust-analyzer, LLDB debugger, crates manager
- **TypeScript/JavaScript**: ESLint, Prettier
- **R**: R language support
- **General**: GitLens, spell checker, TOML support

### Development Tools

- Rust (stable + cross-compilation)
- Node.js 20.x LTS
- R 4.3+
- Git, build tools, utilities

## Using Claude Code in the Container

### Claude Code Works Normally

Once you're in the container, Claude Code operates exactly as it would on your host:

```
1. Press Ctrl+L (or Cmd+L) to open Claude Code
2. Ask Claude to help build components
3. Claude can read/write files in /workspace
4. All changes save to your Windows directory
5. Claude can run cargo, npm, R commands in the container terminal
```

### Example Prompts for Claude

```
"Help me implement the Rust binary's CLI module in src/cli.rs"

"Create the path normalization logic in src/paths.rs"

"Implement the directory sync algorithm in src/sync.rs"

"Build the VS Code extension commands in src/extension.ts"

"Write tests for the sync functionality"
```

## Benefits of Dev Containers

✅ **Consistent Environment**: Everyone uses the same tools and versions
✅ **No Host Pollution**: Development tools don't clutter your Windows installation
✅ **Easy Setup**: One command to get started
✅ **Full IDE Support**: IntelliSense, debugging, Git integration all work
✅ **Claude Code Integration**: Use AI assistance directly in the container
✅ **Persistent**: Files save to your Windows drive

## File Locations

### On Windows
```
C:\Users\kell343\dev\ADDINS.PNNL.VSC.DC\
├── sandbox-sync/        ← Your Rust code
├── sandbox-switcher/    ← Your extension code
└── examples/            ← R integration
```

### In Container
```
/workspace/
├── sandbox-sync/        ← Same files
├── sandbox-switcher/    ← Same files
└── examples/            ← Same files
```

Both paths point to the **same files** - edits sync automatically!

## Troubleshooting

### Container won't start?

1. Make sure Docker Desktop is running
2. Try rebuilding: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"
3. Check Docker logs in the Output panel

### Extensions not working?

- Extensions install automatically on first container start
- If missing, rebuild: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

### Want to rebuild from scratch?

```
Ctrl+Shift+P → "Dev Containers: Rebuild Container Without Cache"
```

### Need to exit the container?

```
Ctrl+Shift+P → "Dev Containers: Reopen Folder Locally"
```

Your files are safe on Windows - you can always reopen in container later.

## Environment Variables

Configure in your `.env` file:

```env
SCRIPT_PATH=C:\Users\kell343\dev\r_script_sandbox2_vscode_test
DATA_PATH=C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test
```

These paths are automatically mounted as `/test-scripts` and `/test-data` in the container.

## Advanced: Debugging

### Rust Debugging

The LLDB extension is pre-configured. Just:
1. Set breakpoints in your Rust code
2. Press `F5` to start debugging
3. Or use the Debug panel

### TypeScript Debugging

For the extension:
1. Open `sandbox-switcher` in the workspace
2. Press `F5` to launch Extension Development Host
3. Set breakpoints and debug normally

## Tips

- **Terminal**: Use the integrated terminal (Ctrl+\`) - it's already in the container
- **Git**: Works normally - commits are saved on Windows
- **Multiple terminals**: Open as many as you need - all are in the container
- **Extensions sync**: Your personal VS Code settings don't sync to container (by design)
