# GitHub Repository Setup Guide

Your sandbox-sync project is ready to be pushed to GitHub!

## Repository Details

- **Author**: Shane Kelly
- **License**: MIT
- **Branch**: main
- **Initial commit**: ✅ Complete

## Step 1: Create GitHub Repository

1. Go to [https://github.com/new](https://github.com/new)

2. Fill in repository details:
   - **Repository name**: `sandbox-sync`
   - **Description**: `Fast, cross-platform tool for seamless Git + OneDrive workflow in Positron IDE`
   - **Visibility**: Choose Public or Private
   - **DO NOT initialize** with README, .gitignore, or license (we already have these)

3. Click "Create repository"

## Step 2: Push to GitHub

After creating the repository, GitHub will show you commands. Use these:

### If you're on your Windows machine (outside Docker):

```bash
# Navigate to your project directory
cd C:\path\to\your\workspace

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/sandbox-sync.git

# Push to GitHub
git push -u origin main
```

### If you're in the Docker container:

```bash
# Add remote (replace YOUR_USERNAME)
GIT_CONFIG_NOSYSTEM=1 HOME=/tmp git remote add origin https://github.com/YOUR_USERNAME/sandbox-sync.git

# Push (you'll need to authenticate)
GIT_CONFIG_NOSYSTEM=1 HOME=/tmp git push -u origin main
```

## Step 3: GitHub Authentication

When pushing, you'll be asked for credentials:

- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (NOT your GitHub password)

### Creating a Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "Sandbox Sync Development"
4. Select scopes: `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. Use this token as your password when pushing

## Step 4: Verify Upload

After pushing, visit your repository on GitHub:

```
https://github.com/YOUR_USERNAME/sandbox-sync
```

You should see:
- README.md displayed on the main page
- All source code files (sandbox-sync/, sandbox-switcher/, etc.)
- MIT License with Shane Kelly as copyright holder
- docs/ folder with setup guides
- examples/ folder with configuration templates

## Step 5: Create First Release (Optional)

1. Go to your repository → Releases → Create a new release

2. Fill in release details:
   - **Tag version**: `v0.1.0`
   - **Release title**: `v0.1.0 - Initial Release`
   - **Description**:
     ```markdown
     First release of Sandbox Sync for Positron!

     ## Features
     - ✅ Rust binary for directory structure synchronization
     - ✅ Positron extension for instant workspace switching
     - ✅ R integration with auto-sync
     - ✅ Windows and Linux binaries included

     ## Downloads
     - Windows: `sandbox-sync-windows-x64.exe`
     - Linux: `sandbox-sync-linux-x64`
     - Extension: `sandbox-switcher-0.1.0.vsix`

     See [Quick Start Guide](docs/QUICK_START.md) for installation instructions.
     ```

3. Attach binaries from `/workspace/dist/binaries/` and extension from `/workspace/dist/extension/`

4. Click "Publish release"

## Repository Structure on GitHub

```
sandbox-sync/
├── README.md                      # Main documentation
├── LICENSE                        # MIT License (Shane Kelly)
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md                # Contribution guidelines
├── CLAUDE.md                      # Project specification
├── sandbox-sync/                  # Rust binary source
│   ├── src/
│   ├── tests/
│   └── Cargo.toml
├── sandbox-switcher/              # Positron extension source
│   ├── src/
│   └── package.json
├── examples/                      # Configuration examples
│   ├── .Rprofile
│   └── sandbox.config.json
├── docs/                          # User documentation
│   ├── QUICK_START.md
│   └── POSITRON_SETUP_GUIDE.md
├── Dockerfile                     # Development environment
└── docker-compose.yml
```

## Next Steps

After pushing to GitHub:

1. **Add topics** to your repository:
   - Go to repository → About → Settings icon
   - Add: `rust`, `r`, `positron`, `vscode-extension`, `onedrive`, `git`, `workflow`

2. **Update README.md** with your actual GitHub username:
   - Replace `yourusername` with your actual username in links
   - Update issue tracker links
   - Update release links

3. **Enable GitHub Actions** (optional):
   - Set up CI/CD for automated testing and builds
   - See `.github/workflows/` for examples (if added later)

4. **Add badges** to README.md (optional):
   ```markdown
   ![License](https://img.shields.io/github/license/YOUR_USERNAME/sandbox-sync)
   ![Release](https://img.shields.io/github/v/release/YOUR_USERNAME/sandbox-sync)
   ```

## Troubleshooting

### "fatal: unable to access": SSL certificate problem

```bash
git config http.sslVerify false  # Temporary fix
```

### "Authentication failed"

- Make sure you're using a Personal Access Token, not your password
- Token must have `repo` scope
- Username must match your GitHub username exactly

### "remote: Repository not found"

- Double-check the repository URL
- Verify the repository exists on GitHub
- Check if it's private (you need access)

## Current Status

✅ Git repository initialized
✅ Initial commit created
✅ Branch renamed to `main`
✅ All source code staged and committed
✅ MIT License with Shane Kelly
✅ Comprehensive README
✅ Documentation complete

**Ready to push!** Just create the GitHub repository and run the commands above.

---

**Questions?** See [GitHub Docs](https://docs.github.com/en/get-started/importing-your-projects-to-github/importing-source-code-to-github/adding-locally-hosted-code-to-github)
