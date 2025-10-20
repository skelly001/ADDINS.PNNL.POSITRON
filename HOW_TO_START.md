# How to Start Using Claude Code in the Container

## The Simple Way (Recommended for Claude Code)

### Step 1: Open This Folder in VS Code

```
File → Open Folder → C:\Users\kell343\dev\ADDINS.PNNL.VSC.DC
```

### Step 2: Install Dev Containers Extension

- Press `Ctrl+Shift+X`
- Search for "Dev Containers"
- Install "Dev Containers" by Microsoft

### Step 3: Reopen in Container

VS Code will show a popup asking if you want to reopen in container.

**Click "Reopen in Container"**

Or manually:
- Press `Ctrl+Shift+P`
- Type: "Dev Containers: Reopen in Container"
- Press Enter

### Step 4: Wait (First Time: 5-10 minutes)

VS Code will:
- Build the Docker container
- Install all tools (Rust, Node.js, R)
- Install VS Code extensions
- Set up the environment

You'll see the progress in the bottom-right corner.

### Step 5: Verify You're in the Container

Open the terminal (`Ctrl+\``) and run:

```bash
pwd
# Should show: /workspace

rustc --version
# Should show: rustc 1.x.x

node --version
# Should show: v20.x.x
```

### Step 6: Start Using Claude Code!

Press `Ctrl+L` (or `Cmd+L` on macOS) to open Claude Code.

Then tell Claude:

```
"Please run the dev-setup script to initialize the project structure,
then help me start building the Rust binary according to CLAUDE.md"
```

Claude will:
1. Run `./scripts/dev-setup.sh` to create the project structure
2. Help you implement the components one by one
3. Build and test as you go

## What Happens Behind the Scenes

### File Locations

```
Windows (Your Computer)              Docker Container
─────────────────────────────────────────────────────────────
C:\Users\kell343\dev\                 /workspace/
  ADDINS.PNNL.VSC.DC\
    ├── sandbox-sync/        ←→       ├── sandbox-sync/
    ├── sandbox-switcher/    ←→       ├── sandbox-switcher/
    ├── examples/            ←→       ├── examples/
    └── scripts/             ←→       └── scripts/
```

**Key Point**: Both paths point to the SAME files!
- Edit in VS Code on Windows → Changes appear in container
- Claude creates files in container → They appear on Windows
- Everything saves to your Windows drive

### What You Can Do

✅ **Use Claude Code normally** - It works the same, but now has access to Rust, Node.js, R
✅ **Edit files in VS Code** - Use all your normal extensions
✅ **Let Claude run commands** - "Build the binary", "Run tests"
✅ **Files persist** - Exit container anytime, files stay on Windows
✅ **Restart easily** - Reopen in container takes seconds (after first build)

## Quick Commands Reference

### Inside Container (Terminal)

```bash
# Initialize project (first time only)
./scripts/dev-setup.sh

# Build everything
./scripts/build-all.sh

# Run all tests
./scripts/test-all.sh

# Build Rust binary
cd sandbox-sync && cargo build --release

# Build extension
cd sandbox-switcher && npm install && npm run compile

# Test sync functionality
./scripts/test-sync.sh
```

### VS Code Commands (Ctrl+Shift+P)

- **"Dev Containers: Reopen in Container"** - Enter container
- **"Dev Containers: Reopen Folder Locally"** - Exit container
- **"Dev Containers: Rebuild Container"** - Rebuild if needed

### Claude Code (Ctrl+L)

Just talk to Claude normally! Examples:

```
"Initialize the project structure"
"Implement the CLI module"
"Build and test the Rust binary"
"Help me debug this error"
"Run the test suite"
```

## Example First Session

1. **Open folder in VS Code**
2. **Click "Reopen in Container"** when prompted
3. **Wait for setup** (5-10 min first time)
4. **Open Claude Code** (`Ctrl+L`)
5. **Say**: "Let's build the sandbox-sync tool. Start by running dev-setup.sh"
6. **Claude will**:
   - Run the setup script
   - Create project structure
   - Help you implement components
   - Build and test as you go

## When You're Done

### Option 1: Just Close VS Code
- Your work is saved to Windows
- Container stops automatically
- Next time: Reopen in Container (much faster, ~30 seconds)

### Option 2: Exit Container, Keep VS Code Open
- Press `Ctrl+Shift+P`
- "Dev Containers: Reopen Folder Locally"
- Back on Windows, container stopped

## FAQs

**Q: Where are my files saved?**
A: On your Windows drive at `C:\Users\kell343\dev\ADDINS.PNNL.VSC.DC\`

**Q: What if I delete the container?**
A: Your files are safe on Windows. Just rebuild the container.

**Q: Can I edit files on Windows while in the container?**
A: Yes! Changes sync both ways automatically.

**Q: Does this work with Positron?**
A: Yes! Positron supports Dev Containers the same as VS Code.

**Q: How do I use my test paths from .env?**
A: They're automatically mounted as `/test-scripts` and `/test-data` in the container.

**Q: Can Claude Code access the container's tools?**
A: Yes! Claude can run `cargo`, `npm`, `R`, and all other tools.

**Q: What if builds are slow?**
A: First build is slow (5-10 min). After that, incremental builds are fast.

**Q: Can I develop without the container?**
A: Yes, but you'd need to install Rust, Node.js, and R on Windows manually.

## Troubleshooting

**Container won't start?**
- Make sure Docker Desktop is running
- Try: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"

**Can't find Rust/Node/R?**
- Check you're in the container: `pwd` should show `/workspace`
- If not: `Ctrl+Shift+P` → "Reopen in Container"

**Want to start fresh?**
- `Ctrl+Shift+P` → "Dev Containers: Rebuild Container Without Cache"
- Your code is safe on Windows!

## You're Ready!

That's it! Three steps:
1. Open folder in VS Code
2. Reopen in Container
3. Use Claude Code normally

Everything else is automatic. Claude has access to all the tools and can help you build the entire sandbox-sync project.

For detailed guides, see:
- [SECURITY_ISOLATION.md](SECURITY_ISOLATION.md) - **Security and file system isolation** (IMPORTANT!)
- [CLAUDE_CODE_USAGE.md](CLAUDE_CODE_USAGE.md) - Full Claude Code guide
- [.devcontainer/README.md](.devcontainer/README.md) - Dev Containers details
- [QUICKSTART.md](QUICKSTART.md) - Manual Docker usage
