# Quick Start Guide

Get up and running with Sandbox Sync in 5 minutes.

## Prerequisites

Before you begin, ensure you have:

- ✅ [Positron IDE](https://github.com/posit-dev/positron) or VS Code installed
- ✅ R installed and working
- ✅ Two directories set up:
  - **Scripts directory**: For R scripts (Git-tracked), must contain `r_script_sandbox` in the path
  - **Data directory**: For data files (on a cloud drive)

## Installation Steps

### Step 1: Install the VS Code Extension

#### Option A: From .vsix file (Recommended)

1. Download the latest `.vsix` file from the releases or find it in `sandbox-switcher/`
2. Install using the command palette:
   - Open Positron/VS Code
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Install from VSIX"
   - Select the `sandbox-switcher-0.2.0.vsix` file

#### Option B: From Command Line

```powershell
# Windows/Linux
code --install-extension sandbox-switcher/sandbox-switcher-0.2.0.vsix

# macOS
code --install-extension sandbox-switcher/sandbox-switcher-0.2.0.vsix
```

### Step 2: Install the Rust Binary

The extension bundles the `sandbox-sync` binary, but you need to make it accessible system-wide.

#### Windows

Run PowerShell **as Administrator**:

```powershell
# Replace <username> with your actual Windows username
Copy-Item "$env:USERPROFILE\.positron\extensions\pnnl.sandbox-switcher-0.2.0\bin\win32-x64\sandbox-sync.exe" -Destination "C:\Windows\System32\"
```

Verify installation:

```powershell
sandbox-sync --version
```

#### Linux

```bash
# Copy binary to user local bin
mkdir -p ~/.local/bin
cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.2.0/bin/linux-x64/sandbox-sync ~/.local/bin/

# Make executable
chmod +x ~/.local/bin/sandbox-sync

# Add to PATH if not already (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"
```

Verify installation:

```bash
sandbox-sync --version
```

#### macOS

```bash
# Copy binary to local bin
mkdir -p /usr/local/bin
cp ~/.vscode/extensions/pnnl.sandbox-switcher-0.2.0/bin/darwin-arm64/sandbox-sync /usr/local/bin/

# Make executable
chmod +x /usr/local/bin/sandbox-sync
```

Verify installation:

```bash
sandbox-sync --version
```

### Step 3: Configure Your R Environment

#### 3.1 Create .Renviron

In the root of your `r_script_sandbox` folder, create a `.Renviron` file. This
is the **only** place the sandbox paths are recorded:

```bash
DATA_PATH="C:/path/to/your/data_sandbox"
```

**Important Notes:**
- Use **forward slashes** (`/`) even on Windows
- The path must be **absolute**
- Use **quotes**, especially if the path contains spaces
- `SCRIPT_PATH` is optional and best left out: it is the folder this file is in
- The scripts folder name must start with `r_script_sandbox`

#### 3.2 Add the startup block to `~/.Rprofile`

Copy the block in `examples/.Rprofile.template` into the `.Rprofile` in your
home directory (in R, `path.expand("~/.Rprofile")` shows where that is; on
Windows it is usually in `Documents`). The block contains no paths. Whenever R
starts inside the sandbox (the root or any project subfolder) it loads the root
`.Renviron` and runs the startup sync.

Do not keep a `.Rprofile` in the sandbox root, and do not copy the paths into
`~/.Renviron`. If a project subfolder needs its own `.Rprofile`, start it with
`source("~/.Rprofile")`.

### Step 4: Open Your Workspace in Positron

1. Open Positron IDE
2. Open your sandbox root or any project subfolder such as
   `r_script_sandbox/my_project` (`File > Open Folder...`)
3. The extension activates and detects the sandbox from the folder path

To see the paired folders side by side in the Explorer, run
**Sandbox: Setup Paired Workspace Folders** from the Command Palette:
- 📁 **Scripts: my_project**
- 📁 **Data: my_project**

### Step 5: Start an R Session

1. Open the R console in Positron (`Ctrl+Shift+C` or from the menu)
2. You should see the sync run automatically on startup:

```
sandbox-sync: Synced 42 directories (3 created, 39 existing) in 25ms
```

## Basic Usage

### Switch Working Directory

Use the keyboard shortcut to switch between Scripts and Data:

- **Keyboard**: `Ctrl+Alt+W` (Windows/Linux) or `Cmd+Alt+W` (macOS)
- **Command Palette**: `Ctrl+Shift+P` → "Sandbox: Switch Working Directory to Opposite Sandbox"

**What happens:**
1. The project folder is taken from the saved file you are looking at, or
   otherwise from the project folder you have open in Positron
2. The first press goes to the Data side; the next press for the same folder
   goes back to Scripts
3. The paired folders are created if needed, then `setwd()` is sent to the R console
4. The status bar (bottom of the window) shows the destination

If there is no project folder to go to (for example Positron is opened at the
sandbox root with an unsaved file active), nothing happens and the status bar
says "Open a file in a project folder to switch".

### Manual Sync

If you create new directories manually and want to sync them immediately:

- **Command Palette**: `Ctrl+Shift+P` → "Sandbox: Sync Directories Now"

### Reveal Paired Folder

To see the counterpart folder in the Explorer without switching working directory:

- **Command Palette**: `Ctrl+Shift+P` → "Sandbox: Reveal Paired Folder"

## Verification

Test that everything is working:

1. **Check workspace roots**: You should see both Scripts and Data roots in Explorer
2. **Check R sync on startup**: Start/restart R console and watch for sync message
3. **Test directory switching**:
   - Open a file in your scripts folder
   - Press `Ctrl+Alt+W`
   - R console should show: `setwd("C:/path/to/data_sandbox/...")`
   - Explorer should reveal the paired folder

## Common Issues

### Binary Not Found

**Symptom:** "sandbox-sync binary not found in PATH"

**Fix:** Ensure the binary is in a directory in your PATH. On Windows, System32 is recommended. Verify with:

```powershell
# Windows
where.exe sandbox-sync

# macOS/Linux
which sandbox-sync
```

### Paths with Spaces

**Symptom:** Sync fails or R working directory not set correctly

**Fix:** Ensure paths in `.Renviron` use:
- Forward slashes (`/`)
- Quotes around the path
- No trailing slashes

```bash
# Correct
DATA_PATH="C:/Users/John Doe/CloudDrive/data_sandbox"

# Wrong
DATA_PATH=C:\Users\John Doe\CloudDrive\data_sandbox
```

### Extension Not Activating

**Symptom:** No workspace roots appear; commands not available

**Fix:** Ensure your workspace folder path contains a folder whose name starts with `r_script_sandbox` (case-sensitive).

### R Console Not Updating

**Symptom:** `setwd()` not being executed

**Fix:**
- Ensure you have an active R console running
- If you have multiple R consoles, select the one you want to use
- Check the Output panel ("Sandbox Sync") for error messages

## Next Steps

- 📖 Read the [Complete Setup Guide](POSITRON_SETUP_GUIDE.md) for advanced configuration
- 🔧 Explore [CLAUDE.md](../CLAUDE.md) for architecture details
- 🐛 Report issues on [GitHub Issues](https://github.com/pnnl/sandbox-sync/issues)

## Getting Help

If you encounter issues:

1. Check the **Output** panel in VS Code/Positron (View > Output > "Sandbox Sync")
2. Check R console messages during startup
3. Review [POSITRON_SETUP_GUIDE.md](POSITRON_SETUP_GUIDE.md) for troubleshooting
4. File an issue on GitHub with:
   - Your OS and version
   - R version
   - Extension version
   - Error messages from Output panel and R console

---

**You're all set!** Start developing with seamless sync between your scripts and data. 🚀
