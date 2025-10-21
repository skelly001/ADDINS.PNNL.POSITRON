## Title

ADDINS.PNNL.VSC

## Overview

This tool keeps two folder trees in lockstep (directories only) and provides fast, non‑intrusive UX in Positron:

- SCRIPT_PATH: base path to the highest level of the r_script_sandbox (Git‑tracked; R scripts only)
- DATA_PATH: base path to the highest level of the data sandbox (shared via OneDrive; large outputs; not Git‑tracked)
- Bidirectional, dirs‑only mirroring between SCRIPT_PATH and DATA_PATH (no file copying, no deletions)
- Single keyboard shortcut to switch the R working directory to the opposite side from the current context
- Positron shows both roots (“Scripts: <folder>” and “Data: <folder>”) and auto‑reveals the paired folder without touching the R session
- Full sync runs at R startup; micro‑sync ensures paths exist when they are actually used
- Operates only within r_script_sandbox; robust handling of spaces and non‑ASCII; cross‑platform (Windows, macOS, Linux)
- Simple by design: no long‑lived watchers, no lock files
- Git and OneDrive constraints are context only; not enforced by the tool

## Components

- Rust CLI binary: sandbox-sync
  - sync-full: bidirectional dirs‑only mirroring between SCRIPT_PATH and DATA_PATH
  - ensure-path: ensure a single relative path exists on both sides
  - Emits compact JSON, checks DATA_PATH availability, returns non‑zero on errors
- Positron – VS Code extension: sandbox-sync-ext
  - UX only: add workspace roots, a single “switch to opposite” shortcut, paired reveal, micro‑sync on action
  - Case‑sensitive detection of the r_script_sandbox path segment; derives scripts base; loads .Renviron for SCRIPT_PATH and DATA_PATH
  - Sends setwd() to the active R terminal; never reloads R or the extension
- R startup (.Rprofile in SCRIPT_PATH)
  - Loads project‑local .Renviron, reads SCRIPT_PATH and DATA_PATH, invokes sync-full, prints status to console

## Configuration

- .Renviron – project‑local at SCRIPT_PATH
  - Must define two keys: SCRIPT_PATH and DATA_PATH using absolute paths
  - Values may be quoted to accommodate spaces
- .Rprofile – in SCRIPT_PATH
  - On session start or restart, explicitly loads .Renviron from SCRIPT_PATH
  - Reads SCRIPT_PATH and DATA_PATH
  - Invokes sandbox-sync sync-full with JSON output and prints CLI output to the console
  - If DATA_PATH is unavailable, the CLI reports it; R prints the message and continues

## Rust CLI Specification – sandbox-sync

- Language and crates
  - Rust 1.74 or newer
  - clap, walkdir, rayon, serde, serde_json, anyhow or thiserror, pathdiff, dunce for normalization, cfg-if
- Command – sync-full
  - Purpose
    - Bidirectional dirs‑only mirroring
    - Build the union of all relative directories under SCRIPT_PATH and DATA_PATH excluding noise
    - Create missing directories on each side
  - Flags
    - --scripts-path <SCRIPT_PATH>
    - --data-path <DATA_PATH>
    - --json optional
  - Behavior
    - Validate both bases
    - If DATA_PATH does not exist or is inaccessible, return error JSON and exit non‑zero
    - Walk both trees without following symlinks; collect relative dir sets ignoring excluded directories
    - Exclusions include .git, .Rproj.user, .vscode, .positron, **pycache**, .DS_Store, Thumbs.db, tmp and hidden system dirs; skip symlinks and reparse points
    - Compute union of relative dirs
    - In parallel with rayon and moderate concurrency, mkdir -p missing paths on both sides
    - Treat “already exists” as success
    - On EBUSY or ACCESS_DENIED, retry with small exponential backoff
    - Never delete; never touch files
  - JSON fields
    - ok
    - created_in_scripts
    - created_in_data
    - created_total
    - existing_total
    - duration_ms
    - scripts_path
    - data_path
    - warnings
    - errors
- Command – ensure-path
  - Purpose
    - Ensure a single relative path chain exists on both SCRIPT_PATH and DATA_PATH
  - Flags
    - --scripts-path <SCRIPT_PATH>
    - --data-path <DATA_PATH>
    - --relative <RELATIVE_PATH>
    - --json optional
  - Behavior
    - Validate RELATIVE_PATH is a safe descendant path by normalizing and rejecting traversal like ..
    - mkdir -p SCRIPT_PATH/RELATIVE_PATH and DATA_PATH/RELATIVE_PATH
    - Same backoff strategy
    - “Already exists” treated as success
  - JSON fields
    - ok
    - ensured_relative
    - ensured_scripts_path
    - ensured_data_path
    - created_in_scripts_chain
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
- Cross‑platform handling
  - Windows uses wide‑char APIs and normalizes long paths with a prefix when needed; prefer forward slashes in printed or setwd paths
  - macOS and Linux use UTF‑8 and do not follow symlinks
  - Use path‑aware APIs only; never rely on shell quoting

## Positron – VS Code Extension Specification – sandbox-sync-ext

- Activation and sandbox detection
  - Case‑sensitive, exact path‑segment match for r_script_sandbox in any workspace folder path
  - Derive the scripts base by truncating the folder path at r_script_sandbox inclusive
  - Load .Renviron located at that derived scripts base and read SCRIPT_PATH and DATA_PATH
  - Use SCRIPT_PATH and DATA_PATH from .Renviron as authoritative roots
  - Validate SCRIPT_PATH from .Renviron equals the derived scripts base after normalization; if mismatch, warn and proceed using .Renviron values
  - If .Renviron is missing or malformed or keys are absent, warn and disable features until fixed
  - If DATA_PATH does not exist or is inaccessible, notify the user, add only the Scripts root, and disable Data‑side actions until available with a retry action
- Workspace roots
  - Add two roots without reloading R
  - “Scripts: <basename of SCRIPT_PATH>” points to SCRIPT_PATH
  - “Data: <basename of DATA_PATH>” points to DATA_PATH only if available
- Commands and default keybindings
  - switchWdOpposite – recommended Ctrl+Alt+W on Windows and Linux, Cmd+Alt+W on macOS
  - revealPairedFolder
  - syncNow – optional manual full sync
- Command behaviors
  - switchWdOpposite
    - Determine context in this order: active editor file, focused explorer item, last‑used sandbox path
    - If context is under SCRIPT_PATH
      - Compute rel as the path relative to SCRIPT_PATH
      - Run ensure-path with rel
      - If DATA_PATH is available, send setwd(DATA_PATH/rel) to the active R terminal and reveal the paired Data folder
      - If DATA_PATH is unavailable, show a non‑blocking warning and do not change the working directory
    - If context is under DATA_PATH
      - Compute rel as path relative to DATA_PATH
      - Optionally run ensure-path for symmetry
      - Send setwd(SCRIPT_PATH/rel) to the active R terminal and reveal the paired Scripts folder
    - If context is outside both roots, show a brief notice and do nothing
  - revealPairedFolder
    - Compute rel and counterpart folder path
    - Run ensure-path
    - Reveal the counterpart in the explorer
  - syncNow – optional
    - Run sync-full with JSON
    - Show a concise status and log details to an Output channel
- Micro‑sync policy
  - Run ensure-path only when a subfolder is actually used such as working directory switch, paired reveal, first open in a session
  - Cache ensured relative paths per session
  - Debounce per relative path to coalesce bursts
- R terminal interaction
  - Never restart or reload R
  - Send setwd via terminal.sendText
  - If multiple R terminals exist, prompt the user to select one
- Sandbox boundaries
  - Features are active only when the current item is within SCRIPT_PATH
  - Outside SCRIPT_PATH, commands show a notice and do nothing
- Parsing .Renviron in the extension
  - Simple KEY=VALUE format with optional quotes
  - Ignore empty lines and comments
  - Trim whitespace and preserve UTF‑8
  - Required keys are SCRIPT_PATH and DATA_PATH; if missing or invalid, warn and disable features
- DATA_PATH availability handling
  - On activation if DATA_PATH is unavailable, notify, add only Scripts root, and offer retry
  - On micro‑sync or reveal if DATA_PATH is unavailable, show a non‑blocking warning, skip ensure-path and Data‑side operations, keep the R session untouched
- Status UI
  - Status bar for concise success or failure messages
  - Output channel named Sandbox Sync for detailed logs and errors
  - Minimal, non‑blocking notifications on errors such as DATA_PATH unavailable

## JSON Output Contract

- sync-full fields
  - ok
  - created_in_scripts
  - created_in_data
  - created_total
  - existing_total
  - duration_ms
  - scripts_path
  - data_path
  - warnings
  - errors
- ensure-path fields
  - ok
  - ensured_relative
  - ensured_scripts_path
  - ensured_data_path
  - created_in_scripts_chain
  - created_in_data_chain
  - duration_ms
  - scripts_path
  - data_path
  - warnings
  - errors
- Exit codes
  - 0 success
  - 2 invalid arguments or path outside base
  - 3 DATA_PATH unavailable
  - 4 filesystem error after retries
  - 5 unexpected or internal error

## Build and Packaging

- Rust CLI
  - Prebuilt binaries for Windows x64, Linux x64
  - Binary name sandbox-sync
  - Bundle within the extension under bin per platform and architecture; fallback to PATH‑resolved sandbox-sync if bundled binary not found
- Extension
  - TypeScript targeting VS Code and Positron
  - Dependencies include vscode, child_process for spawn, fs, path
  - Output channel named Sandbox Sync and a status bar item for short messages
  - Create the vsix file
- R
  - .Renviron and .Rprofile live in SCRIPT_PATH
  - Optional use of jsonlite in R for JSON parsing; otherwise print the CLI’s human message if the json flag is omitted

## Testing Checklist

- .Renviron parsing with quotes, spaces, and non‑ASCII including missing keys behavior
- Detection with case‑sensitive exact segment match for r_script_sandbox and derived base equals .Renviron’s SCRIPT_PATH
- Activation in subfolders under SCRIPT_PATH with roots created and paired reveal triggering ensure-path
- DATA_PATH unavailable warnings shown and Data root omitted while Scripts commands still work
- R startup where sync-full runs and console prints concise counts and duration
- Micro‑sync where ensure-path creates both sides, per‑session cache avoids repeats, debouncing works
- Working directory switching where setwd is sent, paths quoted, Windows uses forward slashes, non‑ASCII paths succeed
- Large trees where sync-full performance with exclusions is good, parallelism does not thrash OneDrive, retries handle transient EBUSY and ACCESS_DENIED
- Safety where operations outside bases are refused, symlinks skipped, union logic creates missing dirs on both sides
- Multi‑folder workspace where only the Scripts side is used for sandbox detection and relative computations and the Data side is never used for detection

## Operational Notes

- Case‑sensitive segment match for r_script_sandbox across all operating systems
- Path mapping rule for a Scripts subfolder is rel equals relative of the path to SCRIPT_PATH and DATA_TARGET equals DATA_PATH joined with rel; symmetric when starting from Data
- No watchers, no locks, and mkdir idempotence makes overlaps safe
- No deletions or file operations, directories only
- Git and OneDrive constraints are context only and the tool does not enforce them

## Goals Recap

- Fast, robust bidirectional directory mirroring with Rust
- Simple UX in Positron with dual roots, single “switch to opposite” shortcut, paired reveal
- Minimal complexity with no watchers, no locks, and no session reloads
- Deterministic operation strictly within SCRIPT_PATH and DATA_PATH with clear status messaging and cross‑platform support
