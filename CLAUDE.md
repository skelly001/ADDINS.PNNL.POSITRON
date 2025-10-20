# Name

ADDINS.PNNL.VSC.DC

# Main Goal

-   Create a docker container with an environment set up to build and test the tool outlined below.

# Tool goal
-   Fast, cross-platform tool to:
    -   Mirror directory structure only between r_script_sandbox (Git) and data_sandbox (OneDrive, no git).
    -   Instantly switch Positron Explorer focus between “Scripts” and “Data” with keyboard shortcuts.
    -   Keep R working directory aligned with the visible folder without restarting Positron or R.

# Key features

-   Directory-only sync: create missing directories on either side; never delete or touch files.
-   One-shot sync on R startup; optional live watch with native filesystem events.
-   Positron extension:
    -   Toggle Explorer root between Scripts/Data.
    -   Multi-root view with labeled folders (“Scripts: <path>”, “Data: <path>”).
    -   Send setwd("<path>") to the active R terminal on switch.
    -   “Sync Now” command to invoke the binary.
-   Cross-platform: Windows, macOS, Linux.
-   OneDrive-friendly: no file access that would hydrate large placeholders.

# Component overview

-   Rust binary “sandbox-sync” (performance-critical)
    -   Commands:
        -   sync: one-shot structure union and mkdir for missing dirs.
        -   watch: mirror new directory creations in near real time.
        -   check: report missing directories on each side.
        -   version.
    -   Flags:
        -   --scripts <path>, --data <path> (required)
        -   --gitkeep (optional, only on scripts side)
        -   --exclude <glob> (repeatable)
        -   --dry-run
        -   --log-level \<info\|debug\>
    -   Defaults excluded: .git, .Rproj.user, .Rhistory, .Renviron, .DS_Store, Thumbs.db, .OneDrive*, \~\$*, .ipynb_checkpoints.
    -   Behavior:
        -   Normalize to absolute roots; prevent path escape.
        -   Walk directories only, build relative path sets, compute union difference.
        -   Create missing dirs with bounded concurrency; idempotent.
        -   Watch mode uses native events (inotify/FSEvents/ReadDirectoryChangesW) and dedup caches to prevent echo loops.
-   Positron extension “sandbox-switcher” (thin UX layer)
    -   Settings:
        -   sandbox.scriptsPath, sandbox.dataPath (absolute paths).
        -   sandbox.syncBinaryPath (optional, else PATH).
        -   sandbox.gitkeep (bool), sandbox.excludes (array).
        -   sandbox.autoSyncOnStartup (bool, default true).
        -   sandbox.watchDuringSession (bool, default false).
    -   Commands and default keybindings:
        -   sandbox.toggleRoot (Ctrl/Cmd+Shift+T)
        -   sandbox.focusScripts (Ctrl/Cmd+Shift+S)
        -   sandbox.focusData (Ctrl/Cmd+Shift+D)
        -   sandbox.openBoth
        -   sandbox.syncNow (Ctrl/Cmd+Shift+Y)
    -   Actions:
        -   Update workspace folders instantly (single-root or multi-root).
        -   Send setwd("<path>") to active R terminal; no session restart.
        -   Spawn sandbox-sync for sync/watch; capture output and show minimal notifications.
        -   Manage a single watch process lifecycle if enabled.
-   R integration (.Rprofile in r_script_sandbox)
    -   On session start, call sandbox-sync sync with configured paths and excludes.
    -   Optional: start watch mode and stop on session end (not required).
    -   Data path can come from sandbox.config.json or SANDBOX_DATA_PATH env var.

# Scaffold instructions for Claude Code

## Rust binary

-   Create Cargo project sandbox-sync.
-   Add crates: clap, notify, ignore or jwalk, rayon, anyhow, thiserror, log, env_logger.
-   Implement modules:
    -   cli.rs: args and subcommands.
    -   paths.rs: normalization, relative path computation, case-insensitive comparisons on Windows.
    -   filter.rs: default and user excludes (glob matching).
    -   walk.rs: directory-only traversal; returns HashSet of relative paths.
    -   sync.rs: compute diffs and mkdir in parallel; optional .gitkeep creation.
    -   watch.rs: dual recursive watchers; debounce and dedup; event-to-relative-path mapping; safe mirroring.
    -   main.rs: wiring, logging init, error handling.
-   Build static binaries for win-x64, macOS x64/arm64, linux-x64.

## Positron extension

-   Initialize VS Code extension project sandbox-switcher.
-   Implement:
    -   settings schema in package.json.
    -   activation: validate paths; auto run sync if enabled; optionally start watch process.
    -   workspace control: single-root toggle via updateWorkspaceFolders; multi-root add with labels.
    -   R terminal alignment: send setwd("<path>") to active terminal; basic detection heuristic.
    -   child process spawn: resolve syncBinaryPath or PATH; run sync/watch; handle stdout/stderr; ensure only one watch process.
    -   commands with keybindings.
-   Keep dependencies minimal (TypeScript, vscode API, child_process).

## R startup snippet (.Rprofile)

-   Resolve binary path via Sys.which or configured path.
-   Load sandbox.config.json if present for dataPath/excludes/gitkeep.
-   Call system2(bin, c("sync", "--scripts", scripts, "--data", data, ...)).
-   Wrap in tryCatch to avoid failing session if binary missing.

## Configuration

-   sandbox.config.json in r_script_sandbox (optional):
    -   { "dataPath": "...", "excludes": \["..."\], "gitkeep": true }
-   Extension settings override config if both exist.

## Repository layout

-   /sandbox-sync (Rust binary)
-   /sandbox-switcher (Positron extension)
-   /examples (sample sandboxes, .Rprofile)
-   /docs (this CLAUDE.md, quickstart)

## Performance targets

-   One-shot sync: O(dir count); milliseconds to seconds for very large trees; no file stats.
-   Watch reaction: \<300 ms per new directory; negligible CPU.
-   Extension switching: instant Explorer update; setwd sent within a single command.

## Acceptance criteria

-   sync creates only missing directories on each side; never deletes or touches files.
-   watch mirrors new dirs promptly without loops.
-   Explorer toggling works without IDE reload; setwd updates correctly.
-   Multi-root shows “Scripts: <path>” and “Data: <path>” simultaneously.
-   Works on Windows/macOS/Linux with OneDrive-hosted data_sandbox.

## Edge and safety

-   Do not traverse symlinks; treat as files.
-   Prevent path escape outside roots.
-   Handle OneDrive placeholders without hydration (directories only).
-   Case normalization for comparison on Windows; preserve actual case when creating.
-   Dry-run and logging for diagnostics.

## Build and test

-   Rust: unit tests for path/filter logic; integration tests with temp dirs; GitHub Actions for cross-platform build.
-   Extension: basic command tests; manual integration test to verify workspace updates and setwd.
 - Use SCRIPT_PATH = "C:\Users\kell343\dev\r_script_sandbox2_vscode_test" and DATA_PATH = "C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test" to test functionality.

## Usage flow

-   Install sandbox-sync and extension.
-   Configure scriptsPath and dataPath.
-   R starts: one-shot sync runs.
-   Work: use keybindings to switch; use watch mode if preferred; run Sync Now on demand.