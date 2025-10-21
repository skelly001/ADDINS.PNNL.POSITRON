# Troubleshooting Guide for Sandbox Switcher

## Updated Extension (v0.1.0 - Latest Build)

I've rebuilt the extension with three critical fixes:

1. **Case-insensitive path comparison on Windows**: Fixed the main issue where paths like `C:\Users\...` and `c:\Users\...` were treated as different (CRITICAL FIX)
2. **Path separator fix**: Changed hardcoded `/` to use `path.sep` for Windows compatibility when extracting folder names
3. **Flexible sandbox detection**: Now accepts folders starting with `r_script_sandbox` (not just exact match)

**New .vsix location**: `/workspace/sandbox-switcher/sandbox-switcher-0.1.0.vsix`

## What Was Fixed

### The Case Sensitivity Bug (SOLVED)

**Your error message**:
```
switchWdOpposite: Path c:\Users\kell343\dev\r_script_sandbox\project1 is outside sandboxes
```

**Root cause**: Windows normalizes paths with lowercase drive letters (`c:\`), but your `.Renviron` had uppercase (`C:\`). The extension was doing case-sensitive string comparison, so it thought `c:\Users\...` was outside of `C:\Users\...`.

**Fix**: All path comparisons now use `.toLowerCase()` on Windows, making them case-insensitive as they should be.

## What to Check

### 1. View Output Logs

In Positron, open the Output panel:
- **View → Output**
- Select **"Sandbox Sync"** from the dropdown

You should see logs like:
```
Sandbox Switcher extension activating...
Sandbox detected:
  Scripts path: C:\Users\kell343\dev\r_script_sandbox
  Data path: C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox
  Data available: true
Binary path: C:\Users\kell343\.positron\extensions\pnnl.sandbox-switcher-0.1.0\bin\win32-x64\sandbox-sync.exe
Added 2 workspace root(s)
Sandbox Switcher activated successfully
```

### 2. Common Issues and What Logs Will Show

#### Issue: "Sandbox not detected"

**Logs will show:**
```
Sandbox not detected:
  Error: No workspace folder contains "r_script_sandbox" segment (case-sensitive)
```

**Fix:**
- Make sure you've opened the correct folder in Positron
- The folder path must contain `r_script_sandbox` as an exact segment
- Example: `C:\Users\kell343\dev\r_script_sandbox` ✓
- Example: `C:\Users\kell343\dev\my_r_scripts` ✗

#### Issue: ".Renviron not found or invalid"

**Logs will show:**
```
Sandbox not detected:
  Error: .Renviron not found in C:\Users\kell343\dev\r_script_sandbox
```

**Fix:**
- Create `.Renviron` in your r_script_sandbox folder
- Must contain:
  ```
  SCRIPT_PATH="C:/Users/kell343/dev/r_script_sandbox"
  DATA_PATH="C:/Users/kell343/OneDrive - PNNL/Documents/data_sandbox"
  ```
- Use forward slashes even on Windows
- Use quotes if paths contain spaces

#### Issue: "DATA_PATH not available"

**Logs will show:**
```
Sandbox detected:
  Scripts path: C:\Users\kell343\dev\r_script_sandbox
  Data path: C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox
  Data available: false
  Warning: DATA_PATH (...) is not available or not accessible
```

**What this means:**
- Extension activated successfully
- Scripts workspace root was added
- Data workspace root was NOT added (OneDrive folder doesn't exist or isn't synced)

**Fix:**
- Ensure OneDrive is running and synced
- Check that the DATA_PATH in .Renviron points to an existing folder
- Run command "Sandbox: Add Data Workspace Root" after OneDrive is available

#### Issue: "No active file or folder to switch from"

**When you press Ctrl+Alt+W, logs will show:**
```
switchWdOpposite: No context path found
```

**What this means:**
- Extension is working
- But you don't have an R file open in the editor

**Fix:**
- Open an R file (e.g., `analysis/test.R`) in the editor
- Make sure the file is under your r_script_sandbox folder
- Then press Ctrl+Alt+W

#### Issue: "No R terminal found"

**Logs will show:**
```
(after the context is determined successfully, but then...)
No R terminal found
```

**Fix:**
- Start an R terminal in Positron (Terminal → New Terminal → R)
- Make sure it's named with "R" in the title
- Then try Ctrl+Alt+W again

#### Issue: "Current path is outside sandbox boundaries"

**Logs will show:**
```
switchWdOpposite: Path C:\Users\kell343\Documents\other_project is outside sandboxes
```

**What this means:**
- You're trying to switch from a file that's not in r_script_sandbox or data_sandbox

**Fix:**
- Navigate to a file inside your r_script_sandbox folder first
- Then press Ctrl+Alt+W

## Step-by-Step Testing

1. **Install the new .vsix**:
   - In Positron: Extensions → ... menu → Install from VSIX
   - Select `/workspace/sandbox-switcher/sandbox-switcher-0.1.0.vsix`
   - Reload Positron window (Ctrl+Shift+P → "Developer: Reload Window")

2. **Check activation logs**:
   - View → Output → "Sandbox Sync"
   - Confirm "Sandbox Switcher activated successfully"
   - Share the full log if you see any errors

3. **Verify workspace roots**:
   - You should see two roots in the Explorer:
     - "Scripts: r_script_sandbox" (or similar)
     - "Data: data_sandbox" (if DATA_PATH is available)

4. **Test switchWdOpposite**:
   - Open an R file (e.g., `analysis/test.R`) in r_script_sandbox
   - Start an R terminal (Terminal → New Terminal → R)
   - Press **Ctrl+Alt+W**
   - Check logs for what happened

5. **Expected success logs**:
   ```
   switchWdOpposite: Context=scripts, Relative=analysis
   Ensuring path: analysis
   Path ensured: analysis (45ms)
   setwd sent: C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox\analysis
   Revealed in explorer: C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox\analysis
   ```

## Quick Diagnostic Checklist

- [ ] Folder contains `r_script_sandbox` in the path?
- [ ] `.Renviron` exists in r_script_sandbox root?
- [ ] `.Renviron` has SCRIPT_PATH and DATA_PATH defined?
- [ ] Both paths in `.Renviron` exist on disk?
- [ ] OneDrive is running and synced?
- [ ] Extension shows in Output: "Sandbox Switcher activated successfully"?
- [ ] Both workspace roots visible in Explorer?
- [ ] R file is open in the editor when pressing Ctrl+Alt+W?
- [ ] R terminal is running?

## Next Steps

If you've followed all the steps and it's still not working, please share:
1. The complete "Sandbox Sync" output log
2. Your folder structure (screenshot or text)
3. Contents of your `.Renviron` file
4. What happens when you press Ctrl+Alt+W (any notification? any log entry?)
