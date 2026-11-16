## Title

ADDINS.PNNL.VSC

## Overview

This tool keeps two folder trees in lockstep (directories only) and provides fast, non‑intrusive UX in Positron:

- SCRIPT_PATH: base path to the highest level of the r_script_sandbox (Git‑tracked; R scripts only)
- DATA_PATH: base path to the highest level of the data sandbox (shared via a cloud drive; large outputs; not Git‑tracked)
- Bidirectional, dirs‑only mirroring between SCRIPT_PATH and DATA_PATH (no file copying, no deletions)
- Single keyboard shortcut to switch the R working directory between a project folder and its pair on the other side
- Positron can show both paired folders (“Scripts: <folder>” and “Data: <folder>”) on request, and reveals the paired folder without touching the R session
- Full sync runs at R startup; micro‑sync ensures paths exist when they are actually used
- Operates only within the sandbox; robust handling of spaces and non‑ASCII; cross‑platform (Windows, macOS, Linux)
- Simple by design: no long‑lived watchers, no lock files
- The sandbox paths are recorded in exactly one place: the .Renviron in the sandbox root
- Git and cloud drive constraints are context only; not enforced by the tool

## Components

- Rust CLI binary: sandbox-sync (folder sandbox-sync/)
  - sync-full: bidirectional dirs‑only mirroring between SCRIPT_PATH and DATA_PATH
  - ensure-path: ensure a single relative path exists on both sides
  - Emits compact JSON, checks DATA_PATH availability, returns non‑zero on errors
- Positron – VS Code extension: sandbox-switcher (folder sandbox-switcher/)
  - UX only: a single “switch to opposite” shortcut, paired reveal, micro‑sync on action, manual full sync, manual workspace-root setup
  - Detects the sandbox root from the workspace folder path and reads DATA_PATH from the .Renviron there
  - Sends setwd() to the R console; never reloads R or the extension; never changes workspace folders on its own
- R startup (block in ~/.Rprofile, from examples/.Rprofile.template)
  - Finds the sandbox root from getwd(), loads the root .Renviron, invokes sync-full, prints status to console

## Configuration

- .Renviron – project‑local, in the sandbox root. The single record of the paths
  - Must define DATA_PATH as an absolute path
  - SCRIPT_PATH is optional; it defaults to the folder that contains the .Renviron
  - Values may be quoted to accommodate spaces; a trailing slash is tolerated
- ~/.Rprofile – user‑level; holds the path‑free startup block
  - Runs for every R session. Does nothing unless getwd() is inside a folder whose name starts with r_script_sandbox (the root or any project subfolder, which is a supported, common way to open Positron)
  - Unsets SCRIPT_PATH and DATA_PATH, loads the root .Renviron, defaults SCRIPT_PATH to the root
  - Invokes sandbox-sync sync-full (found on PATH) and prints its human‑readable output to the console
  - If DATA_PATH is unavailable or the binary is missing, prints the message and continues
  - R runs only one .Rprofile: the startup folder's if present, otherwise ~/.Rprofile. So there must be no .Rprofile in the sandbox root, and a subfolder .Rprofile must start with source("~/.Rprofile")
- The paths must not be copied into ~/.Renviron

## Rust CLI Specification – sandbox-sync

- Language and crates
  - Rust 1.74 or newer
  - clap, walkdir, rayon, serde, serde_json, anyhow, dunce for normalization
- Command – sync-full
  - Purpose
    - Bidirectional dirs‑only mirroring
    - Collect the relative directories under SCRIPT_PATH and under DATA_PATH, excluding noise
    - Create on each side only the directories that exist on the other side alone
  - Flags
    - --scripts <SCRIPT_PATH> (alias --scripts-path)
    - --data <DATA_PATH> (alias --data-path)
    - --json optional
  - Behavior
    - Validate both bases
    - If DATA_PATH does not exist or is inaccessible, return error JSON and exit non‑zero
    - Walk both trees without following symlinks; collect relative dir sets ignoring excluded directories
    - Exclusions: every directory whose name starts with a dot (.git, .Rproj.user, .vscode, .positron, …), plus tmp, __pycache__, renv, System Volume Information, $RECYCLE.BIN; symlinks and Windows junctions are skipped. Nothing is created at or below a symlink on either side (for example renv library links into the package cache), since that would write outside the sandbox. Other reparse points (such as cloud drive placeholder folders) are treated as normal directories
    - A sub‑tree that cannot be read is skipped and reported in warnings
    - In parallel with rayon (at most 4 threads), mkdir -p the missing paths on each side; directories present on both sides are not touched
    - created counts only directories that did not exist before the run
    - Treat “already exists” as success if it is a directory; a file with the same name is an error for that path
    - On EBUSY or ACCESS_DENIED, retry with small exponential backoff
    - Never delete; never touch files
  - JSON fields
    - ok
    - created_in_scripts
    - created_in_data
    - created_total
    - existing_total (directories found on the scripts side plus those found on the data side)
    - duration_ms
    - scripts_path
    - data_path
    - warnings
    - errors
- Command – ensure-path
  - Purpose
    - Ensure a single relative path chain exists on both SCRIPT_PATH and DATA_PATH
  - Flags
    - --scripts <SCRIPT_PATH> (alias --scripts-path)
    - --data <DATA_PATH> (alias --data-path)
    - --relative <RELATIVE_PATH> (empty means the bases themselves)
    - --json optional
  - Behavior
    - Validate RELATIVE_PATH is a safe descendant path: reject absolute paths and any .. component
    - mkdir -p SCRIPT_PATH/RELATIVE_PATH and DATA_PATH/RELATIVE_PATH
    - Same backoff strategy
    - “Already exists” treated as success
  - JSON fields
    - ok
    - ensured_relative
    - ensured_scripts_path
    - ensured_data_path
    - created_in_scripts_chain (number of directories created in the chain)
    - created_in_data_chain
    - duration_ms
    - scripts_path
    - data_path
    - warnings
    - errors
- Exit codes
  - 0 success
  - 2 invalid arguments or path outside base
  - 3 DATA_PATH unavailable or inaccessible
  - 4 filesystem error after retries
  - 5 unexpected or internal error
- Output
  - With --json, every outcome (including errors) is a JSON object on stdout
  - Without it, a one‑line human message: stdout on success, stderr on failure
- Cross‑platform handling
  - Windows paths are normalized with dunce (no \\?\ prefix unless needed)
  - macOS and Linux use UTF‑8 and do not follow symlinks
  - Use path‑aware APIs only; never rely on shell quoting

## Positron – VS Code Extension Specification – sandbox-switcher

- Activation and sandbox detection
  - Activates on startup; detection is repeated every time a command runs, so edits to .Renviron, new workspace folders and a DATA_PATH that comes back are picked up without reloading
  - Case‑sensitive match on a path segment that starts with r_script_sandbox (r_script_sandbox, r_script_sandbox2, …) in any workspace folder path
  - Derive the scripts base by truncating the folder path at that segment inclusive
  - Load .Renviron located at that derived scripts base and read DATA_PATH (and SCRIPT_PATH if present)
  - If SCRIPT_PATH is present and differs from the derived scripts base after normalization, log a warning and use the .Renviron value
  - If no workspace folder is inside a sandbox: stay silent (no popup); commands show a brief status bar note
  - If inside a sandbox but .Renviron is missing or invalid or DATA_PATH is absent: warn with a popup and disable features until fixed
  - DATA_PATH availability is checked at the moment a command needs it
- Workspace roots
  - Never changed automatically: changing workspace folders while the R runtime starts cancels its startup in Positron
  - setupWorkspaceFolders adds, in one updateWorkspaceFolders call, the paired folders for the open project folder (or the roots if the sandbox root is open)
  - “Scripts: <folder basename>” and “Data: <folder basename>”; Data only if DATA_PATH is available
- Commands and default keybindings
  - switchWdOpposite – Ctrl+Alt+W on Windows and Linux, Cmd+Alt+W on macOS
  - revealPairedFolder – also in the explorer context menu
  - syncNow – manual full sync
  - setupWorkspaceFolders
- Command behaviors
  - switchWdOpposite
    - Project folder (relative to the sandbox roots), first match wins
      - The active editor’s folder, if the file is saved and inside a project folder of either sandbox
      - The first open workspace folder that is a project folder of either sandbox
      - The sandbox roots never qualify. With no project folder, show “Open a file in a project folder to switch” in the status bar and do nothing; R is never sent to the top of either sandbox
    - Side
      - The opposite of the side last set for that same project folder in this session; Data if none
      - The remembered side is never used to choose the folder
    - If DATA_PATH is available, run ensure-path (awaited) unless both folders already exist
    - If DATA_PATH is unavailable and the target is the Data side, show a non‑blocking warning and do not change the working directory
    - Send setwd(<target>) to the R console, show “R working directory → Data|Scripts: <folder>” in the status bar, reveal the folder if it is in the workspace
  - revealPairedFolder
    - Source is the explorer selection, else the active saved file’s folder
    - Compute rel and counterpart folder path
    - Run ensure-path
    - Reveal the counterpart in the explorer; if it is not inside a workspace folder, say so
  - syncNow
    - Run sync-full with JSON
    - Show a concise status and log details to an Output channel
- Micro‑sync policy
  - Run ensure-path only when a subfolder is actually used (working directory switch, paired reveal, workspace setup) and one of the paired folders does not exist yet
- R console interaction
  - Never restart or reload R
  - Send setwd via Positron’s workbench.action.executeCode.console command, with the path escaped as an R string and forward slashes on Windows
- Sandbox boundaries
  - Paths outside both SCRIPT_PATH and DATA_PATH are never switched to or revealed
- Parsing .Renviron in the extension
  - Simple KEY=VALUE format with optional quotes
  - Ignore empty lines and comments
  - Trim whitespace and preserve UTF‑8
  - Required key is DATA_PATH; SCRIPT_PATH is optional
- Status UI
  - Status bar for concise success or failure messages
  - Output channel named Sandbox Sync for detailed logs and errors
  - Popups only for errors the user must act on (invalid .Renviron inside a sandbox, DATA_PATH unavailable, failed sync)

## Build and Packaging

- Rust CLI
  - Prebuilt binaries for Windows x64, Linux x64, macOS arm64
  - Binary name sandbox-sync
  - Bundled within the extension under bin/<platform>-<arch>/ (win32-x64, linux-x64, darwin-arm64); fallback to PATH‑resolved sandbox-sync if no bundled binary matches
  - Tests: cargo test (unit tests in src/, end‑to‑end tests in tests/integration_tests.rs)
- Extension
  - TypeScript targeting VS Code and Positron
  - Pure logic (config/, core/) has no vscode import and is unit tested with node --test via npm test
  - Compiled output (out/) is not tracked in Git
  - Create the vsix file with npm run package
- R
  - .Renviron lives in the sandbox root; the startup block lives in ~/.Rprofile
  - R needs sandbox-sync on PATH

## Testing Checklist

- .Renviron parsing with quotes, spaces, and non‑ASCII including missing keys behavior
- Detection with case‑sensitive prefix match for r_script_sandbox; SCRIPT_PATH optional
- Activation in subfolders under SCRIPT_PATH; no popup outside a sandbox
- DATA_PATH unavailable warnings shown and Data root omitted while Scripts commands still work
- R startup from the root and from a subfolder: sync-full runs, console prints concise counts and duration, DATA_PATH is set
- Micro‑sync where ensure-path creates both sides before setwd is sent
- Working directory switching: folder chosen from the active file or open folder, toggle per folder, nothing at the sandbox root, paths quoted, Windows uses forward slashes, non‑ASCII paths succeed
- Large trees where sync-full performance with exclusions is good, parallelism does not thrash the cloud drive, retries handle transient EBUSY and ACCESS_DENIED
- Safety where operations outside bases are refused, symlinks skipped, only missing dirs are created on each side
- Multi‑folder workspace where only the Scripts side is used for sandbox detection

## Operational Notes

- Case‑sensitive prefix match for r_script_sandbox across all operating systems
- Path mapping rule for a Scripts subfolder is rel equals relative of the path to SCRIPT_PATH and DATA_TARGET equals DATA_PATH joined with rel; symmetric when starting from Data
- No watchers, no locks, and mkdir idempotence makes overlaps safe
- No deletions or file operations, directories only
- Git and cloud drive constraints are context only and the tool does not enforce them

## Goals Recap

- Fast, robust bidirectional directory mirroring with Rust
- Simple UX in Positron with a single “switch to opposite” shortcut, paired reveal, optional dual roots
- Minimal complexity with no watchers, no locks, and no session reloads
- One record of the sandbox paths
- Deterministic operation strictly within SCRIPT_PATH and DATA_PATH with clear status messaging and cross‑platform support
