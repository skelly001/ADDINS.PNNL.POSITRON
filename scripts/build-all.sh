#!/bin/bash
# Build script for all sandbox-sync components
# Builds Rust binary, VS Code extension, and prepares R integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sandbox-Sync Build Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# ============================================================================
# Configuration
# ============================================================================
BUILD_MODE="${BUILD_MODE:-release}"  # debug or release
WORKSPACE_ROOT="${WORKSPACE_ROOT:-/workspace}"

# ============================================================================
# Build Rust Binary
# ============================================================================
if [ -d "$WORKSPACE_ROOT/sandbox-sync" ]; then
    echo -e "${YELLOW}=== Building Rust Binary ===${NC}\n"

    cd "$WORKSPACE_ROOT/sandbox-sync"

    # Clean previous builds (optional)
    if [ "$CLEAN_BUILD" = "true" ]; then
        echo -e "${BLUE}Cleaning previous build artifacts...${NC}"
        cargo clean
    fi

    # Build binary
    if [ "$BUILD_MODE" = "debug" ]; then
        echo -e "${BLUE}Building debug binary...${NC}"
        cargo build
        BINARY_PATH="$WORKSPACE_ROOT/sandbox-sync/target/debug/sandbox-sync"
    else
        echo -e "${BLUE}Building release binary...${NC}"
        cargo build --release
        BINARY_PATH="$WORKSPACE_ROOT/sandbox-sync/target/release/sandbox-sync"
    fi

    if [ -f "$BINARY_PATH" ]; then
        echo -e "${GREEN}✓ Binary built successfully: $BINARY_PATH${NC}"
        echo -e "${BLUE}Binary size: $(du -h "$BINARY_PATH" | cut -f1)${NC}"

        # Test binary
        if "$BINARY_PATH" --version &>/dev/null; then
            echo -e "${GREEN}✓ Binary is executable and working${NC}"
        else
            echo -e "${YELLOW}⚠ Warning: Binary may not be functioning correctly${NC}"
        fi

        # NOTE: cargo outputs the binary to target/release/sandbox-sync, but
        # the repo tracks platform-specific binaries under:
        #   target/release/linux/sandbox-sync
        #   target/release/mac/sandbox-sync
        # After building, copy the binary into the correct platform folder
        # before committing. For example, on Linux:
        #   cp target/release/sandbox-sync target/release/linux/sandbox-sync
        if [ "$BUILD_MODE" != "debug" ]; then
            echo -e "${YELLOW}NOTE: Remember to copy the binary to the platform folder before committing:${NC}"
            echo -e "${YELLOW}  target/release/linux/sandbox-sync  (Linux)${NC}"
            echo -e "${YELLOW}  target/release/mac/sandbox-sync    (macOS)${NC}"
        fi
    else
        echo -e "${RED}✗ Binary build failed${NC}"
        exit 1
    fi

    echo ""
else
    echo -e "${YELLOW}Skipping Rust build: $WORKSPACE_ROOT/sandbox-sync not found${NC}\n"
fi

# ============================================================================
# Build VS Code Extension
# ============================================================================
if [ -d "$WORKSPACE_ROOT/sandbox-switcher" ]; then
    echo -e "${YELLOW}=== Building VS Code Extension ===${NC}\n"

    cd "$WORKSPACE_ROOT/sandbox-switcher"

    # Install dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install

    # Compile TypeScript
    echo -e "${BLUE}Compiling TypeScript...${NC}"
    npm run compile

    echo -e "${GREEN}✓ Extension compiled successfully${NC}"

    # Package extension
    if command -v vsce &>/dev/null; then
        echo -e "${BLUE}Packaging extension as .vsix...${NC}"
        vsce package --out sandbox-switcher.vsix

        if [ -f "sandbox-switcher.vsix" ]; then
            echo -e "${GREEN}✓ Extension packaged: sandbox-switcher.vsix${NC}"
            echo -e "${BLUE}Package size: $(du -h sandbox-switcher.vsix | cut -f1)${NC}"
        else
            echo -e "${YELLOW}⚠ Warning: Extension packaging may have failed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ vsce not found, skipping packaging${NC}"
        echo -e "${BLUE}Install with: npm install -g @vscode/vsce${NC}"
    fi

    echo ""
else
    echo -e "${YELLOW}Skipping extension build: $WORKSPACE_ROOT/sandbox-switcher not found${NC}\n"
fi

# ============================================================================
# Cross-Compilation Builds (Optional)
# ============================================================================
if [ "$CROSS_COMPILE" = "true" ] && [ -d "$WORKSPACE_ROOT/sandbox-sync" ]; then
    echo -e "${YELLOW}=== Cross-Compiling Binaries ===${NC}\n"

    cd "$WORKSPACE_ROOT/sandbox-sync"

    # Linux musl (static binary)
    echo -e "${BLUE}Building for Linux (x86_64-unknown-linux-musl)...${NC}"
    cargo build --release --target x86_64-unknown-linux-musl
    if [ -f "target/x86_64-unknown-linux-musl/release/sandbox-sync" ]; then
        echo -e "${GREEN}✓ Linux binary built${NC}"
        echo -e "${BLUE}Size: $(du -h target/x86_64-unknown-linux-musl/release/sandbox-sync | cut -f1)${NC}"
    fi

    # Windows
    echo -e "\n${BLUE}Building for Windows (x86_64-pc-windows-gnu)...${NC}"
    cargo build --release --target x86_64-pc-windows-gnu
    if [ -f "target/x86_64-pc-windows-gnu/release/sandbox-sync.exe" ]; then
        echo -e "${GREEN}✓ Windows binary built${NC}"
        echo -e "${BLUE}Size: $(du -h target/x86_64-pc-windows-gnu/release/sandbox-sync.exe | cut -f1)${NC}"
    fi

    # macOS Intel
    echo -e "\n${BLUE}Building for macOS Intel (x86_64-apple-darwin)...${NC}"
    if cargo build --release --target x86_64-apple-darwin 2>/dev/null; then
        if [ -f "target/x86_64-apple-darwin/release/sandbox-sync" ]; then
            echo -e "${GREEN}✓ macOS Intel binary built${NC}"
            echo -e "${BLUE}Size: $(du -h target/x86_64-apple-darwin/release/sandbox-sync | cut -f1)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ macOS Intel build skipped (requires macOS host or SDK)${NC}"
    fi

    # macOS Apple Silicon
    echo -e "\n${BLUE}Building for macOS Apple Silicon (aarch64-apple-darwin)...${NC}"
    if cargo build --release --target aarch64-apple-darwin 2>/dev/null; then
        if [ -f "target/aarch64-apple-darwin/release/sandbox-sync" ]; then
            echo -e "${GREEN}✓ macOS ARM binary built${NC}"
            echo -e "${BLUE}Size: $(du -h target/aarch64-apple-darwin/release/sandbox-sync | cut -f1)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ macOS ARM build skipped (requires macOS host or SDK)${NC}"
    fi

    echo ""
fi

# ============================================================================
# Create Distribution
# ============================================================================
if [ "$CREATE_DIST" = "true" ]; then
    echo -e "${YELLOW}=== Creating Distribution ===${NC}\n"

    DIST_DIR="$WORKSPACE_ROOT/dist"
    rm -rf "$DIST_DIR"
    mkdir -p "$DIST_DIR"

    # Copy binaries
    if [ -f "$WORKSPACE_ROOT/sandbox-sync/target/release/sandbox-sync" ]; then
        cp "$WORKSPACE_ROOT/sandbox-sync/target/release/sandbox-sync" "$DIST_DIR/"
        echo -e "${GREEN}✓ Copied release binary to dist/${NC}"
    fi

    # Copy cross-compiled binaries if they exist
    if [ "$CROSS_COMPILE" = "true" ]; then
        mkdir -p "$DIST_DIR/bin"

        [ -f "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-unknown-linux-musl/release/sandbox-sync" ] && \
            cp "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-unknown-linux-musl/release/sandbox-sync" \
               "$DIST_DIR/bin/sandbox-sync-linux-x64"

        [ -f "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-pc-windows-gnu/release/sandbox-sync.exe" ] && \
            cp "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-pc-windows-gnu/release/sandbox-sync.exe" \
               "$DIST_DIR/bin/sandbox-sync-windows-x64.exe"

        [ -f "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-apple-darwin/release/sandbox-sync" ] && \
            cp "$WORKSPACE_ROOT/sandbox-sync/target/x86_64-apple-darwin/release/sandbox-sync" \
               "$DIST_DIR/bin/sandbox-sync-macos-x64"

        [ -f "$WORKSPACE_ROOT/sandbox-sync/target/aarch64-apple-darwin/release/sandbox-sync" ] && \
            cp "$WORKSPACE_ROOT/sandbox-sync/target/aarch64-apple-darwin/release/sandbox-sync" \
               "$DIST_DIR/bin/sandbox-sync-macos-arm64"

        echo -e "${GREEN}✓ Copied cross-compiled binaries to dist/bin/${NC}"
    fi

    # Copy extension
    if [ -f "$WORKSPACE_ROOT/sandbox-switcher/sandbox-switcher.vsix" ]; then
        cp "$WORKSPACE_ROOT/sandbox-switcher/sandbox-switcher.vsix" "$DIST_DIR/"
        echo -e "${GREEN}✓ Copied extension to dist/${NC}"
    fi

    # Copy examples
    if [ -d "$WORKSPACE_ROOT/examples" ]; then
        cp -r "$WORKSPACE_ROOT/examples" "$DIST_DIR/"
        echo -e "${GREEN}✓ Copied examples to dist/${NC}"
    fi

    # Copy documentation
    [ -f "$WORKSPACE_ROOT/CLAUDE.md" ] && cp "$WORKSPACE_ROOT/CLAUDE.md" "$DIST_DIR/"
    [ -f "$WORKSPACE_ROOT/README.md" ] && cp "$WORKSPACE_ROOT/README.md" "$DIST_DIR/"

    echo -e "\n${GREEN}Distribution created in: $DIST_DIR${NC}"
    echo -e "${BLUE}Contents:${NC}"
    ls -lh "$DIST_DIR"

    echo ""
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Build mode: $BUILD_MODE${NC}"

if [ -f "$BINARY_PATH" ]; then
    echo -e "${GREEN}✓ Rust binary: $BINARY_PATH${NC}"
fi

if [ -f "$WORKSPACE_ROOT/sandbox-switcher/sandbox-switcher.vsix" ]; then
    echo -e "${GREEN}✓ VS Code extension: sandbox-switcher.vsix${NC}"
fi

if [ "$CROSS_COMPILE" = "true" ]; then
    echo -e "${GREEN}✓ Cross-compilation: enabled${NC}"
fi

echo -e "\n${GREEN}Build completed successfully!${NC}\n"

# ============================================================================
# Usage Instructions
# ============================================================================
echo -e "${BLUE}Usage:${NC}"
echo "  Default build:           ./scripts/build-all.sh"
echo "  Debug build:             BUILD_MODE=debug ./scripts/build-all.sh"
echo "  With cross-compilation:  CROSS_COMPILE=true ./scripts/build-all.sh"
echo "  Create distribution:     CREATE_DIST=true ./scripts/build-all.sh"
echo "  Clean build:             CLEAN_BUILD=true ./scripts/build-all.sh"
echo ""
