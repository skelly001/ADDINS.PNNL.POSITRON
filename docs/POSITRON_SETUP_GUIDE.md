# Positron Setup Guide

Complete reference for installing, configuring, and using Sandbox Sync in Positron IDE.

## Table of Contents

- [System Requirements](#system-requirements)
- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
  - [Extension Installation](#extension-installation)
  - [Binary Installation](#binary-installation)
  - [R Configuration](#r-configuration)
- [Configuration Reference](#configuration-reference)
- [Extension Behavior](#extension-behavior)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Uninstallation](#uninstallation)

## System Requirements

### Required

- **Positron IDE** or **VS Code** 1.80.0 or newer
- **R** 4.0.0 or newer
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- Two directories:
  - Script sandbox: Path must contain `r_script_sandbox` segment
  - Data sandbox: Any location (typically OneDrive or network drive)

### Optional

- **Git** (if scripts are version controlled)
- **jsonlite** R package (for prettier sync output)

## Architecture Overview

Sandbox Sync consists of three components:

### 1. Rust Binary (`sandbox-sync`)

A fast, cross-platform CLI tool that:
- Performs bidirectional directory structure mirroring
- Never touches files (directories only)
- Validates paths and handles errors gracefully
- Outputs JSON for programmatic parsing

**Commands:**
- `sync-full`: Full bidirectional sync of all directories
- `ensure-path`: Ensure a single relative path exists on both sides

### 2. VS Code Extension (`sandbox-switcher`)

A Positron/VS Code extension that:
- Detects sandbox configuration automatically
- Adds dual workspace roots (Scripts and Data)
- Provides keyboard shortcuts for instant directory switching
- Sends `setwd()` commands to the R console
- Invokes micro-syncs when needed

### 3. R Integration

R startup files that:
- `.Renviron`: Defines `SCRIPT_PATH` and `DATA_PATH`
- `.Rprofile`: Runs full sync on R session start

## Installation

### Extension Installation

#### Method 1: Install from VSIX (Recommended)

1. Download or locate the `.vsix` file:
   ```
   sandbox-switcher/sandbox-switcher-0.1.0.vsix
   ```

2. Install via Command Palette:
   - Open Positron/VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type: `Extensions: Install from VSIX...`
   - Select the `.vsix` file

3. Reload window when prompted

#### Method 2: Command Line

```bash
code --install-extension /path/to/sandbox-switcher-0.1.0.vsix
```

#### Method 3: Build from Source

```bash
cd sandbox-switcher
npm install
npm run compile
npm run package  # Creates .vsix file
code --install-extension sandbox-switcher-0.1.0.vsix
```

### Binary Installation

The extension bundles platform-specific binaries, but they need to be made accessible system-wide.

#### Windows (Recommended: System32)

**Option A: Copy to System32** (requires admin)

```powershell
# Run PowerShell as Administrator
$ExtPath = "$env:USERPROFILE\.positron\extensions\pnnl.sandbox-switcher-0.1.0"
Copy-Item "$ExtPath\bin\win32-x64\sandbox-sync.exe" -Destination "C:\Windows\System32\"
```

**Option B: Copy to User Directory** (no admin needed)

```powershell
# Create bin directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"

# Copy binary
$ExtPath = "$env:USERPROFILE\.positron\extensions\pnnl.sandbox-switcher-0.1.0"
Copy-Item "$ExtPath\bin\win32-x64\sandbox-sync.exe" -Destination "$env:USERPROFILE\bin\"

# Add to PATH (one-time, add to PowerShell profile for persistence)
$env:PATH += ";$env:USERPROFILE\bin"
```

To make PATH change permanent, add to your PowerShell profile:

```powershell
# Edit profile
notepad $PROFILE

# Add this line:
$env:PATH += ";$env:USERPROFILE\bin"
```

**Verify:**

```powershell
sandbox-sync --version
# Should output: sandbox-sync 0.1.0
```

#### Linux

```bash
# Copy to user local bin
mkdir -p ~/.local/bin
cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.1.0/bin/linux-x64/sandbox-sync ~/.local/bin/

# Make executable
chmod +x ~/.local/bin/sandbox-sync

# Add to PATH (if not already in PATH)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**Verify:**

```bash
sandbox-sync --version
```

#### macOS

```bash
# Copy to local bin (requires sudo)
sudo cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.1.0/bin/darwin-x64/sandbox-sync /usr/local/bin/

# Make executable
sudo chmod +x /usr/local/bin/sandbox-sync
```

**Verify:**

```bash
sandbox-sync --version
```

#### Build from Source (All Platforms)

If you need to build the binary yourself:

```bash
cd sandbox-sync

# Install Rust if needed: https://rustup.rs/

# Build release binary
cargo build --release

# Binary location: target/release/sandbox-sync (or sandbox-sync.exe on Windows)
# Copy to desired location in PATH
```

### R Configuration

#### Step 1: Create .Renviron

Create `.Renviron` in your **script sandbox root** directory.

**Location:** The directory that contains `r_script_sandbox` in its path and serves as the root of your scripts.

**Example paths:**
- Windows: `C:\Users\jdoe\projects\r_script_sandbox\.Renviron`
- macOS/Linux: `/home/jdoe/projects/r_script_sandbox/.Renviron`

**Template:**

```bash
# .Renviron - Sandbox Sync Configuration

# REQUIRED: Absolute path to scripts sandbox (Git-tracked)
SCRIPT_PATH="C:/path/to/r_script_sandbox"

# REQUIRED: Absolute path to data sandbox (OneDrive/cloud)
DATA_PATH="C:/path/to/data_sandbox"
```

**Rules:**
1. Use **absolute paths** (full paths from root)
2. Use **forward slashes** (`/`) on all platforms, including Windows
3. Use **double quotes** around paths
4. No trailing slashes
5. Script path must contain `r_script_sandbox` as a path segment
6. Paths may contain spaces if properly quoted

**Example (Windows):**

```bash
SCRIPT_PATH="C:/Users/Jane Doe/Documents/projects/r_script_sandbox"
DATA_PATH="C:/Users/Jane Doe/OneDrive - PNNL/data_sandbox"
```

**Example (macOS/Linux):**

```bash
SCRIPT_PATH="/home/jdoe/projects/r_script_sandbox"
DATA_PATH="/mnt/onedrive/data_sandbox"
```

#### Step 2: Create .Rprofile

Copy the template to your script sandbox root:

```bash
cp examples/.Rprofile.template /path/to/r_script_sandbox/.Rprofile
```

**Or create manually** with this content:

```r
# .Rprofile for sandbox-sync
# Runs on R session startup

.sandbox_sync_startup <- function() {
  script_dir <- getwd()

  # Load .Renviron from script directory
  renviron_path <- file.path(script_dir, ".Renviron")
  if (!file.exists(renviron_path)) {
    message("Warning: .Renviron not found in ", script_dir)
    return(invisible(NULL))
  }

  readRenviron(renviron_path)

  scripts_path <- Sys.getenv("SCRIPT_PATH")
  data_path <- Sys.getenv("DATA_PATH")

  if (scripts_path == "" || data_path == "") {
    message("Warning: SCRIPT_PATH or DATA_PATH not defined")
    return(invisible(NULL))
  }

  # Safety check: only run in r_script_sandbox
  if (!grepl("\\br_script_sandbox\\b", script_dir)) {
    message("Warning: Not in r_script_sandbox")
    return(invisible(NULL))
  }

  # Find binary
  binary_path <- Sys.which("sandbox-sync")
  if (binary_path == "") {
    message("Warning: sandbox-sync binary not found")
    return(invisible(NULL))
  }

  # Run sync
  message("Running sandbox sync...")
  cmd <- sprintf(
    '%s sync-full --scripts "%s" --data "%s" --json',
    binary_path, scripts_path, data_path
  )

  tryCatch({
    output <- system(cmd, intern = TRUE)

    if (requireNamespace("jsonlite", quietly = TRUE)) {
      json <- jsonlite::fromJSON(paste(output, collapse = "\n"))
      if (json$ok) {
        message(sprintf(
          "Synced %d directories (%d created, %d existing) in %dms",
          json$created_total + json$existing_total,
          json$created_total, json$existing_total, json$duration_ms
        ))
      } else {
        message("Sync failed: ", paste(json$errors, collapse = ", "))
      }
    } else {
      message(paste(output, collapse = "\n"))
    }
  }, error = function(e) {
    message("Sync error: ", e$message)
  })

  invisible(NULL)
}

.sandbox_sync_startup()
rm(.sandbox_sync_startup)
```

**Key behaviors:**
- Runs automatically when R session starts
- Loads `.Renviron` from script directory
- Validates configuration before running
- Calls `sandbox-sync sync-full` with JSON output
- Prints concise sync summary to console
- Handles errors gracefully

#### Step 3: Install jsonlite (Optional but Recommended)

For prettier console output:

```r
install.packages("jsonlite")
```

## Configuration Reference

### .Renviron Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SCRIPT_PATH` | Yes | Absolute path to scripts sandbox root | `"C:/projects/r_script_sandbox"` |
| `DATA_PATH` | Yes | Absolute path to data sandbox root | `"C:/OneDrive/data_sandbox"` |

### Extension Settings

Currently, the extension uses convention over configuration and doesn't require settings. Future versions may add:

- Custom binary path
- Sync exclusions
- Keyboard shortcut customization

### CLI Options

**sync-full:**

```bash
sandbox-sync sync-full --scripts <PATH> --data <PATH> [--json]
```

Options:
- `--scripts`: Path to scripts sandbox
- `--data`: Path to data sandbox
- `--json`: Output JSON instead of human-readable text

**ensure-path:**

```bash
sandbox-sync ensure-path --scripts <PATH> --data <PATH> --relative <REL> [--json]
```

Options:
- `--scripts`: Path to scripts sandbox
- `--data`: Path to data sandbox
- `--relative`: Relative path to ensure on both sides
- `--json`: Output JSON

## Extension Behavior

### Activation

The extension activates when:
1. VS Code/Positron starts
2. Any workspace folder path contains `r_script_sandbox` as a case-sensitive path segment

### Sandbox Detection

**Detection logic:**
1. Scan all workspace folders for `r_script_sandbox` in path
2. Truncate path at `r_script_sandbox` (inclusive) to get scripts base
3. Load `.Renviron` from scripts base
4. Read `SCRIPT_PATH` and `DATA_PATH`
5. Validate `SCRIPT_PATH` matches derived scripts base
6. Check if `DATA_PATH` exists and is accessible

### Workspace Roots

When activated successfully, the extension adds two workspace roots:

- **Scripts: r_script_sandbox** → Points to `SCRIPT_PATH`
- **Data: data_sandbox** → Points to `DATA_PATH` (if accessible)

These appear in the Explorer as separate root folders, allowing you to navigate both sandboxes simultaneously.

### Commands

All commands are accessible via Command Palette (`Ctrl+Shift+P`):

| Command | Default Keybinding | Description |
|---------|-------------------|-------------|
| `Sandbox: Switch Working Directory to Opposite Sandbox` | `Ctrl+Alt+W` | Switch R working directory to paired folder |
| `Sandbox: Reveal Paired Folder` | — | Reveal paired folder in Explorer |
| `Sandbox: Sync Directories Now` | — | Manually trigger full sync |
| `Sandbox: Add Data Workspace Root` | — | Re-add Data root if removed |
| `Sandbox: Setup Paired Workspace Folders` | — | Re-run workspace setup |

### Directory Switching Behavior

When you invoke **Switch WD to Opposite**:

1. **Context detection** (in order of priority):
   - Active editor file path
   - Selected item in Explorer
   - Last-used sandbox path

2. **Path validation**:
   - Ensure context is within `SCRIPT_PATH` or `DATA_PATH`
   - If outside both, show notice and abort

3. **Compute relative path**:
   - If in Scripts: `rel = context relative to SCRIPT_PATH`
   - If in Data: `rel = context relative to DATA_PATH`

4. **Micro-sync** (ensure-path):
   - Run `sandbox-sync ensure-path --relative <rel>`
   - Create missing parent directories on both sides
   - Cache ensured paths to avoid repeated syncs

5. **Set working directory**:
   - Send `setwd("<opposite_path>")` to active R console
   - If multiple R terminals, prompt user to select one

6. **Reveal in Explorer**:
   - Expand and highlight the paired folder in Explorer

### Micro-Sync Policy

To minimize overhead, the extension uses **lazy micro-sync**:

- **Full sync** runs only on R startup (via `.Rprofile`)
- **Micro-sync** (ensure-path) runs only when:
  - User switches to a folder for the first time in the session
  - User invokes "Reveal Paired Folder"
  - User manually triggers sync

**Caching:** Ensured paths are cached per session to avoid redundant calls.

**Debouncing:** Multiple rapid requests to the same path are debounced.

### DATA_PATH Unavailability Handling

If `DATA_PATH` is unavailable (offline OneDrive, unmounted network drive):

1. **On activation**:
   - Show warning notification
   - Add only Scripts root to workspace
   - Offer "Retry" action

2. **On directory switch/reveal**:
   - Show non-blocking warning
   - Skip ensure-path and Data-side operations
   - Keep R session untouched
   - Scripts-side operations continue to work

3. **On manual sync**:
   - CLI returns error code 3
   - Extension shows error message
   - R startup prints warning but doesn't crash

## Advanced Usage

### Working with Subfolders

The tool works seamlessly with nested folder structures:

```
r_script_sandbox/
├── project_a/
│   ├── analysis/
│   ├── models/
│   └── scripts/
└── project_b/
    └── data_prep/
```

Each subfolder is paired with the corresponding path in `data_sandbox`.

**Example:** If you're in `r_script_sandbox/project_a/models/`, switching will set WD to `data_sandbox/project_a/models/`.

### Multiple R Terminals

If you have multiple R consoles running:

1. Extension detects all active R terminals
2. Prompts you to select which terminal to send `setwd()` to
3. Remembers your choice for the session

### Git Integration

The tool is designed to work alongside Git:

- Scripts sandbox: Typically a Git repository
- Data sandbox: Typically ignored by Git (`.gitignore` or separate location)
- Extension doesn't interfere with Git operations
- `.Renviron` and `.Rprofile` can be committed to share config

**Recommended `.gitignore` for scripts sandbox:**

```gitignore
# R
.Rhistory
.RData
.Rproj.user

# Sandbox Sync (if you want user-specific paths)
.Renviron

# Or commit .Renviron.example as template
```

### OneDrive Optimization

The tool is **OneDrive-friendly** by design:

- **Directory-only operations**: Never reads/writes files, so no placeholder hydration
- **Minimal API calls**: Only creates directories; doesn't enumerate file contents
- **No watchers**: Doesn't monitor file changes that could trigger OneDrive sync

**Result:** Works efficiently even with large OneDrive directories containing TBs of data.

### Custom Keyboard Shortcuts

To customize the keyboard shortcut:

1. Open Keyboard Shortcuts: `File > Preferences > Keyboard Shortcuts`
2. Search for "Sandbox: Switch"
3. Click the pencil icon to edit
4. Press your desired key combination

### CLI Direct Usage

You can use the CLI directly outside of R/Positron:

**Full sync:**

```bash
sandbox-sync sync-full --scripts "C:/projects/r_script_sandbox" --data "D:/data_sandbox" --json
```

**Ensure specific path:**

```bash
sandbox-sync ensure-path \
  --scripts "C:/projects/r_script_sandbox" \
  --data "D:/data_sandbox" \
  --relative "project_a/models"
```

## Troubleshooting

### Extension Not Activating

**Symptoms:**
- No workspace roots appear
- Commands not available in Command Palette

**Causes & Fixes:**

1. **Workspace doesn't contain `r_script_sandbox`:**
   - Extension only activates in workspaces with this exact folder name (case-sensitive)
   - Rename your folder to include `r_script_sandbox`

2. **`.Renviron` missing or malformed:**
   - Check that `.Renviron` exists in scripts sandbox root
   - Validate syntax: `KEY="value"` format
   - Check Output panel: `View > Output > Sandbox Sync`

3. **`DATA_PATH` unavailable:**
   - Extension still activates but only adds Scripts root
   - Check if OneDrive is online or network drive is mounted

### Binary Not Found

**Symptoms:**
- "sandbox-sync binary not found in PATH"
- Sync doesn't run on R startup

**Fixes:**

1. **Verify binary location:**
   ```bash
   # Windows
   where.exe sandbox-sync

   # macOS/Linux
   which sandbox-sync
   ```

2. **Add to PATH:**
   - Windows: Copy to System32 or add binary directory to PATH
   - macOS/Linux: Copy to `/usr/local/bin` or `~/.local/bin`

3. **Check permissions:**
   ```bash
   # macOS/Linux: ensure executable
   chmod +x /path/to/sandbox-sync
   ```

### R Working Directory Not Changing

**Symptoms:**
- Extension shows success but `getwd()` unchanged in R

**Causes & Fixes:**

1. **No active R terminal:**
   - Ensure R console is running
   - Start R console: `Ctrl+Shift+C`

2. **Multiple R terminals:**
   - Extension will prompt you to select one
   - Ensure you select the correct terminal

3. **R console error:**
   - Check R console for error messages
   - Path might be invalid or inaccessible

4. **Positron-specific issue:**
   - Try restarting R console
   - Check Positron's R integration is working

### Paths with Spaces Not Working

**Symptoms:**
- Sync fails
- R can't set working directory
- Errors about invalid paths

**Fixes:**

1. **Use forward slashes:**
   ```bash
   # Correct
   SCRIPT_PATH="C:/Users/John Doe/r_script_sandbox"

   # Wrong
   SCRIPT_PATH="C:\Users\John Doe\r_script_sandbox"
   ```

2. **Use quotes:**
   ```bash
   # Correct
   SCRIPT_PATH="C:/path with spaces/r_script_sandbox"

   # Wrong
   SCRIPT_PATH=C:/path with spaces/r_script_sandbox
   ```

3. **No trailing slashes:**
   ```bash
   # Correct
   SCRIPT_PATH="C:/projects/r_script_sandbox"

   # Wrong
   SCRIPT_PATH="C:/projects/r_script_sandbox/"
   ```

### Sync Slow or Hangs

**Symptoms:**
- Sync takes a long time
- R startup hangs

**Causes & Fixes:**

1. **Large directory tree:**
   - Sync time scales with number of directories (not files)
   - First sync may take longer; subsequent syncs are faster
   - Consider excluding large temp directories

2. **OneDrive throttling:**
   - OneDrive may temporarily throttle API calls
   - Wait and retry

3. **Network drive latency:**
   - Network drives have higher latency than local drives
   - Consider caching or using local data replica

### Permission Errors

**Symptoms:**
- "Access denied" errors
- "Cannot create directory" errors

**Causes & Fixes:**

1. **Read-only filesystem:**
   - Ensure both sandboxes are writable
   - Check OneDrive isn't in read-only mode

2. **Locked by another process:**
   - Another program might have directory locked
   - Close OneDrive sync client temporarily
   - Retry after a few seconds (CLI has retry logic)

3. **Insufficient permissions:**
   - Ensure you have write permissions on both sandboxes
   - On Windows, run Positron as admin (not recommended long-term)

### JSON Parsing Errors in R

**Symptoms:**
- R startup shows raw JSON instead of formatted message
- "Could not parse JSON" warnings

**Fixes:**

1. **Install jsonlite:**
   ```r
   install.packages("jsonlite")
   ```

2. **Check CLI output:**
   - Run CLI manually to verify JSON is valid
   - CLI might be outputting error message instead of JSON

### Extension Commands Missing

**Symptoms:**
- Commands don't appear in Command Palette
- Keyboard shortcuts don't work

**Fixes:**

1. **Reload window:**
   - `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Reinstall extension:**
   ```bash
   code --uninstall-extension pnnl.sandbox-switcher
   code --install-extension /path/to/sandbox-switcher-0.1.0.vsix
   ```

3. **Check extension is enabled:**
   - `Extensions` view → Search "Sandbox Switcher"
   - Ensure it's enabled

### DATA_PATH Offline/Unavailable

**Symptoms:**
- "DATA_PATH unavailable" warning
- Data workspace root missing

**Expected Behavior:**
- This is by design when OneDrive is offline or network drive unmounted
- Scripts-side operations continue to work
- Extension offers "Retry" when DATA_PATH becomes available

**Fixes:**

1. **Bring DATA_PATH online:**
   - Connect to network
   - Sign in to OneDrive
   - Mount network drive

2. **Retry in extension:**
   - Look for notification with "Retry" button
   - Or reload window: `Ctrl+Shift+P` → "Developer: Reload Window"

## Uninstallation

### Remove Extension

```bash
code --uninstall-extension pnnl.sandbox-switcher
```

Or via UI:
1. Open Extensions view
2. Find "Sandbox Switcher"
3. Click gear icon → Uninstall

### Remove Binary

**Windows:**

```powershell
Remove-Item "C:\Windows\System32\sandbox-sync.exe"
```

**macOS/Linux:**

```bash
sudo rm /usr/local/bin/sandbox-sync
# or
rm ~/.local/bin/sandbox-sync
```

### Remove R Configuration

Delete `.Rprofile` and `.Renviron` from script sandbox root:

```bash
rm /path/to/r_script_sandbox/.Rprofile
rm /path/to/r_script_sandbox/.Renviron
```

Or keep them for future use.

## Best Practices

1. **Commit configuration templates:** Commit `.Renviron.example` and `.Rprofile` to Git so team members can copy and customize.

2. **Use relative imports in R:** Within scripts, use relative paths so code works whether WD is in scripts or data sandbox.

3. **Separate code and data:** Keep scripts in scripts sandbox, data files in data sandbox. Never mix.

4. **Periodic full sync:** Occasionally run manual sync to catch any missed directories.

5. **Monitor sync output:** Watch R console on startup to catch sync issues early.

6. **Document paths:** In your project README, document expected folder structure so sync works correctly.

## Support

For issues, questions, or feature requests:

- **GitHub Issues:** [https://github.com/pnnl/sandbox-sync/issues](https://github.com/pnnl/sandbox-sync/issues)
- **Documentation:** [https://github.com/pnnl/sandbox-sync/docs](https://github.com/pnnl/sandbox-sync/docs)
- **Architecture:** See [CLAUDE.md](../CLAUDE.md) for complete specification

---

**Happy coding with seamless sandbox sync!** 🚀
