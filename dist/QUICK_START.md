# Positron Sandbox Switcher - Quick Start Checklist

Follow these steps in order to get up and running in 5 minutes.

---

## Step 1: Install the Binary

**Windows:**

1. Copy `binaries/sandbox-sync-windows-x64.exe` to a permanent location:
   ```
   C:\Users\kell343\dev\ADDINS.PNNL.VSC\bin\sandbox-sync-windows-x64.exe
   ```

2. Test it works:
   - Open Command Prompt or PowerShell
   - Run: `C:\Users\kell343\dev\ADDINS.PNNL.VSC\bin\sandbox-sync-windows-x64.exe version`
   - You should see: `sandbox-sync 0.1.0`

**Linux:**

```bash
sudo cp binaries/sandbox-sync-linux-x64 /usr/local/bin/sandbox-sync
sudo chmod +x /usr/local/bin/sandbox-sync
sandbox-sync version
```

---

## Step 2: Install the Extension

1. Open Positron IDE

2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)

3. Type: `Extensions: Install from VSIX`

4. Navigate to and select: `extension/sandbox-switcher-0.1.0.vsix`

5. Click "Install"

6. Click "Reload" when prompted

---

## Step 3: Configure Extension Settings

**IMPORTANT: This is the step you're currently missing!**

### Option A: Using Settings UI (Easier)

1. Press `Ctrl+,` (or `Cmd+,` on macOS) to open Settings

2. In the search bar, type: `sandbox`

3. Fill in these three required settings:

   | Setting | Your Value |
   |---------|------------|
   | **Sandbox: Scripts Path** | `C:/Users/kell343/dev/r_script_sandbox2_vscode_test` |
   | **Sandbox: Data Path** | `C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox2_vscode_test` |
   | **Sandbox: Sync Binary Path** | `C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe` |

4. Optional settings (recommended defaults):
   - **Sandbox: Gitkeep** → ✓ (checked)
   - **Sandbox: Auto Sync On Startup** → ✓ (checked)
   - **Sandbox: Watch During Session** → ☐ (unchecked)

### Option B: Using settings.json (Faster)

1. Press `Ctrl+Shift+P` → Type: `Preferences: Open User Settings (JSON)`

2. Add this to the JSON file:

   ```json
   {
     "sandbox.scriptsPath": "C:/Users/kell343/dev/r_script_sandbox2_vscode_test",
     "sandbox.dataPath": "C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox2_vscode_test",
     "sandbox.syncBinaryPath": "C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe",
     "sandbox.gitkeep": true,
     "sandbox.autoSyncOnStartup": true,
     "sandbox.watchDuringSession": false
   }
   ```

3. Save the file (`Ctrl+S`)

4. Reload Positron: `Ctrl+Shift+P` → `Developer: Reload Window`

---

## Step 4: Verify It Works

1. After reloading, you should see a notification: "Sandbox sync completed"

2. Press `Ctrl+Shift+P` → Type: `Sandbox: Focus on Scripts`
   - Explorer should show your scripts folder
   - Status bar should show: "Scripts"

3. Press `Ctrl+Shift+D` (Focus on Data)
   - Explorer should show your data folder
   - Status bar should show: "Data"

4. If you have R running, check: `getwd()`
   - Should match the currently focused sandbox

---

## Step 5: Set Up R Integration (Optional)

1. Copy `examples/.Rprofile` to your scripts sandbox root:
   ```
   C:\Users\kell343\dev\r_script_sandbox2_vscode_test\.Rprofile
   ```

2. Copy `examples/sandbox.config.json` to your scripts sandbox root:
   ```
   C:\Users\kell343\dev\r_script_sandbox2_vscode_test\sandbox.config.json
   ```

3. Edit `sandbox.config.json` with your paths:
   ```json
   {
     "scriptsPath": "C:/Users/kell343/dev/r_script_sandbox2_vscode_test",
     "dataPath": "C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox2_vscode_test",
     "binaryPath": "C:/Users/kell343/dev/ADDINS.PNNL.VSC/bin/sandbox-sync-windows-x64.exe",
     "gitkeep": true,
     "excludes": []
   }
   ```

4. Restart R console in Positron
   - You should see: "Sandbox sync completed: X directories synced"

---

## Quick Test

Run these keyboard shortcuts:

- `Ctrl+Shift+S` → Should switch to Scripts
- `Ctrl+Shift+D` → Should switch to Data
- `Ctrl+Shift+T` → Should toggle between them
- `Ctrl+Shift+Y` → Should run sync and show notification

---

## Troubleshooting

### "Sandbox paths not configured"

**You're seeing this error right now!**

**Cause:** Extension settings haven't been set up yet.

**Fix:** Complete Step 3 above - configure the three required paths in settings.

---

### "Binary not found"

**Cause:** The `sandbox.syncBinaryPath` setting is wrong or the file doesn't exist.

**Fix:**
1. Verify the file exists at the path you specified
2. In Windows, use forward slashes: `C:/path/to/binary.exe`
3. Or use escaped backslashes: `C:\\path\\to\\binary.exe`

---

### "Error: unexpected argument '-' found"

**Cause:** Path contains spaces (like "OneDrive - PNNL") and isn't quoted properly.

**Fix:** This should be handled automatically by the .Rprofile. Ensure you're using the provided .Rprofile file from the examples folder.

---

### R working directory not changing

**Cause:** No active R terminal.

**Fix:**
1. Start an R console in Positron
2. Make sure the R Console tab is active
3. Try switching sandboxes again

---

## Daily Workflow

Once configured, your typical workflow:

1. Open Positron
2. Start R console (auto-sync runs)
3. Press `Ctrl+Shift+S` to work on scripts
4. Write your R code
5. Press `Ctrl+Shift+D` to access data
6. Load/save data files
7. Press `Ctrl+Shift+T` to toggle back and forth as needed

**No manual navigation. No R restarts. Instant switching.**

---

## Need More Help?

See the full guide: [POSITRON_SETUP_GUIDE.md](POSITRON_SETUP_GUIDE.md)

---

**Your Current Status:** You need to complete **Step 3** (Configure Extension Settings).

After that, everything should work!
