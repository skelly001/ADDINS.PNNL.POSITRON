# To fix

From the code review on 2026-11-14/15.

## Status (2026-11-15)

Done and checked on macOS: everything in the original list below except the
items under "Still to do". Rust: 47 tests pass, no compiler or clippy warnings.
Extension: compiles, 17 unit tests pass, packaged as
`sandbox-switcher/sandbox-switcher-0.2.0.vsix` with a Mac (arm64) binary.
R startup block: tested from the sandbox root, a subfolder and a non-sandbox folder.
All docs and CLAUDE.md describe the new behaviour.

Still to do:
- [ ] Try the 0.2.0 extension in Positron (TROUBLESHOOTING_GUIDE.md, "Step-by-step test").
      Nothing that needs a running Positron has been tested.
- [ ] Personal setup: put the block from `examples/.Rprofile.template` in `~/.Rprofile`,
      delete the sandbox-root `.Rprofile`, remove `SCRIPT_PATH`/`DATA_PATH` from `~/.Renviron`.
- [ ] Rebuild the bundled Windows and Linux binaries (still the old build; Docker was not
      running). The old ones work with the new extension but keep the old CLI bugs.
- [ ] Windows check: cloud drive placeholder folders are now treated as normal folders
      (only symlinks and junctions are skipped). Confirm on a real cloud drive folder.
- [ ] Decide on tracked build artifacts: `sandbox-switcher-0.1.0.vsix`, the stub
      `sandbox-switcher.vsix`, `dist/bin/`, `sandbox-sync/target/release/`. Left as they were.
- [ ] `scripts/build-all.sh` still writes `sandbox-switcher.vsix`; `scripts/test-sync.sh` tests
      commands (`watch`, `check`) that do not exist. Both were already like this; not changed.

Original list (kept for reference; not individually ticked):

## Configuration: record the sandbox paths in one place

- [ ] Make the root `.Renviron` the only record of the paths.
  - Rewrite `examples/.Rprofile.template` as a path-free snippet for `~/.Rprofile`:
    walk up from `getwd()` to the folder whose name starts with `r_script_sandbox`,
    `readRenviron()` its `.Renviron`, run `sandbox-sync sync-full`.
  - Remove the root `.Rprofile` from the setup (the home one then runs at the root too).
  - Revise the uncommitted doc edits (CLAUDE.md, README.md, USER_GUIDE.md,
    TROUBLESHOOTING_GUIDE.md, docs/QUICK_START.md, docs/POSITRON_SETUP_GUIDE.md):
    replace the "also copy the paths into `~/.Renviron`" advice.
  - Fix the wrong claim in USER_GUIDE.md that R reads `~/.Renviron` in every session
    (R reads the startup folder's `.Renviron` if present, otherwise the home one).
  - Document the catch: a subfolder with its own `.Rprofile` needs `source("~/.Rprofile")`.
- [ ] Make `SCRIPT_PATH` optional in `.Renviron` (the extension already derives it); keep accepting it.
- [ ] Stop tracking `.env`; keep `.env.example`.

## Extension bugs

- [ ] `switchWdOpposite.ts:84`: `ensure-path` is debounced and not awaited, so `setwd()` can be
      sent before the folder exists; the new directory is recorded as current even when R errors.
- [ ] `switchWdOpposite.ts:12`: last-set directory wins over the active editor, so the shortcut
      keeps toggling the first pair after you move to another project.
- [ ] `switchWdOpposite.ts:20`: on first use, an unsaved file (or any tab that isn't a file in the
      sandbox) gives "outside sandbox boundaries" / "No active file" and nothing happens.
      Fix together with the item above. Never use the stored directory to choose the project
      (it can silently send R to another project's folder):
      - project folder = the active editor's folder if it is a saved file inside the sandbox,
        otherwise the open workspace folder;
      - side = opposite of the side last set for that same project folder; Data if none;
      - always show the destination ("R working directory → Data: <folder>").
      Decided cases when no saved sandbox file is active (e.g. an unsaved tab):
      - Positron opened at a project subfolder (`r_script_sandbox/ROSMAP_SRM`): switch to the
        paired folder (`data_sandbox/ROSMAP_SRM`).
      - Positron opened at the sandbox root: do nothing and show a message such as
        "Open a file in a project folder to switch". Never send R to the top of either sandbox.
- [ ] `extension.ts:33`: no popup when Positron is opened in a non-sandbox folder. Stay silent
      (log only) unless a `r_script_sandbox` folder was found and its `.Renviron` is missing or invalid.
- [ ] `isDataPathAvailable` is computed once at activation and never rechecked
      (`addDataRoot` doesn't update it either).
- [ ] Files at the sandbox root: relative path is empty and the CLI rejects an empty `--relative`,
      so reveal aborts and switch logs a failure.
- [ ] `sandbox.ts:202`: a trailing slash on a `.Renviron` path makes every file "outside sandbox".
- [ ] `cli.ts:54`: looks for `bin/darwin-x64`, but no Mac binary is bundled (the built one is arm64
      in `sandbox-sync/target/release/mac`). The "binary not found" branch in `activate` is unreachable.
- [ ] `extension.ts:286-306`: two back-to-back `updateWorkspaceFolders` calls; return values ignored;
      success always reported; can add a Data folder that doesn't exist yet.
- [ ] `revealPairedFolder.ts`: reports success even when the path is outside every workspace folder.
- [ ] `addDataRoot` and `setupWorkspaceFolders` are not registered in disabled mode.
- [ ] Escape the path inside `setwd("…")`.
- [ ] Switch and reveal run `ensure-path` without first checking that DATA_PATH is available
      (the spec says to skip it and warn).
- [ ] `extension.ts:87`: the reveal handler drops its argument, so reveal can only use the active
      editor; there is no explorer right-click entry either.
- [ ] `sandbox.ts:234`: `rel.includes('..')` rejects valid folder names that contain two dots.
- [ ] `ui.ts`: an earlier status message's timer hides a later message early.

## Rust CLI bugs

- [ ] Created/existing counts are racy (parents and children created in parallel).
      Fix by creating only what is missing on each side; this also removes most cloud drive traffic.
- [ ] A file with the same name as a folder on the other side is reported as `ok: true`.
- [ ] `test_normalize_path` and `test_safe_join` fail on macOS (`/var` vs `/private/var`);
      `safe_join` compares against an uncanonicalized base.
- [ ] `walk.rs:46`: one unreadable subfolder aborts the whole sync; make it a warning.
- [ ] `filter.rs:107`: skips every Windows reparse point, which may include cloud drive placeholder
      folders. Not verified; test on Windows.

## `.Rprofile` template

- [ ] Use `system2()` with `shQuote()`; the binary path is unquoted today.
- [ ] The safety check tests `getwd()` but its message says "SCRIPT_PATH"; `duration` is computed
      and never used.
- [ ] Sandbox-name check disagrees with the extension (`r_script_sandbox2` accepted by one,
      rejected by the other) and with the "exact match" rule in CLAUDE.md. Pick one rule.

## Redundancy to remove

- [ ] Merge `addDataRoot` and `setupWorkspaceFolders`.
- [ ] One shared "ensure path, then mark ensured" helper for switch and reveal.
- [ ] Delete `utils/terminal.ts` (unused) and the empty `watch.rs`.
- [ ] Use `normalizePathForComparison` in `addWorkspaceRoots` instead of the two inline copies.
- [ ] Collapse `determinePathContext` / `getRelativePath` / `getPairedPath` into one containment check.
- [ ] One command-registration path instead of enabled/disabled twins with per-handler guards.
- [ ] One status-bar method in `ui.ts` taking icon and duration.
- [ ] `cli.rs`: one helper for the error-output block repeated six times.
- [ ] Normalize base paths once per run; validate the relative path once.
- [ ] `filter.rs`: drop globs made redundant by the dot-component check; filter once per directory in `walk.rs`.
- [ ] Format the "Synced N directories" message in one place (CLI), not also in `syncNow.ts` and `.Rprofile`.
- [ ] Remove unused `safe_join`, `is_descendant`, `to_forward_slashes`.
- [ ] Keep one copy of the binaries (`dist/bin/` vs `sandbox-switcher/bin/`).

## Housekeeping

- [ ] Add tests: `tests/integration_tests.rs` is empty, the extension has none, `npm test` points
      to a missing file.
- [ ] Sync docs with code: flags are `--scripts` / `--data`, not `--scripts-path` / `--data-path`;
      the spec describes automatic root-adding and `terminal.sendText`, which the code doesn't do.
- [ ] Clear the four compiler warnings (two unused imports, unused `scripts_dirs` / `data_dirs`).
- [ ] Stop tracking compiled `out/` and the `.vsix` files; `sandbox-switcher.vsix` is a stale stub.
