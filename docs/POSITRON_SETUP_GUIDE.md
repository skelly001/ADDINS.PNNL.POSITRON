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
  - Data sandbox: Any location (typically a cloud drive or network drive)

### Optional

- **Git** (if scripts are version controlled)

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
- Detects the sandbox from the folder you have open
- Provides one keyboard shortcut for switching the R working directory
- Sends a single `setwd()` command to the R console
- Creates the paired folders when they are first used (micro-sync)
- Can add the paired Scripts and Data folders as workspace roots, on request

### 3. R Integration

- `.Renviron` in the sandbox root: the single record of the sandbox paths
  (defines `DATA_PATH`)
- A path-free block in `~/.Rprofile`: loads that `.Renviron` and runs a full
  sync whenever R starts inside the sandbox

## Installation

### Extension Installation

#### Method 1: Install from VSIX (Recommended)

1. Download or locate the `.vsix` file:
   ```
   sandbox-switcher/sandbox-switcher-0.2.0.vsix
   ```

2. Install via Command Palette:
   - Open Positron/VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type: `Extensions: Install from VSIX...`
   - Select the `.vsix` file

3. Reload window when prompted

#### Method 2: Command Line

```bash
code --install-extension /path/to/sandbox-switcher-0.2.0.vsix
```

#### Method 3: Build from Source

```bash
cd sandbox-switcher
npm install
npm run compile
npm run package  # Creates .vsix file
code --install-extension sandbox-switcher-0.2.0.vsix
```

### Binary Installation

The extension bundles platform-specific binaries, but they need to be made accessible system-wide.

#### Windows (Recommended: System32)

**Option A: Copy to System32** (requires admin)

```powershell
# Run PowerShell as Administrator
$ExtPath = "$env:USERPROFILE\.positron\extensions\pnnl.sandbox-switcher-0.2.0"
Copy-Item "$ExtPath\bin\win32-x64\sandbox-sync.exe" -Destination "C:\Windows\System32\"
```

**Option B: Copy to User Directory** (no admin needed)

```powershell
# Create bin directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"

# Copy binary
$ExtPath = "$env:USERPROFILE\.positron\extensions\pnnl.sandbox-switcher-0.2.0"
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
# Should output: sandbox-sync 0.2.0
```

#### Linux

```bash
# Copy to user local bin
mkdir -p ~/.local/bin
cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.2.0/bin/linux-x64/sandbox-sync ~/.local/bin/

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
sudo cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.2.0/bin/darwin-arm64/sandbox-sync /usr/local/bin/

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

Create `.Renviron` in the root of your scripts sandbox. This is the **only**
place the sandbox paths are recorded: the extension reads it directly, and the
block in `~/.Rprofile` (Step 2) loads it into R.

**Location:** the folder whose name starts with `r_script_sandbox`.

**Example paths:**
- Windows: `C:\Users\jdoe\projects\r_script_sandbox\.Renviron`
- macOS/Linux: `/home/jdoe/projects/r_script_sandbox/.Renviron`

**Template:**

```bash
# .Renviron - Sandbox Sync Configuration

# REQUIRED: Absolute path to data sandbox (cloud drive)
DATA_PATH="C:/path/to/data_sandbox"
```

**Rules:**
1. Use an **absolute path** (full path from root)
2. Use **forward slashes** (`/`) on all platforms, including Windows
3. Use **double quotes** around the path; it may then contain spaces
4. `SCRIPT_PATH` is optional and best left out: it defaults to the folder the
   `.Renviron` is in. If you do set it and it differs from that folder, the
   `.Renviron` value is used and a warning is logged.

**Example (Windows):**

```bash
DATA_PATH="C:/Users/Jane Doe/Cloud Drive/data_sandbox"
```

**Example (macOS/Linux):**

```bash
DATA_PATH="/mnt/cloud_drive/data_sandbox"
```

#### Step 2: Add the startup block to `~/.Rprofile`

Copy the block in `examples/.Rprofile.template` into the `.Rprofile` in your
**home directory**. In R, `path.expand("~/.Rprofile")` shows where that is (on
Windows it is usually in `Documents`). Create the file if it does not exist.

**Key behaviors:**
- Contains no paths
- Does nothing unless R starts inside a folder whose name starts with
  `r_script_sandbox` (the sandbox root or any project subfolder)
- Loads the root `.Renviron`, so `Sys.getenv("DATA_PATH")` and
  `Sys.getenv("SCRIPT_PATH")` work in the session. Values for these two that
  came from anywhere else are replaced.
- Runs `sandbox-sync sync-full` and prints its one-line result
- If `DATA_PATH` is unavailable or the binary is missing, prints a message and
  continues

**R runs only one `.Rprofile` per session:** the one in the startup folder if
there is one, otherwise the one in your home directory. So:
- Do not keep a `.Rprofile` in the sandbox root
- If a project subfolder needs its own `.Rprofile`, make its first line
  `source("~/.Rprofile")`

**Upgrading from an earlier setup:** delete the old `.Rprofile` from the
sandbox root, and remove `SCRIPT_PATH` and `DATA_PATH` from `~/.Renviron` if
you had copied them there.

## Configuration Reference

### .Renviron Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATA_PATH` | Yes | Absolute path to data sandbox root | `"C:/CloudDrive/data_sandbox"` |
| `SCRIPT_PATH` | No | Absolute path to scripts sandbox root. Defaults to the folder containing `.Renviron` | `"C:/projects/r_script_sandbox"` |

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
- `--relative`: Relative path to ensure on both sides (empty means the roots)
- `--json`: Output JSON

`--scripts-path` and `--data-path` are accepted as longer names for `--scripts`
and `--data`.

**Exit codes:** 0 success, 2 invalid arguments, 3 DATA_PATH unavailable,
4 filesystem error (including a file that has the same name as a folder to be
mirrored), 5 unexpected error.

## Extension Behavior

### Activation

The extension loads when VS Code/Positron starts and looks at the open
workspace folders. It never changes the workspace or touches the R session on
its own.

- **Not inside a sandbox:** it stays silent (no popup). Running a sandbox
  command shows "Not inside an r_script_sandbox folder" in the status bar.
- **Inside a sandbox with a missing or invalid `.Renviron`:** it shows a
  warning popup saying what is wrong.

### Sandbox Detection

**Detection logic** (repeated every time a command runs, so edits to
`.Renviron` and a `DATA_PATH` that comes back are picked up without reloading):
1. Find the first workspace folder whose path contains a folder name starting
   with `r_script_sandbox` (case-sensitive)
2. Truncate the path at that folder (inclusive) to get the scripts root
3. Load `.Renviron` from the scripts root and read `DATA_PATH` (and
   `SCRIPT_PATH` if present)
4. Check whether `DATA_PATH` exists whenever a command needs the Data side

### Workspace Roots

**Sandbox: Setup Paired Workspace Folders** adds the paired folders for the
project you have open as two workspace roots:

- **Scripts: <folder>** → the folder under the scripts sandbox
- **Data: <folder>** → the paired folder under the data sandbox (if available)

This is a manual command because changing workspace folders while the R
runtime is starting cancels its startup in Positron. If `DATA_PATH` was
unavailable, run the command again once it is back.

### Commands

All commands are accessible via Command Palette (`Ctrl+Shift+P`):

| Command | Default Keybinding | Description |
|---------|-------------------|-------------|
| `Sandbox: Switch Working Directory to Opposite Sandbox` | `Ctrl+Alt+W` | Switch R working directory to paired folder |
| `Sandbox: Reveal Paired Folder` | — | Reveal paired folder in Explorer (also in the Explorer right-click menu) |
| `Sandbox: Sync Directories Now` | — | Manually trigger full sync |
| `Sandbox: Setup Paired Workspace Folders` | — | Add the paired Scripts and Data folders to the workspace |

### Directory Switching Behavior

When you invoke **Switch WD to Opposite**:

1. **Choose the project folder** (relative to the sandbox roots):
   - The folder of the active editor's file, if it is a saved file inside a
     project folder of either sandbox
   - Otherwise the first open workspace folder that is a project folder
   - The sandbox roots themselves never qualify. If no project folder is
     found, the status bar shows "Open a file in a project folder to switch"
     and nothing else happens.

2. **Choose the side:**
   - The opposite of the side last set for that same project folder in this
     session
   - Data, if the folder has not been switched yet
   - The remembered side is never used to choose the folder, so a different
     project never inherits the previous project's folder.

3. **Micro-sync** (ensure-path):
   - If either paired folder is missing, run `sandbox-sync ensure-path` and
     wait for it to finish

4. **Set working directory:**
   - Send `setwd("<target>")` to the R console
   - Show the destination in the status bar, e.g.
     `R working directory → Data: models`

5. **Reveal in Explorer:**
   - Highlight the target folder if it is in the workspace

### Micro-Sync Policy

- **Full sync** runs on R startup (via the `~/.Rprofile` block) whenever R
  starts inside the sandbox, or on demand via **Sandbox: Sync Directories Now**.
  It only creates directories that are missing on one side; a tree that is
  already in sync is not touched.
- **Micro-sync** (ensure-path) runs only when a paired folder that is about to
  be used does not exist yet: on a working directory switch, a paired reveal,
  or workspace folder setup.

### DATA_PATH Unavailability Handling

Availability is checked each time a command runs. If `DATA_PATH` is
unavailable (offline cloud drive, unmounted network drive):

1. **On directory switch to Data, or reveal:**
   - Show a non-blocking warning
   - Skip ensure-path and Data-side operations
   - Keep the R session untouched

2. **On workspace folder setup:**
   - Add only the Scripts folder

3. **On manual sync:**
   - CLI returns exit code 3
   - Extension shows an error message

4. **On R startup:**
   - The `~/.Rprofile` block prints the CLI message and continues

As soon as `DATA_PATH` is back, the commands work again. No reload is needed.

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

### Git Integration

The tool is designed to work alongside Git:

- Scripts sandbox: Typically a Git repository
- Data sandbox: Typically ignored by Git (`.gitignore` or separate location)
- Extension doesn't interfere with Git operations
- `.Renviron` holds a per-user path (`DATA_PATH`), so it is usually not committed

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

### Cloud Drive Optimization

The tool is **Cloud-drive-friendly** by design:

- **Directory-only operations**: Never reads/writes files, so no placeholder hydration
- **Minimal API calls**: Only creates directories; doesn't enumerate file contents
- **No watchers**: Doesn't monitor file changes that could trigger a cloud drive sync

**Result:** Works efficiently even with large cloud drive directories containing TBs of data.

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
- Commands show "Not inside an r_script_sandbox folder"
- A popup says `.Renviron` is missing or invalid

**Causes & Fixes:**

1. **Workspace is not inside a sandbox:**
   - A folder in the path must have a name starting with `r_script_sandbox`
     (case-sensitive), e.g. `r_script_sandbox` or `r_script_sandbox2`
   - The extension is silent in other folders by design

2. **`.Renviron` missing or invalid:**
   - Create `.Renviron` in the sandbox root with an absolute `DATA_PATH`
   - The fix is picked up the next time you run a command

3. **Check the log:**
   - `View > Output` → "Sandbox Sync"

### Binary Not Found

**Symptoms:**
- "sandbox-sync binary not found" from the extension
- `sandbox-sync: binary not found on PATH; sync skipped` in the R console

**Causes & Fixes:**

1. **Extension:** it uses the binary bundled for your platform
   (`bin/win32-x64`, `bin/linux-x64`, `bin/darwin-arm64`), otherwise
   `sandbox-sync` on your PATH. On other platforms, build from source and put
   the binary on your PATH.

2. **R startup:** R always needs `sandbox-sync` on your PATH. Verify with:
   ```bash
   which sandbox-sync      # macOS/Linux
   where.exe sandbox-sync  # Windows
   ```

### R Working Directory Not Changing

**Symptoms:**
- Status bar shows the destination but `getwd()` is unchanged in R
- Status bar shows "Open a file in a project folder to switch"

**Causes & Fixes:**

1. **No R session running:**
   - The command sends `setwd()` to the Positron R console; start one first

2. **R console error:**
   - Check the R console for an error message
   - The exact command sent is in the "Sandbox Sync" log (`Sent setwd(...)`)

3. **No project folder to switch within:**
   - Positron is opened at the sandbox root and the active tab is not a saved
     file inside a project folder. Open such a file, or open Positron at the
     project folder.

4. **Went to the unexpected side:**
   - The first press for a folder goes to Data and the next goes back to
     Scripts. If you ran `setwd()` yourself in between, press the shortcut
     again.

### Paths with Spaces Not Working

**Symptoms:**
- Sync fails
- R can't set working directory
- Errors about invalid paths

**Fixes:**

1. **Use forward slashes:**
   ```bash
   # Correct
   DATA_PATH="C:/Users/John Doe/CloudDrive/data_sandbox"

   # Wrong
   DATA_PATH="C:\Users\John Doe\CloudDrive\data_sandbox"
   ```

2. **Use quotes:**
   ```bash
   # Correct
   DATA_PATH="C:/path with spaces/data_sandbox"

   # Wrong
   DATA_PATH=C:/path with spaces/data_sandbox
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

2. **Cloud drive throttling:**
   - The cloud drive client may temporarily throttle API calls
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
   - Check the cloud drive isn't in read-only mode

2. **Locked by another process:**
   - Another program might have directory locked
   - Close the cloud drive sync client temporarily
   - Retry after a few seconds (CLI has retry logic)

3. **Insufficient permissions:**
   - Ensure you have write permissions on both sandboxes
   - On Windows, run Positron as admin (not recommended long-term)

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
   code --install-extension /path/to/sandbox-switcher-0.2.0.vsix
   ```

3. **Check extension is enabled:**
   - `Extensions` view → Search "Sandbox Switcher"
   - Ensure it's enabled

### DATA_PATH Offline/Unavailable

**Symptoms:**
- "DATA_PATH is not available" warning
- Data workspace root missing after setup

**Expected Behavior:**
- This is by design when the cloud drive is offline or a network drive is unmounted
- The R session is left untouched

**Fixes:**

1. **Bring DATA_PATH online:**
   - Connect to network
   - Sign in to the cloud drive
   - Mount network drive

2. **Use the command again:**
   - Availability is checked on every command; no reload is needed
   - Run **Sandbox: Setup Paired Workspace Folders** again to add the Data root

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

Delete `.Renviron` from the script sandbox root and remove the sandbox block
from `~/.Rprofile`. Or keep them for future use.

## Best Practices

1. **Share configuration templates:** Point team members to `examples/.Renviron.template` and `examples/.Rprofile.template` so they can set up their own paths.

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
