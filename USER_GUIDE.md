# ADDINS.PNNL.VSC User Guide

Fast, robust directory synchronization for R sandbox workflows in Positron/VS Code.

## Overview

This tool keeps two directory trees in perfect sync (directories only):
- **SCRIPT_PATH**: Your R script sandbox (Git-tracked)
- **DATA_PATH**: Your data sandbox (on a cloud drive, large outputs)

Features:
- Bidirectional directory mirroring (no file copying, no deletions)
- One keyboard shortcut to switch R working directory between sandboxes
- Dual workspace roots in Positron with auto-reveal
- Full sync on R startup, micro-sync on demand
- Cross-platform (Windows, macOS, Linux)

## Installation

### 1. Install the Rust CLI Binary (sandbox-sync)

**Option A: Pre-built Binary (Recommended)**
- Copy the appropriate binary from `dist/bin/` to a directory in your PATH:
  - Linux: `dist/bin/linux-x64/sandbox-sync`
  - Windows: `dist/bin/win32-x64/sandbox-sync.exe` (if available)
  - macOS: `dist/bin/darwin-x64/sandbox-sync` (if available)

**Option B: Build from Source**
```bash
cd sandbox-sync
cargo build --release
# Binary will be at: target/release/sandbox-sync
# Copy to a directory in your PATH
```

Verify installation:
```bash
sandbox-sync --help
```

### 2. Install the VS Code Extension

**Option A: From .vsix File**
1. Open VS Code/Positron
2. Go to Extensions view (Ctrl+Shift+X / Cmd+Shift+X)
3. Click the "..." menu → "Install from VSIX..."
4. Select `sandbox-switcher/sandbox-switcher-0.2.0.vsix`

**Option B: Build and Install**
```bash
cd sandbox-switcher
npm install
npm run compile
npm run package
# Install the generated .vsix file
```

### 3. Configure Your Sandbox

#### Create .Renviron

Create a `.Renviron` file in the root of your `r_script_sandbox` folder. This
is the **only** place the sandbox paths are recorded:

```bash
# .Renviron
DATA_PATH="/path/to/data_sandbox"
```

`SCRIPT_PATH` is optional and best left out: it is the folder the `.Renviron`
is in. Use absolute paths, forward slashes (also on Windows), and quotes if the
path has spaces.

**Examples:**
```bash
# Linux
DATA_PATH="/home/username/CloudDrive/data_sandbox"

# Windows
DATA_PATH="C:/Users/username/Cloud Drive/Documents/data_sandbox"

# macOS (with spaces)
DATA_PATH="/Users/username/Cloud Drive/Documents/data sandbox"
```

#### Add the startup block to `~/.Rprofile`

Copy the block in `examples/.Rprofile.template` into the `.Rprofile` in your
home directory (run `path.expand("~/.Rprofile")` in R to see where that is; on
Windows it is usually in `Documents`). The block contains no paths.

Whenever an R session starts inside a folder whose name starts with
`r_script_sandbox` (the root or any project subfolder), it:

1. Loads the root `.Renviron`, so `Sys.getenv("DATA_PATH")` and
   `Sys.getenv("SCRIPT_PATH")` work in the session
2. Runs `sandbox-sync sync-full`
3. Prints a one-line status message

In any other folder it does nothing.

R runs only one `.Rprofile` per session: the one in the startup folder if
there is one, otherwise the one in your home directory. So:

- Do **not** keep a `.Rprofile` in the sandbox root.
- If a project subfolder needs its own `.Rprofile`, start it with
  `source("~/.Rprofile")`.

#### Opening a project subfolder instead of the sandbox root

You can open Positron at any folder inside `r_script_sandbox` (for example
`r_script_sandbox/ROSMAP_SRM`). The extension finds the sandbox root from the
folder path and reads `.Renviron` there; the `~/.Rprofile` block does the same
for R. Nothing extra is needed.

#### Upgrading from an earlier setup

- Delete the old `.Rprofile` from the sandbox root and add the block to
  `~/.Rprofile` instead.
- Remove `SCRIPT_PATH` and `DATA_PATH` from `~/.Renviron` if you had copied
  them there. The root `.Renviron` is now the single record.

## Usage

### Automatic Sync on R Startup

Example console output when R starts inside the sandbox:
```
sandbox-sync: Synced 142 directories (5 created, 137 existing) in 23ms
```

### Manual Sync (CLI)

```bash
# Full bidirectional sync
sandbox-sync sync-full --scripts /path/to/scripts --data /path/to/data

# With JSON output
sandbox-sync sync-full --scripts /path/to/scripts --data /path/to/data --json

# Ensure a specific path exists in both sandboxes
sandbox-sync ensure-path --scripts /path/to/scripts --data /path/to/data --relative "models/neural_net"
```

### VS Code Extension Commands

#### Switch Working Directory (Ctrl+Alt+W / Cmd+Alt+W)

The main command. It sends one `setwd()` call to the R console, moving R
between a project folder and its pair in the other sandbox.

**Which project folder:**
1. The folder of the file you are looking at, if it is a saved file inside a
   project folder of either sandbox
2. Otherwise (an unsaved file, a file outside the sandbox, a non-file tab) the
   project folder you have open in Positron

**Which side:** the first press for a folder goes to **Data**; pressing again
for the same folder goes back to **Scripts**, and so on. The folder is never
taken from an earlier switch, so working in a different project never sends R
to the previous project's folder.

**When nothing happens:** if there is no project folder to go to (for example
Positron is opened at the sandbox root and no project file is active), the
status bar shows "Open a file in a project folder to switch" and R is left
alone. R is never sent to the top of either sandbox.

Before switching, the paired folders are created if they do not exist yet. The
destination is shown in the status bar (the strip along the bottom of the
window), e.g. `R working directory → Data: analysis`.

**Example:**
- You're editing `/path/to/r_script_sandbox/analysis/model.R`
- Press `Ctrl+Alt+W`: R switches to `/path/to/data_sandbox/analysis`
- Press it again: R switches back to `/path/to/r_script_sandbox/analysis`

#### Reveal Paired Folder

Command: "Sandbox: Reveal Paired Folder"

Reveals the corresponding folder in the opposite sandbox without changing R's working directory. Also available by right-clicking a file or folder in the explorer. The paired folder must be in the workspace (see "Setup Paired Workspace Folders").

#### Sync Now

Command: "Sandbox: Sync Directories Now"

Manually triggers a full sync between SCRIPT_PATH and DATA_PATH. Shows progress and results.

### Workspace Roots

Command: "Sandbox: Setup Paired Workspace Folders"

Adds the paired folders for the project you have open as two workspace roots:
- **Scripts: <folder>** → the folder under your scripts sandbox
- **Data: <folder>** → the paired folder under your data sandbox (if available)

This is a manual command: changing workspace folders while R is starting
cancels the R startup in Positron, so the extension never does it on its own.
If DATA_PATH was unavailable, run the command again once it is back.

## How It Works

### Directory-Only Sync

The tool creates a **union** of all directories from both SCRIPT_PATH and DATA_PATH, then ensures all directories exist in both locations:

```
SCRIPT_PATH:         DATA_PATH:          After Sync:
  analysis/            results/             Both have:
  models/              plots/               - analysis/
                                            - models/
                                            - results/
                                            - plots/
```

**Important:** Only directories are synced - **files are never touched**.

### Exclusions

The following are automatically excluded:
- `.git`, `.Rproj.user`, `.vscode`, `.positron`
- `__pycache__`, `.DS_Store`, `Thumbs.db`
- `tmp`, hidden system directories
- `renv` (renv project libraries)
- Symlinks: never followed, and nothing is created at or below one
- All hidden directories (starting with `.`)

### Safety Features

- **No deletions**: Directories are only created, never deleted
- **No file operations**: Files are completely ignored
- **Path validation**: Rejects `..` traversal attempts
- **Idempotent**: Safe to run multiple times
- **Parallel execution**: Uses 4 threads max to avoid thrashing the cloud drive
- **Retry logic**: Handles transient EBUSY/ACCESS_DENIED errors with exponential backoff

## Troubleshooting

### Extension Not Activating

**Check:** Does your workspace contain a folder with `r_script_sandbox` in the path?
- The segment match is **case-sensitive**
- The folder name must start with `r_script_sandbox` (so `r_script_sandbox2` also works)
- Example: `/home/user/r_script_sandbox/analysis` ✓
- Example: `/home/user/R_Script_Sandbox/analysis` ✗

**Check:** Does `.Renviron` exist in the sandbox root and define `DATA_PATH`?
- Open the "Sandbox Sync" output channel (View → Output → Sandbox Sync)
- Look for error messages

### DATA_PATH Unavailable

If DATA_PATH (e.g., a cloud drive) is not mounted:
- Switching to the Data side and revealing paired folders show a warning and do nothing
- Sync reports that DATA_PATH is unavailable
- The R session is left untouched

Availability is checked each time a command runs, so everything works again as
soon as DATA_PATH is back. No reload is needed.

### Binary Not Found

**Check PATH:**
```bash
which sandbox-sync   # Linux/Mac
where sandbox-sync   # Windows
```

**Alternative:** The binary is bundled in the extension at:
- `extension/bin/linux-x64/sandbox-sync`
- `extension/bin/win32-x64/sandbox-sync.exe`
- `extension/bin/darwin-arm64/sandbox-sync`

### Working Directory Does Not Change

The switch command sends `setwd()` to the Positron R console. Make sure an R
session is running in the Console pane.

### Paths with Spaces

Always use quotes in `.Renviron`:
```bash
DATA_PATH="/Users/username/Cloud Drive/data sandbox"
```

The tool handles spaces correctly everywhere.

## Performance

Typical performance on a modern system:
- **Small sandbox** (50 dirs): 30-50ms
- **Medium sandbox** (200 dirs): 100-150ms
- **Large sandbox** (1000+ dirs): 300-600ms

Parallelism is limited to 4 threads to avoid thrashing the cloud drive.

## Advanced Usage

### Custom Exclusions

While the tool doesn't currently support custom exclusions via configuration, you can modify the filter patterns in the Rust source and rebuild.

### Windows Long Paths

The tool uses `dunce` to normalize Windows UNC paths and handles long paths (>260 characters) correctly.

### Forward Slashes in setwd()

Per CLAUDE.md spec, R's `setwd()` commands always use forward slashes, even on Windows. R handles this correctly.

## FAQ

**Q: Will this sync my large data files?**
A: No. The tool syncs **directories only**. Files are never touched, copied, or deleted.

**Q: What if I delete a directory?**
A: Deletions are not synced. If you delete a directory from one sandbox, it remains in the other. This is by design for safety.

**Q: Can I use this without the VS Code extension?**
A: Yes! The `sandbox-sync` CLI is standalone. The extension just provides UX conveniences.

**Q: Does this work with GitHub Copilot / other extensions?**
A: Yes. This extension is completely independent and doesn't interfere with others.

**Q: What about file permissions?**
A: New directories are created with default permissions. Existing directory permissions are not modified.

## Support

For issues, questions, or feature requests:
1. Check the "Sandbox Sync" output channel (View → Output)
2. Review this guide
3. Contact the PNNL development team

## License

MIT License - See LICENSE file for details.
