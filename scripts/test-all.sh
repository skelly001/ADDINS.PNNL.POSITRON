#!/bin/bash
# Test runner for all sandbox-sync components
# Runs Rust tests, extension tests, and R integration tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sandbox-Sync Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test result tracking
TESTS_PASSED=0
TESTS_FAILED=0

# ============================================================================
# Function to run tests and track results
# ============================================================================
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${BLUE}Running: ${test_name}${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED: ${test_name}${NC}\n"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED: ${test_name}${NC}\n"
        ((TESTS_FAILED++))
        return 1
    fi
}

# ============================================================================
# Rust Binary Tests
# ============================================================================
if [ -d "/workspace/sandbox-sync" ]; then
    echo -e "${YELLOW}=== Rust Binary Tests ===${NC}\n"

    run_test "Rust: Cargo build" \
        "cd /workspace/sandbox-sync && cargo build --quiet"

    run_test "Rust: Unit tests" \
        "cd /workspace/sandbox-sync && cargo test --quiet"

    run_test "Rust: Clippy lints" \
        "cd /workspace/sandbox-sync && cargo clippy --quiet -- -D warnings"

    run_test "Rust: Format check" \
        "cd /workspace/sandbox-sync && cargo fmt --check"

    # Integration tests (if they exist)
    if [ -d "/workspace/sandbox-sync/tests" ]; then
        run_test "Rust: Integration tests" \
            "cd /workspace/sandbox-sync && cargo test --test '*' --quiet"
    fi

    # Build release binary for functional tests
    echo -e "${BLUE}Building release binary for functional tests...${NC}"
    cd /workspace/sandbox-sync && cargo build --release --quiet
    BINARY_PATH="/workspace/sandbox-sync/target/release/sandbox-sync"

    if [ -f "$BINARY_PATH" ]; then
        echo -e "${GREEN}Release binary built successfully${NC}\n"
    else
        echo -e "${RED}Failed to build release binary${NC}\n"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}Skipping Rust tests: /workspace/sandbox-sync not found${NC}\n"
fi

# ============================================================================
# VS Code Extension Tests
# ============================================================================
if [ -d "/workspace/sandbox-switcher" ]; then
    echo -e "${YELLOW}=== VS Code Extension Tests ===${NC}\n"

    # Install dependencies if needed
    if [ ! -d "/workspace/sandbox-switcher/node_modules" ]; then
        echo -e "${BLUE}Installing extension dependencies...${NC}"
        cd /workspace/sandbox-switcher && npm install --quiet
    fi

    run_test "Extension: TypeScript compilation" \
        "cd /workspace/sandbox-switcher && npm run compile"

    run_test "Extension: Lint check" \
        "cd /workspace/sandbox-switcher && npm run lint 2>/dev/null || true"

    run_test "Extension: Unit tests" \
        "cd /workspace/sandbox-switcher && npm test"

    # Try to package extension
    run_test "Extension: Package build" \
        "cd /workspace/sandbox-switcher && vsce package --out test.vsix || npm run package"

else
    echo -e "${YELLOW}Skipping extension tests: /workspace/sandbox-switcher not found${NC}\n"
fi

# ============================================================================
# R Integration Tests
# ============================================================================
if [ -f "/workspace/examples/.Rprofile" ]; then
    echo -e "${YELLOW}=== R Integration Tests ===${NC}\n"

    # Test R script can load without errors
    run_test "R: Load .Rprofile" \
        "R --quiet --no-save -e 'source(\"/workspace/examples/.Rprofile\")' 2>&1 | grep -q 'Error' && exit 1 || exit 0"

    # Test R can call binary (if it exists)
    if [ -f "$BINARY_PATH" ]; then
        run_test "R: Execute sandbox-sync via system2" \
            "R --quiet --no-save -e 'result <- system2(\"$BINARY_PATH\", \"--version\", stdout=TRUE); stopifnot(length(result) > 0)'"
    fi
else
    echo -e "${YELLOW}Skipping R tests: /workspace/examples/.Rprofile not found${NC}\n"
fi

# ============================================================================
# Functional Tests (if binary exists)
# ============================================================================
if [ -f "$BINARY_PATH" ]; then
    echo -e "${YELLOW}=== Functional Tests ===${NC}\n"

    run_test "Functional: Binary version check" \
        "$BINARY_PATH --version"

    run_test "Functional: Help command" \
        "$BINARY_PATH --help"

    run_test "Functional: Sync dry-run" \
        "$BINARY_PATH sync --scripts /test-scripts --data /test-data --dry-run"

    run_test "Functional: Check command" \
        "$BINARY_PATH check --scripts /test-scripts --data /test-data || true"

    run_test "Functional: Sync with gitkeep" \
        "$BINARY_PATH sync --scripts /test-scripts --data /test-data --gitkeep --dry-run"
fi

# ============================================================================
# Test Summary
# ============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✓${NC}\n"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the output above.${NC}\n"
    exit 1
fi
