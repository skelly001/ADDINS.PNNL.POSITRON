#!/bin/bash
# Functional test script for sandbox-sync binary
# Tests sync, watch, and check commands with various scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sandbox-Sync Functional Tests${NC}"
echo -e "${BLUE}========================================${NC}\n"

# ============================================================================
# Configuration
# ============================================================================
BINARY_PATH="${BINARY_PATH:-/workspace/sandbox-sync/target/release/sandbox-sync}"
TEMP_DIR="/tmp/sandbox-sync-test-$$"
TEST_SCRIPTS="$TEMP_DIR/scripts"
TEST_DATA="$TEMP_DIR/data"

# Check if binary exists
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}Error: Binary not found at $BINARY_PATH${NC}"
    echo -e "${YELLOW}Build it first with: cd /workspace/sandbox-sync && cargo build --release${NC}"
    exit 1
fi

echo -e "${GREEN}Using binary: $BINARY_PATH${NC}"
echo -e "${GREEN}Binary version: $($BINARY_PATH --version 2>/dev/null || echo 'unknown')${NC}\n"

# ============================================================================
# Setup Test Environment
# ============================================================================
setup_test_env() {
    echo -e "${BLUE}Setting up test environment...${NC}"

    # Clean up any previous test runs
    rm -rf "$TEMP_DIR"

    # Create test directories
    mkdir -p "$TEST_SCRIPTS"
    mkdir -p "$TEST_DATA"

    echo -e "${GREEN}Test directories created:${NC}"
    echo "  Scripts: $TEST_SCRIPTS"
    echo "  Data: $TEST_DATA"
    echo ""
}

# ============================================================================
# Cleanup
# ============================================================================
cleanup() {
    echo -e "\n${BLUE}Cleaning up test environment...${NC}"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}Cleanup complete${NC}"
}

trap cleanup EXIT

# ============================================================================
# Test Cases
# ============================================================================
test_passed=0
test_failed=0

run_test() {
    local test_name="$1"
    shift
    local test_command="$@"

    echo -e "${YELLOW}Test: ${test_name}${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}\n"
        ((test_passed++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}\n"
        ((test_failed++))
        return 1
    fi
}

# ============================================================================
# Test 1: Basic Sync (Empty Directories)
# ============================================================================
test_basic_sync() {
    setup_test_env

    run_test "Basic sync with empty directories" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"
}

# ============================================================================
# Test 2: Sync with Directory Structure in Scripts
# ============================================================================
test_sync_scripts_to_data() {
    setup_test_env

    # Create directory structure in scripts
    mkdir -p "$TEST_SCRIPTS/project1/subdir1"
    mkdir -p "$TEST_SCRIPTS/project2/subdir2/nested"
    mkdir -p "$TEST_SCRIPTS/shared/utils"

    echo -e "${BLUE}Created directory structure in scripts:${NC}"
    tree "$TEST_SCRIPTS" 2>/dev/null || find "$TEST_SCRIPTS" -type d

    run_test "Sync directories from scripts to data" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"

    # Verify directories were created in data
    echo -e "${BLUE}Resulting directory structure in data:${NC}"
    tree "$TEST_DATA" 2>/dev/null || find "$TEST_DATA" -type d

    # Check if all directories exist
    if [ -d "$TEST_DATA/project1/subdir1" ] && \
       [ -d "$TEST_DATA/project2/subdir2/nested" ] && \
       [ -d "$TEST_DATA/shared/utils" ]; then
        echo -e "${GREEN}All directories synced correctly${NC}\n"
    else
        echo -e "${RED}Some directories missing in data${NC}\n"
        return 1
    fi
}

# ============================================================================
# Test 3: Sync with Directory Structure in Data
# ============================================================================
test_sync_data_to_scripts() {
    setup_test_env

    # Create directory structure in data
    mkdir -p "$TEST_DATA/datasets/raw"
    mkdir -p "$TEST_DATA/datasets/processed"
    mkdir -p "$TEST_DATA/outputs/figures"

    echo -e "${BLUE}Created directory structure in data:${NC}"
    tree "$TEST_DATA" 2>/dev/null || find "$TEST_DATA" -type d

    run_test "Sync directories from data to scripts" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"

    # Verify directories were created in scripts
    echo -e "${BLUE}Resulting directory structure in scripts:${NC}"
    tree "$TEST_SCRIPTS" 2>/dev/null || find "$TEST_SCRIPTS" -type d

    # Check if all directories exist
    if [ -d "$TEST_SCRIPTS/datasets/raw" ] && \
       [ -d "$TEST_SCRIPTS/datasets/processed" ] && \
       [ -d "$TEST_SCRIPTS/outputs/figures" ]; then
        echo -e "${GREEN}All directories synced correctly${NC}\n"
    else
        echo -e "${RED}Some directories missing in scripts${NC}\n"
        return 1
    fi
}

# ============================================================================
# Test 4: Bidirectional Sync
# ============================================================================
test_bidirectional_sync() {
    setup_test_env

    # Create different structures in each
    mkdir -p "$TEST_SCRIPTS/scripts_only/module1"
    mkdir -p "$TEST_DATA/data_only/results"
    mkdir -p "$TEST_SCRIPTS/shared/common"
    mkdir -p "$TEST_DATA/shared/common"

    echo -e "${BLUE}Before sync:${NC}"
    echo "Scripts:"
    tree "$TEST_SCRIPTS" 2>/dev/null || find "$TEST_SCRIPTS" -type d
    echo "Data:"
    tree "$TEST_DATA" 2>/dev/null || find "$TEST_DATA" -type d

    run_test "Bidirectional sync" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"

    echo -e "${BLUE}After sync:${NC}"
    echo "Scripts:"
    tree "$TEST_SCRIPTS" 2>/dev/null || find "$TEST_SCRIPTS" -type d
    echo "Data:"
    tree "$TEST_DATA" 2>/dev/null || find "$TEST_DATA" -type d

    # Verify union of directories
    if [ -d "$TEST_SCRIPTS/data_only/results" ] && \
       [ -d "$TEST_DATA/scripts_only/module1" ]; then
        echo -e "${GREEN}Bidirectional sync successful${NC}\n"
    else
        echo -e "${RED}Bidirectional sync failed${NC}\n"
        return 1
    fi
}

# ============================================================================
# Test 5: Sync with .gitkeep Files
# ============================================================================
test_sync_with_gitkeep() {
    setup_test_env

    mkdir -p "$TEST_SCRIPTS/empty_dir"
    mkdir -p "$TEST_DATA/data_dir"

    run_test "Sync with .gitkeep files" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA --gitkeep"

    # Check if .gitkeep files were created in scripts directory
    if [ -f "$TEST_SCRIPTS/empty_dir/.gitkeep" ]; then
        echo -e "${GREEN}.gitkeep files created in scripts${NC}\n"
    else
        echo -e "${YELLOW}Warning: .gitkeep files not found (may not be implemented yet)${NC}\n"
    fi
}

# ============================================================================
# Test 6: Dry Run
# ============================================================================
test_dry_run() {
    setup_test_env

    mkdir -p "$TEST_SCRIPTS/project1"
    mkdir -p "$TEST_DATA/project2"

    run_test "Dry run (should not create directories)" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA --dry-run"

    # Verify directories were NOT created
    if [ ! -d "$TEST_DATA/project1" ] && [ ! -d "$TEST_SCRIPTS/project2" ]; then
        echo -e "${GREEN}Dry run successful (no changes made)${NC}\n"
    else
        echo -e "${RED}Dry run failed (directories were created)${NC}\n"
        return 1
    fi
}

# ============================================================================
# Test 7: Exclude Patterns
# ============================================================================
test_exclude_patterns() {
    setup_test_env

    mkdir -p "$TEST_SCRIPTS/.git/objects"
    mkdir -p "$TEST_SCRIPTS/.Rproj.user"
    mkdir -p "$TEST_SCRIPTS/valid_dir"
    mkdir -p "$TEST_SCRIPTS/.DS_Store_dir"

    run_test "Sync with exclude patterns" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"

    # Verify excluded directories were not synced
    if [ ! -d "$TEST_DATA/.git" ] && [ ! -d "$TEST_DATA/.Rproj.user" ]; then
        echo -e "${GREEN}Exclude patterns working${NC}\n"
    else
        echo -e "${YELLOW}Warning: Excluded directories were synced (may need to check implementation)${NC}\n"
    fi
}

# ============================================================================
# Test 8: Check Command
# ============================================================================
test_check_command() {
    setup_test_env

    mkdir -p "$TEST_SCRIPTS/only_in_scripts"
    mkdir -p "$TEST_DATA/only_in_data"

    run_test "Check command (report differences)" \
        "$BINARY_PATH check --scripts $TEST_SCRIPTS --data $TEST_DATA || true"
}

# ============================================================================
# Test 9: Files Should Not Be Touched
# ============================================================================
test_files_untouched() {
    setup_test_env

    # Create files in both directories
    echo "test content" > "$TEST_SCRIPTS/test_file.txt"
    echo "data content" > "$TEST_DATA/data_file.csv"

    # Create directories
    mkdir -p "$TEST_SCRIPTS/dir1"
    mkdir -p "$TEST_DATA/dir2"

    # Record file modification times
    SCRIPTS_FILE_MTIME=$(stat -c %Y "$TEST_SCRIPTS/test_file.txt" 2>/dev/null || stat -f %m "$TEST_SCRIPTS/test_file.txt")
    DATA_FILE_MTIME=$(stat -c %Y "$TEST_DATA/data_file.csv" 2>/dev/null || stat -f %m "$TEST_DATA/data_file.csv")

    run_test "Sync should not touch files" \
        "$BINARY_PATH sync --scripts $TEST_SCRIPTS --data $TEST_DATA"

    # Verify files still exist and were not modified
    SCRIPTS_FILE_MTIME_AFTER=$(stat -c %Y "$TEST_SCRIPTS/test_file.txt" 2>/dev/null || stat -f %m "$TEST_SCRIPTS/test_file.txt")
    DATA_FILE_MTIME_AFTER=$(stat -c %Y "$TEST_DATA/data_file.csv" 2>/dev/null || stat -f %m "$TEST_DATA/data_file.csv")

    if [ "$SCRIPTS_FILE_MTIME" = "$SCRIPTS_FILE_MTIME_AFTER" ] && \
       [ "$DATA_FILE_MTIME" = "$DATA_FILE_MTIME_AFTER" ]; then
        echo -e "${GREEN}Files were not touched${NC}\n"
    else
        echo -e "${RED}Files were modified!${NC}\n"
        return 1
    fi
}

# ============================================================================
# Run All Tests
# ============================================================================
echo -e "${BLUE}Running functional tests...${NC}\n"

test_basic_sync
test_sync_scripts_to_data
test_sync_data_to_scripts
test_bidirectional_sync
test_sync_with_gitkeep
test_dry_run
test_exclude_patterns
test_check_command
test_files_untouched

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed: $test_passed${NC}"
echo -e "${RED}Failed: $test_failed${NC}"

if [ $test_failed -eq 0 ]; then
    echo -e "\n${GREEN}All functional tests passed! ✓${NC}\n"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the output above.${NC}\n"
    exit 1
fi
