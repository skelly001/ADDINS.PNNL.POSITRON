# ADDINS.PNNL.VSC User Guide

Fast, robust directory synchronization for R sandbox workflows in Positron/VS Code.

## Overview

This tool keeps two directory trees in perfect sync (directories only):
- **SCRIPT_PATH**: Your R script sandbox (Git-tracked)
- **DATA_PATH**: Your data sandbox (OneDrive-backed, large outputs)

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
4. Select `sandbox-switcher/sandbox-switcher-0.1.0.vsix`

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

Create a `.Renviron` file in your **SCRIPT_PATH** (r_script_sandbox root):

```bash
# .Renviron
SCRIPT_PATH="/path/to/r_script_sandbox"
DATA_PATH="/path/to/data_sandbox"
```

Example paths:
```bash
# Linux/Mac
SCRIPT_PATH="/home/username/dev/r_script_sandbox"
DATA_PATH="/home/username/OneDrive - PNNL/Documents/data_sandbox"

# Windows (use forward slashes)
SCRIPT_PATH="C:/Users/username/dev/r_script_sandbox"
DATA_PATH="C:/Users/username/OneDrive - PNNL/Documents/data_sandbox"

# Paths with spaces (use quotes)
SCRIPT_PATH="/Users/username/My Documents/r_script_sandbox"
DATA_PATH="/Users/username/OneDrive - PNNL/Documents/data sandbox"
```

#### Create .Rprofile

Copy `examples/.Rprofile.template` to your **SCRIPT_PATH** and rename it to `.Rprofile`.

Or create it manually:
```R
# .Rprofile
.sandbox_sync_startup <- function() {
  script_dir <- getwd()
  renviron_path <- file.path(script_dir, ".Renviron")

  if (!file.exists(renviron_path)) {
    message("Warning: .Renviron not found")
    return(invisible(NULL))
  }

  readRenviron(renviron_path)
  scripts_path <- Sys.getenv("SCRIPT_PATH")
  data_path <- Sys.getenv("DATA_PATH")

  if (scripts_path == "" || data_path == "") {
    message("Warning: SCRIPT_PATH or DATA_PATH not defined")
    return(invisible(NULL))
  }

  binary_path <- Sys.which("sandbox-sync")
  if (binary_path == "") {
    message("Warning: sandbox-sync not found in PATH")
    return(invisible(NULL))
  }

  cmd <- sprintf(
    '%s sync-full --scripts "%s" --data "%s" --json',
    binary_path, scripts_path, data_path
  )

  message("Running sandbox sync...")
  output <- system(cmd, intern = TRUE)

  if (requireNamespace("jsonlite", quietly = TRUE)) {
    json <- jsonlite::fromJSON(paste(output, collapse = "\n"))
    if (json$ok) {
      message(sprintf(
        "Synced %d directories (%d created, %d existing) in %dms",
        json$created_total + json$existing_total,
        json$created_total, json$existing_total, json$duration_ms
      ))
    }
  } else {
    message(paste(output, collapse = "\n"))
  }
}

.sandbox_sync_startup()
rm(.sandbox_sync_startup)
```

## Usage

### Automatic Sync on R Startup

When you start an R session in your SCRIPT_PATH, the `.Rprofile` automatically:
1. Loads `.Renviron`
2. Runs `sandbox-sync sync-full`
3. Prints a concise status message

Example output:
```
Running sandbox sync...
Synced 142 directories (5 created, 137 existing) in 234ms
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

The main command - switches your R working directory to the opposite sandbox:

**From Scripts → Data:**
1. Computes relative path from SCRIPT_PATH
2. Ensures the path exists in DATA_PATH
3. Sends `setwd(DATA_PATH/relative)` to R terminal
4. Reveals the paired folder in the explorer

**From Data → Scripts:**
1. Computes relative path from DATA_PATH
2. Sends `setwd(SCRIPT_PATH/relative)` to R terminal
3. Reveals the paired folder in the explorer

**Example:**
- You're editing `/path/to/r_script_sandbox/analysis/model.R`
- Press `Ctrl+Alt+W`
- R working directory switches to `/path/to/data_sandbox/analysis`
- Data folder is revealed in explorer

#### Reveal Paired Folder

Command: "Sandbox: Reveal Paired Folder"

Reveals the corresponding folder in the opposite sandbox without changing R's working directory.

#### Sync Now

Command: "Sandbox: Sync Directories Now"

Manually triggers a full sync between SCRIPT_PATH and DATA_PATH. Shows progress and results.

### Workspace Roots

The extension automatically adds two workspace roots:
- **Scripts: r_script_sandbox** → Your SCRIPT_PATH
- **Data: data_sandbox** → Your DATA_PATH (if available)

This gives you a dual-pane view of both sandboxes side-by-side.

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
- All hidden directories (starting with `.`)

### Safety Features

- **No deletions**: Directories are only created, never deleted
- **No file operations**: Files are completely ignored
- **Path validation**: Rejects `..` traversal attempts
- **Idempotent**: Safe to run multiple times
- **Parallel execution**: Uses 4 threads max to avoid thrashing OneDrive
- **Retry logic**: Handles transient EBUSY/ACCESS_DENIED errors with exponential backoff

## Troubleshooting

### Extension Not Activating

**Check:** Does your workspace contain a folder with `r_script_sandbox` in the path?
- The segment match is **case-sensitive**
- Must be an exact segment, not a substring
- Example: `/home/user/r_script_sandbox/analysis` ✓
- Example: `/home/user/R_Script_Sandbox/analysis` ✗

**Check:** Does `.Renviron` exist in your SCRIPT_PATH?
- Open the "Sandbox Sync" output channel (View → Output → Sandbox Sync)
- Look for error messages

### DATA_PATH Unavailable

If DATA_PATH (e.g., OneDrive) is not mounted:
- Extension adds only the Scripts root
- Switch commands show a warning
- Sync is skipped
- Everything else works normally

**Retry:** Once DATA_PATH becomes available, run "Sandbox: Sync Now"

### Binary Not Found

**Check PATH:**
```bash
which sandbox-sync   # Linux/Mac
where sandbox-sync   # Windows
```

**Alternative:** The binary is bundled in the extension at:
- `extension/bin/linux-x64/sandbox-sync`
- `extension/bin/win32-x64/sandbox-sync.exe`
- `extension/bin/darwin-x64/sandbox-sync`

### R Terminal Not Found

The extension looks for terminals with "R" or "Positron" in the name. If you have multiple R terminals, you'll be prompted to select one.

**Tip:** Name your R terminal explicitly (right-click terminal → Rename)

### Paths with Spaces

Always use quotes in `.Renviron`:
```bash
SCRIPT_PATH="/Users/username/My Documents/r_script_sandbox"
```

The tool handles spaces correctly everywhere.

## Performance

Typical performance on a modern system:
- **Small sandbox** (50 dirs): 30-50ms
- **Medium sandbox** (200 dirs): 100-150ms
- **Large sandbox** (1000+ dirs): 300-600ms

Parallelism is limited to 4 threads to avoid thrashing OneDrive.

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
