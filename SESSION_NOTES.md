# Sandbox Switcher Extension Development Session Notes

## Date
2025-10-21

## Project Overview
Working on the ADDINS.PNNL.VSC project - a Positron/VS Code extension that keeps two folder trees in lockstep (directories only) for R script and data sandboxes.

## Components
- **Rust CLI**: `sandbox-sync` - bidirectional directory mirroring
- **VS Code Extension**: `sandbox-switcher` - UX for switching between Scripts and Data sandboxes
- **R Integration**: .Rprofile and .Renviron configuration

## Session Progress

### Issues Resolved

#### 1. Workspace Folder Naming and Paths (MAJOR ISSUE)
**Problem**: Workspace folders were named with base paths and pointed to SCRIPT_PATH and DATA_PATH instead of the active subfolder.

**User Requirement**: Option B - Point to the same subfolder level as the currently open folder:
- When `project1` is open:
  - `Scripts: project1` → `C:/Users/kell343/dev/r_script_sandbox/project1`
  - `Data: project1` → `C:/Users/kell343/OneDrive.../data_sandbox2_vscode_test/project1`

**Solution**: Modified `addWorkspaceRoots()` function in `/workspace/sandbox-switcher/src/extension.ts`:
- Detects the currently active folder within SCRIPT_PATH
- Computes relative path from SCRIPT_PATH to active folder
- Creates paired workspace folders at the same subfolder level
- Names folders with basename: `Scripts: <foldername>` and `Data: <foldername>`

**Key Code Changes**:
- Added case-insensitive path comparison for Windows (lines 152-156)
- Detects active folder by checking if existing workspace folders are under SCRIPT_PATH
- Computes `relativePath` and creates `scriptsTargetPath` and `dataTargetPath` accordingly

#### 2. Windows Path Case Sensitivity
**Problem**: Path comparison failing on Windows due to case differences:
- `.Renviron` SCRIPT_PATH: `C:/Users/kell343/dev/r_script_sandbox`
- Workspace folder: `c:\Users\kell343\dev\r_script_sandbox\project1`

**Solution**: Added case-insensitive comparison on Windows:
```typescript
const normalizedLower = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
const scriptsNormalizedLower = process.platform === 'win32' ? scriptsNormalized.toLowerCase() : scriptsNormalized;
```

#### 3. R Console Not Loading (CRITICAL ISSUE)
**Problem**: R console hangs/doesn't load when extension automatically modifies workspace folders during activation.

**Root Cause**: Calling `vscode.workspace.updateWorkspaceFolders()` during extension activation interferes with Positron's R session initialization.

**Solution**:
- Removed automatic workspace folder modification from `activate()` function
- Added manual command: "Sandbox: Setup Paired Workspace Folders"
- Extension activates `onStartupFinished` but doesn't modify workspace until user explicitly requests it
- Added command registration in `package.json` (line 35-38)

#### 4. Manual Setup Requiring Two Executions
**Problem**: Running "Sandbox: Setup Paired Workspace Folders" command twice was required - first execution created Scripts folder, second added Data folder.

**Root Cause**: VS Code `updateWorkspaceFolders()` API was being called multiple times sequentially, causing state sync issues.

**Solution**: Refactored workspace folder update logic to batch operations:
- When adding both folders: single `updateWorkspaceFolders()` call with both folders
- When replacing existing folders: handles index shifts correctly
- Proper handling of different scenarios:
  - Both exist (replace both)
  - Scripts exists, Data needs to be added
  - Neither exists (add both)
  - etc.

## Current State

### Working Features
✅ Extension activates without interfering with R console
✅ Case-insensitive path detection on Windows
✅ Active folder detection based on currently open workspace folder
✅ Workspace folder naming with basename
✅ Manual workspace setup command

### Latest VSIX
Location: `/workspace/sandbox-switcher/sandbox-switcher-0.1.0.vsix`
Size: 2.83 MB

### Key Files Modified
1. `/workspace/sandbox-switcher/src/extension.ts`
   - `addWorkspaceRoots()` function (lines 141-330)
   - `activate()` function (removed automatic workspace setup)
   - Added `sandbox.setupWorkspaceFolders` command

2. `/workspace/sandbox-switcher/package.json`
   - Added new command registration

## Known Issues / To Test
- [ ] Verify manual workspace setup works in single execution
- [ ] Test with different subfolder structures
- [ ] Confirm R console loads properly with new version
- [ ] Test on macOS and Linux (currently only tested on Windows)

## Configuration Details

### User's Environment
- **OS**: Windows
- **SCRIPT_PATH**: `C:/Users/kell343/dev/r_script_sandbox`
- **DATA_PATH**: `C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox2_vscode_test`
- **Test Subfolder**: `project1`

### .Renviron Format
```
SCRIPT_PATH=C:/Users/kell343/dev/r_script_sandbox
DATA_PATH=C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox2_vscode_test
```

## Technical Notes

### VS Code Workspace Folder API
- `updateWorkspaceFolders(start, deleteCount, ...foldersToAdd)`
- Can add multiple folders in one call: `updateWorkspaceFolders(start, 0, folder1, folder2)`
- Should batch operations when possible to avoid state sync issues
- Replacing and adding need careful index management

### Path Normalization on Windows
- Use `path.normalize()` to handle forward/backslash differences
- Always use case-insensitive comparison on Windows
- `.Renviron` may use forward slashes while VS Code uses backslashes

### Extension Activation Timing
- `activationEvents: ["onStartupFinished"]` in package.json
- Must not modify workspace during activation to avoid R session conflicts
- Positron needs time to initialize R session before workspace modifications

## Commands Available

1. **Sandbox: Switch Working Directory to Opposite Sandbox** (`Ctrl+Alt+W`)
   - Main workflow command
   - Switches between Scripts and Data sides

2. **Sandbox: Reveal Paired Folder**
   - Shows the paired folder in explorer

3. **Sandbox: Sync Directories Now**
   - Runs full sync-full operation

4. **Sandbox: Add Data Workspace Root**
   - Adds Data root (legacy command)

5. **Sandbox: Setup Paired Workspace Folders** (NEW)
   - Manually sets up both Scripts and Data workspace folders
   - Should work in single execution (latest fix)

## Next Steps
1. Test latest VSIX to confirm single-execution workspace setup works
2. If working, consider whether automatic setup should be re-added with different approach
3. Test on macOS and Linux
4. Clean up debug logging if desired
5. Update CLAUDE.md if specification needs to reflect Option B behavior

## Build Commands
```bash
cd /workspace/sandbox-switcher
npm run compile
npm run package
```

## Debugging
- Extension output channel: "Sandbox Sync"
- Positron Developer Console: Help > Toggle Developer Tools > Console
- Watch for workspace folder update logs to understand execution flow
