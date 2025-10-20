#!/bin/bash

# Quick script to push to GitHub
# Usage: ./PUSH_TO_GITHUB.sh <your-github-username>

if [ -z "$1" ]; then
    echo "Usage: $0 <github-username>"
    echo "Example: $0 shanekelly"
    exit 1
fi

USERNAME=$1
REPO="sandbox-sync"

echo "Setting up remote for GitHub..."
git remote add origin "https://github.com/$USERNAME/$REPO.git" 2>/dev/null || git remote set-url origin "https://github.com/$USERNAME/$REPO.git"

echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Visit your repository at:"
echo "   https://github.com/$USERNAME/$REPO"
echo ""
echo "Next steps:"
echo "1. Go to your repository on GitHub"
echo "2. Add topics: rust, r, positron, vscode-extension, onedrive"
echo "3. Create a release (v0.1.0) and attach binaries from dist/"
echo "4. Share with your team!"
