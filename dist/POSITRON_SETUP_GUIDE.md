# Positron Sandbox Switcher - Installation & Setup Guide

Complete guide to install and configure the sandbox-switcher extension for Positron IDE.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Steps](#installation-steps)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before installing the sandbox-switcher extension, ensure you have:

- **Positron IDE** installed (or VS Code - the extension works with both)
- **R** installed and configured
- **sandbox-sync binary** installed (see instructions below)
- Two sandbox directories:
  - **Scripts sandbox** (Git-tracked) - for your R scripts
  - **Data sandbox** (OneDrive, no Git) - for your data files

---

## Installation Steps

### Step 1: Install the sandbox-sync Binary

The extension requires the `sandbox-sync` binary to perform directory synchronization.

#### On Windows:

1. **Copy the binary** to a permanent location:
   ```
   C:\Users\<YourUsername>\dev\ADDINS.PNNL.VSC\bin\sandbox-sync-windows-x64.exe
   ```

   Or any location you prefer (e.g., `C:\Program Files\sandbox-sync\`)

2. **Optional: Add to PATH**
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Under "User variables", select "Path" and click "Edit"
   - Click "New" and add your binary location
   - Click "OK" to save

   **Note:** Adding to PATH is optional. You can specify the full path in the extension settings instead.

#### On Linux:

1. **Copy the binary:**
   ```bash
   sudo cp binaries/sandbox-sync-linux-x64 /usr/local/bin/sandbox-sync
   sudo chmod +x /usr/local/bin/sandbox-sync
   ```

2. **Verify installation:**
   ```bash
   sandbox-sync version
   ```

#### On macOS:

Currently, macOS binaries must be built natively on macOS. Follow the Rust build instructions in the repository, or use the Windows/Linux binaries if working in a VM.

---

### Step 2: Install the Positron Extension

1. **Open Positron IDE**

2. **Install the extension:**

   **Option A: Install from VSIX file**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Extensions: Install from VSIX"
   - Navigate to: `extension/sandbox-switcher-0.1.0.vsix`
   - Click "Install"

   **Option B: Install from Extensions panel**
   - Open Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
   - Click the "..." menu (top-right)
   - Select "Install from VSIX..."
   - Navigate to the VSIX file and install

3. **Reload Positron** when prompted

---

## Configuration

### Step 3: Configure Extension Settings

1. **Open Settings:**
   - Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
   - Or: File → Preferences → Settings

2. **Search for "sandbox"** in the settings search bar

3. **Configure the following settings:**

   | Setting | Description | Example Value |
   |---------|-------------|---------------|
   | **Sandbox: Scripts Path** | Absolute path to your scripts sandbox (Git-tracked) | `C:/Users/kell343/dev/r_script_sandbox` |
   | **Sandbox: Data Path** | Absolute path to your data sandbox (OneDrive) | `C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox` |
   | **Sandbox: Sync Binary Path** | Full path to sandbox-sync binary (optional if on PATH) | `C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe` |
   | **Sandbox: Gitkeep** | Create .gitkeep files in empty directories | `true` (recommended) |
   | **Sandbox: Auto Sync On Startup** | Automatically sync when Positron starts | `true` (recommended) |
   | **Sandbox: Watch During Session** | Continuously watch for new directories | `false` (optional) |

   **Path Format Tips:**
   - Use forward slashes `/` even on Windows (easier)
   - Or use escaped backslashes `\\` on Windows
   - Both formats work: `C:/Users/...` or `C:\\Users\\...`

4. **Alternatively: Edit settings.json directly**

   Press `Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

   Add:
   ```json
   {
     "sandbox.scriptsPath": "C:/Users/kell343/dev/r_script_sandbox",
     "sandbox.dataPath": "C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox",
     "sandbox.syncBinaryPath": "C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe",
     "sandbox.gitkeep": true,
     "sandbox.autoSyncOnStartup": true,
     "sandbox.watchDuringSession": false,
     "sandbox.excludes": []
   }
   ```

---

### Step 4: Configure R Integration (Optional but Recommended)

This enables automatic sync when R starts.

1. **Copy the .Rprofile file** from `examples/.Rprofile` to your **scripts sandbox root**:
   ```
   C:\Users\kell343\dev\r_script_sandbox\.Rprofile
   ```

2. **Copy sandbox.config.json** from `examples/sandbox.config.json` to your **scripts sandbox root**:
   ```
   C:\Users\kell343\dev\r_script_sandbox\sandbox.config.json
   ```

3. **Edit sandbox.config.json** with your actual paths:
   ```json
   {
     "scriptsPath": "C:/Users/kell343/dev/r_script_sandbox",
     "dataPath": "C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox",
     "binaryPath": "C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe",
     "gitkeep": true,
     "excludes": []
   }
   ```

4. **Test R integration:**
   - Open Positron
   - Start an R console
   - You should see: "Sandbox sync completed: X directories synced"

---

## Usage

### Keyboard Shortcuts

The extension provides these default keyboard shortcuts:

| Command | Windows/Linux | macOS | Description |
|---------|---------------|-------|-------------|
| **Toggle Root** | `Ctrl+Shift+T` | `Cmd+Shift+T` | Switch between Scripts and Data |
| **Focus Scripts** | `Ctrl+Shift+S` | `Cmd+Shift+S` | Switch to Scripts sandbox |
| **Focus Data** | `Ctrl+Shift+D` | `Cmd+Shift+D` | Switch to Data sandbox |
| **Sync Now** | `Ctrl+Shift+Y` | `Cmd+Shift+Y` | Manually trigger sync |

### Command Palette

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type:

- **"Sandbox: Toggle Root"** - Switch between Scripts and Data
- **"Sandbox: Focus on Scripts"** - Switch to Scripts sandbox
- **"Sandbox: Focus on Data"** - Switch to Data sandbox
- **"Sandbox: Open Both Folders"** - Show both in multi-root view
- **"Sandbox: Sync Now"** - Run directory sync manually
- **"Sandbox: Start Watch Mode"** - Start continuous directory monitoring
- **"Sandbox: Stop Watch Mode"** - Stop directory monitoring

### Working with R

When you switch sandboxes, the extension automatically:

1. **Updates the Explorer view** to show the selected sandbox
2. **Sends `setwd("path")`** to your active R terminal
3. **No R restart needed** - working directory updates instantly

**Example workflow:**

1. Press `Ctrl+Shift+S` → Explorer shows Scripts, R working directory = scripts path
2. Work on your R scripts, run code
3. Press `Ctrl+Shift+D` → Explorer shows Data, R working directory = data path
4. Load or save data files
5. Press `Ctrl+Shift+T` → Toggle back to Scripts

---

## Troubleshooting

### Binary not found

**Error:** "sandbox-sync binary not found"

**Solutions:**
- Verify `sandbox.syncBinaryPath` in settings points to the correct file
- Or add the binary to your system PATH
- On Windows, use forward slashes: `C:/path/to/binary.exe`
- Test manually in terminal: `sandbox-sync version`

### Paths with spaces

**Error:** "unexpected argument '-' found"

**Cause:** Paths containing spaces (like "OneDrive - PNNL") aren't being quoted properly.

**Solution:** The .Rprofile includes automatic quoting for Windows. Ensure you're using the provided .Rprofile file.

### R working directory not updating

**Symptoms:** `getwd()` doesn't change after switching sandboxes

**Solutions:**
- Ensure you have an active R terminal running
- Check the R Console output for any errors
- Manually test: Type `setwd("C:/your/path")` in R Console
- The extension sends the command to the "active terminal" - make sure R is in focus

### No sync happening

**Symptoms:** Directories aren't being synced between sandboxes

**Solutions:**
- Run `Ctrl+Shift+Y` (Sync Now) manually
- Check the Output panel: View → Output → Select "Sandbox Switcher"
- Verify paths exist and are accessible
- Check for permission issues (OneDrive, admin rights, etc.)
- Try running binary manually: `sandbox-sync --scripts "path1" --data "path2" sync`

### Extension not loading

**Solutions:**
- Check for errors: Help → Toggle Developer Tools → Console tab
- Reload window: Press `Ctrl+Shift+P` → "Developer: Reload Window"
- Reinstall the extension
- Check Positron compatibility (extension works with VS Code API)

### Watch mode not working

**Symptoms:** New directories aren't being mirrored in real-time

**Solutions:**
- Watch mode is disabled by default - enable it: `"sandbox.watchDuringSession": true`
- Or run manually: `Ctrl+Shift+P` → "Sandbox: Start Watch Mode"
- Check system file watcher limits (Linux: `fs.inotify.max_user_watches`)
- Watch mode may impact performance on very large directories

### OneDrive sync conflicts

**Symptoms:** Directories appearing and disappearing, sync errors

**Solutions:**
- Ensure OneDrive is fully synced before running sandbox-sync
- Check OneDrive sync status (green checkmark on folders)
- sandbox-sync only creates directories, never touches files (safe for OneDrive)
- If using "Files On-Demand", empty directories are safe and won't hydrate files

---

## Advanced Configuration

### Custom Excludes

Add patterns to ignore during sync:

```json
{
  "sandbox.excludes": [
    "temp",
    "cache",
    "node_modules",
    ".venv"
  ]
}
```

**Default excludes** (built into binary):
- `.git`, `.Rproj.user`, `.Rhistory`, `.Renviron`
- `.DS_Store`, `Thumbs.db`
- `.OneDrive*`, `~$*`
- `.ipynb_checkpoints`

### Dry Run Mode

Test what sync would do without making changes:

```bash
sandbox-sync --scripts "path1" --data "path2" --dry-run sync
```

### Check Missing Directories

See what's missing on each side:

```bash
sandbox-sync --scripts "path1" --data "path2" check
```

### Custom Keybindings

Edit keybindings: `Ctrl+K Ctrl+S` → Search for "sandbox"

Example custom binding:
```json
{
  "key": "ctrl+alt+s",
  "command": "sandbox.focusScripts"
}
```

---

## Getting Help

If you encounter issues:

1. **Check the Output panel:** View → Output → "Sandbox Switcher"
2. **Enable debug logging:** Run binary with `--log-level debug`
3. **Test binary independently:** Run commands in terminal to isolate issues
4. **Check file permissions:** Ensure you have read/write access to both sandboxes
5. **Review this guide's Troubleshooting section**

---

## What the Tool Does

**sandbox-sync binary:**
- Creates missing directories on both sides
- Never deletes anything
- Never touches files (only directories)
- Fast and safe for OneDrive

**Positron extension:**
- Switches Explorer between Scripts and Data
- Updates R working directory instantly
- No IDE restart needed
- Keyboard shortcuts for fast switching

**Result:** Seamless workflow between Git-tracked scripts and OneDrive-backed data without manual navigation or R restarts.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│  Positron Sandbox Switcher - Quick Reference            │
├─────────────────────────────────────────────────────────┤
│  Ctrl+Shift+S  →  Focus Scripts (+ setwd)               │
│  Ctrl+Shift+D  →  Focus Data (+ setwd)                  │
│  Ctrl+Shift+T  →  Toggle between Scripts/Data           │
│  Ctrl+Shift+Y  →  Sync Now (create missing dirs)        │
├─────────────────────────────────────────────────────────┤
│  Commands:                                              │
│    sandbox-sync --scripts <path> --data <path> sync     │
│    sandbox-sync --scripts <path> --data <path> check    │
│    sandbox-sync --scripts <path> --data <path> watch    │
└─────────────────────────────────────────────────────────┘
```

---

**Version:** 0.1.0
**Last Updated:** 2025-10-20
