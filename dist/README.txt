================================================================================
                    SANDBOX-SYNC DISTRIBUTION PACKAGE
                              Version 0.1.0
================================================================================

CONTENTS:
---------
binaries/
  ├── sandbox-sync-linux-x64          (3.6 MB) - Linux binary
  └── sandbox-sync-windows-x64.exe    (5.8 MB) - Windows binary

extension/
  └── sandbox-switcher-0.1.0.vsix     (4.7 KB) - VS Code/Positron extension

examples/
  ├── .Rprofile                       - R integration example
  └── sandbox.config.json             - Configuration example

================================================================================
QUICK START - WINDOWS
================================================================================

1. COPY THE BINARY
   Copy binaries/sandbox-sync-windows-x64.exe to a permanent location:
   
   Recommended: C:\Users\<your-username>\bin\sandbox-sync.exe
   
   Or add to a directory already in your PATH

2. TEST THE BINARY
   Open PowerShell and run:
   
   C:\Users\<your-username>\bin\sandbox-sync.exe version
   
   You should see:
   sandbox-sync 0.1.0
   Fast directory structure synchronization tool for R sandbox workflows

3. RUN YOUR FIRST SYNC
   
   C:\Users\<your-username>\bin\sandbox-sync.exe ^
     --scripts "C:\Users\kell343\dev\r_script_sandbox2_vscode_test" ^
     --data "C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test" ^
     check
   
   This will show you what directories are different between the two sandboxes.

4. SYNC THE DIRECTORIES
   
   C:\Users\<your-username>\bin\sandbox-sync.exe ^
     --scripts "C:\Users\kell343\dev\r_script_sandbox2_vscode_test" ^
     --data "C:\Users\kell343\OneDrive - PNNL\Documents\data_sandbox2_vscode_test" ^
     sync

5. INSTALL VS CODE EXTENSION (Optional)
   - Open VS Code or Positron
   - Go to Extensions view
   - Click "..." menu → "Install from VSIX..."
   - Select extension/sandbox-switcher-0.1.0.vsix
   
   Configure settings (Ctrl+,):
   {
     "sandbox.scriptsPath": "C:\\Users\\kell343\\dev\\r_script_sandbox2_vscode_test",
     "sandbox.dataPath": "C:\\Users\\kell343\\OneDrive - PNNL\\Documents\\data_sandbox2_vscode_test",
     "sandbox.syncBinaryPath": "C:\\Users\\<your-username>\\bin\\sandbox-sync.exe"
   }
   
   Use keyboard shortcuts:
   - Ctrl+Shift+S: Focus Scripts
   - Ctrl+Shift+D: Focus Data
   - Ctrl+Shift+T: Toggle between Scripts/Data
   - Ctrl+Shift+Y: Sync Now

6. SET UP R INTEGRATION (Optional)
   - Copy examples/.Rprofile to your scripts sandbox directory
   - Edit examples/sandbox.config.json with your paths
   - Copy it to your scripts sandbox directory
   - Next time you start R from that directory, it will auto-sync!

================================================================================
QUICK START - LINUX
================================================================================

1. COPY THE BINARY
   cp binaries/sandbox-sync-linux-x64 ~/bin/sandbox-sync
   chmod +x ~/bin/sandbox-sync
   
   # Add to PATH if ~/bin is not already in PATH
   echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc

2. TEST THE BINARY
   sandbox-sync version

3. RUN SYNC
   sandbox-sync --scripts /path/to/scripts --data /path/to/data sync

================================================================================
COMMAND REFERENCE
================================================================================

BASIC COMMANDS:
  version  - Show version information
  check    - Report differences without making changes
  sync     - Synchronize directories (create missing dirs)
  watch    - Monitor and auto-sync in real-time

COMMON OPTIONS:
  --scripts <PATH>     - Path to scripts sandbox (Git-tracked)
  --data <PATH>        - Path to data sandbox (OneDrive)
  --gitkeep            - Create .gitkeep files in empty directories
  --dry-run            - Show what would be done without making changes
  --exclude <PATTERN>  - Exclude pattern (can be used multiple times)
  --log-level <LEVEL>  - Set log level: debug, info, warn, error

EXAMPLES:

  # Check what would be synced
  sandbox-sync --scripts C:\scripts --data C:\data check
  
  # Sync with dry-run (no actual changes)
  sandbox-sync --scripts C:\scripts --data C:\data --dry-run sync
  
  # Sync and create .gitkeep files
  sandbox-sync --scripts C:\scripts --data C:\data --gitkeep sync
  
  # Exclude specific patterns
  sandbox-sync --scripts C:\scripts --data C:\data --exclude "*.tmp" --exclude "cache" sync
  
  # Watch mode (auto-sync when directories are created)
  sandbox-sync --scripts C:\scripts --data C:\data watch

================================================================================
IMPORTANT NOTES
================================================================================

SAFETY:
- ✓ Only creates directories, never modifies or deletes files
- ✓ Never deletes directories
- ✓ OneDrive-safe (doesn't access files, only directory structure)
- ✓ Idempotent - safe to run multiple times
- ✓ Use --dry-run to preview changes before applying

DEFAULT EXCLUSIONS:
The following are automatically excluded (no need to specify):
  .git, .Rproj.user, .Rhistory, .Renviron, .DS_Store, Thumbs.db,
  .OneDrive*, ~$*, .ipynb_checkpoints

MACOS SUPPORT:
Due to toolchain limitations in the build environment, macOS binaries are not
included. To build for macOS, you need to build natively on a Mac:
  1. Install Rust: https://rustup.rs/
  2. Clone the repository
  3. Run: cargo build --release
  4. Binary will be at: target/release/sandbox-sync

================================================================================
TROUBLESHOOTING
================================================================================

WINDOWS: "sandbox-sync is not recognized as a command"
→ Use the full path to the .exe file, or add its directory to PATH

WINDOWS: "Access denied" or permission errors
→ Run as administrator, or check antivirus settings

R: "sandbox-sync binary not found"
→ Set the full path in sandbox.config.json or SANDBOX_SYNC_PATH environment variable

EXTENSION: "Sync failed"
→ Check that sandbox.syncBinaryPath points to the correct .exe file

================================================================================
SUPPORT & DOCUMENTATION
================================================================================

For full documentation, see:
- Project repository (if available)
- IMPLEMENTATION_SUMMARY.md (in main workspace)
- CLAUDE.md (specifications)

================================================================================
