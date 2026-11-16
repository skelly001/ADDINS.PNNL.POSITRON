# Troubleshooting Guide for Sandbox Switcher

Applies to extension version 0.2.0.

## 1. View the output log

In Positron, open the Output panel:
- **View → Output**
- Select **"Sandbox Sync"** from the dropdown

When Positron is opened inside the sandbox you should see:
```
Sandbox detected. Scripts: C:\Users\kell343\dev\r_script_sandbox  Data: C:\Users\kell343\Cloud Drive\Documents\data_sandbox
sandbox-sync binary: C:\Users\kell343\.positron\extensions\pnnl.sandbox-switcher-0.2.0\bin\win32-x64\sandbox-sync.exe
```

Short messages (success, warnings) appear for a few seconds at the left of the
status bar, the strip along the bottom of the window. Every one of them is also
written to this log.

## 2. Common issues

#### The extension does nothing in my folder

**Log shows:**
```
No sandbox detected in the open folders.
```

This is silent by design: in a folder that is not part of a sandbox, the
extension shows no popup. Running a sandbox command there shows
"Not inside an r_script_sandbox folder" in the status bar.

**Fix:**
- Open a folder whose path contains a folder named `r_script_sandbox` (or a
  name starting with it, such as `r_script_sandbox2`). The match is
  case-sensitive.
- Example: `C:\Users\kell343\dev\r_script_sandbox\ROSMAP_SRM` ✓
- Example: `C:\Users\kell343\dev\my_r_scripts` ✗

#### Popup: ".Renviron not found" or "must define DATA_PATH"

You are inside a sandbox, but its configuration is missing or invalid.

**Fix:**
- Create `.Renviron` in the root of your `r_script_sandbox` folder containing:
  ```
  DATA_PATH="C:/Users/kell343/Cloud Drive/Documents/data_sandbox"
  ```
- Use an absolute path, forward slashes (also on Windows), and quotes if the
  path contains spaces.
- The fix is picked up the next time you run a command; no reload is needed.

#### `Sys.getenv("DATA_PATH")` is empty in R / no sync message at startup

R only gets the paths, and only runs the startup sync, through the block in
your home `.Rprofile`.

**Check:**
- Is the block from `examples/.Rprofile.template` in `~/.Rprofile`? (Run
  `path.expand("~/.Rprofile")` in R to see where that file is.)
- Does the folder you opened have its own `.Rprofile`? R then skips the home
  one. Add `source("~/.Rprofile")` as its first line. An old `.Rprofile` left
  in the sandbox root has the same effect when you open the root: delete it.
- Did the console print `sandbox-sync: binary not found on PATH`? Then install
  the binary on your PATH (see the Quick Start).

#### R and the extension use different paths

The root `.Renviron` is the only record of the paths. If you copied
`SCRIPT_PATH` and `DATA_PATH` into `~/.Renviron` for an earlier version, remove
them there. (Inside the sandbox the `~/.Rprofile` block overrides them with the
root values, but outside it they would still be set.)

#### "DATA_PATH is not available"

The folder in `DATA_PATH` does not exist right now (for example the cloud drive is
not running or not synced).

**What this means:**
- Switching to the Data side and revealing paired folders do nothing and show
  this warning. The R session is left untouched.
- **Sandbox: Setup Paired Workspace Folders** adds only the Scripts folder.

**Fix:**
- Make sure the cloud drive is running and synced, and that `DATA_PATH` in the root
  `.Renviron` points to an existing folder.
- Then just use the command again. Availability is checked every time; no
  reload is needed. Run **Sandbox: Setup Paired Workspace Folders** again to
  add the Data folder.

#### "Open a file in a project folder to switch"

Pressing Ctrl+Alt+W found no project folder to switch within. This happens
when Positron is opened at the sandbox root and the active tab is not a saved
file inside a project folder (an unsaved file, a file in the sandbox root, a
file outside the sandbox, or a non-file tab). R is never sent to the top of
either sandbox.

**Fix:**
- Open a saved file in the project folder you want, then press Ctrl+Alt+W, or
- Open Positron at the project folder itself (then the shortcut works from any
  tab).

#### The working directory did not change

- The switch sends `setwd()` to the Positron R console: make sure an R session
  is running in the Console pane.
- Look in the console for an R error, and in the log for the `Sent setwd(...)`
  line to see the exact path used.
- The first press for a folder goes to Data; the next press for the same
  folder goes back to Scripts. If you changed directory yourself in R, the
  extension does not know: press the shortcut again to get to the other side.

#### "Paired folder is not in the workspace"

**Sandbox: Reveal Paired Folder** can only show folders that are in the
explorer. Run **Sandbox: Setup Paired Workspace Folders** first.

#### "sandbox-sync binary not found"

The extension uses the binary bundled for your platform
(`bin/win32-x64`, `bin/linux-x64`, `bin/darwin-arm64`) and otherwise looks for
`sandbox-sync` on your PATH. On other platforms (for example Intel Macs), build
it with `cargo build --release` in `sandbox-sync/` and put it on your PATH.

#### Sync reports "a file with that name already exists"

A folder on one side has the same name as a file on the other side, so the
folder cannot be mirrored. Rename or move the file. The rest of the tree is
still synced.

## 3. Step-by-step test

1. **Install the .vsix**
   - In Positron: Extensions → ... menu → Install from VSIX
   - Select `sandbox-switcher/sandbox-switcher-0.2.0.vsix`
   - Reload the window (Ctrl+Shift+P → "Developer: Reload Window")

2. **Check the log** (View → Output → "Sandbox Sync") for "Sandbox detected".

3. **Start R** in a project folder. The console should print one line such as
   `sandbox-sync: Synced 142 directories (0 created, 142 existing) in 23ms`,
   and `Sys.getenv("DATA_PATH")` should return your data sandbox.

4. **Test the switch**
   - Open a saved R file in a project folder, e.g. `ROSMAP_SRM/analysis/test.R`
   - Press **Ctrl+Alt+W**: the status bar shows
     `R working directory → Data: analysis` and `getwd()` in R agrees
   - Press it again: `R working directory → Scripts: analysis`

5. **Test the safe cases**
   - Open Positron at the sandbox root, make a new unsaved file, press
     Ctrl+Alt+W: the status bar shows "Open a file in a project folder to
     switch" and `getwd()` is unchanged
   - Open Positron in a folder outside the sandbox: no popup appears

## Quick diagnostic checklist

- [ ] Folder path contains a folder whose name starts with `r_script_sandbox`?
- [ ] `.Renviron` exists in the sandbox root and defines `DATA_PATH`?
- [ ] The `DATA_PATH` folder exists on disk (cloud drive running and synced)?
- [ ] The startup block is in `~/.Rprofile`, and there is no `.Rprofile` in the sandbox root?
- [ ] No `SCRIPT_PATH` / `DATA_PATH` left over in `~/.Renviron`?
- [ ] `sandbox-sync --version` works in a terminal?
- [ ] Output log shows "Sandbox detected"?
- [ ] An R session is running in the Console when pressing Ctrl+Alt+W?

## If it still does not work

Collect:
1. The complete "Sandbox Sync" output log
2. Your folder structure (screenshot or text)
3. The contents of the root `.Renviron`
4. What happens when you press Ctrl+Alt+W (status bar message, console output)
