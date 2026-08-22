#!/bin/bash

# Enhanced release wrapper with better error handling and debugging
# Usage: ./enhanced-release-wrapper.sh [library-path] [package-name] [release-it-args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_SCRIPT="$SCRIPT_DIR/check-version-bump.sh"

# Default values
LIBRARY_PATH="${1:-.}"
PACKAGE_NAME="${2}"
shift 2 2>/dev/null || true
RELEASE_IT_ARGS="$@"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[RELEASE]${NC} $1" >&2
}

error() {
    echo -e "${RED}[RELEASE ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[RELEASE SUCCESS]${NC} $1" >&2
}

debug() {
    echo -e "${YELLOW}[DEBUG]${NC} $1" >&2
}

# Check if version bump script exists
if [ ! -f "$VERSION_SCRIPT" ]; then
    error "Version bump script not found at: $VERSION_SCRIPT"
    exit 1
fi

# Get the bump type
log "Checking if release is needed..."
BUMP_TYPE=$("$VERSION_SCRIPT" "$LIBRARY_PATH" "$PACKAGE_NAME" 2>/dev/null)
NEEDS_RELEASE=$?

if [ $NEEDS_RELEASE -ne 0 ]; then
    log "No release needed - skipping release-it"
    exit 0
fi

log "Release needed with bump type: $BUMP_TYPE"

# Change to library directory
cd "$LIBRARY_PATH"

# Debug information
debug "Current directory: $(pwd)"
debug "Package name: $PACKAGE_NAME"
debug "Git remote: $(git remote get-url origin 2>/dev/null || echo 'No remote found')"
debug "Git user: $(git config user.name) <$(git config user.email)>"
debug "Current branch: $(git branch --show-current 2>/dev/null || echo 'No branch')"

# Verify package name is not empty/undefined
if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "undefined" ]; then
    error "Package name is empty or undefined"
    if [ -f "package.json" ]; then
        DETECTED_NAME=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4)
        log "Attempting to use detected name: $DETECTED_NAME"
        PACKAGE_NAME="$DETECTED_NAME"
    fi

    if [ -z "$PACKAGE_NAME" ] || [ "$PACKAGE_NAME" = "undefined" ]; then
        error "Could not determine package name"
        exit 1
    fi
fi

# Show existing tags for this package
log "Existing tags for $PACKAGE_NAME:"
git tag -l "${PACKAGE_NAME}@*" | tail -3 || echo "No existing tags found"

# Run release-it with the determined version
case "$BUMP_TYPE" in
    "major"|"minor"|"patch")
        log "Running release-it with $BUMP_TYPE version bump..."

        # Run release-it and capture output
        log "Command: release-it $BUMP_TYPE $RELEASE_IT_ARGS"

        if release-it "$BUMP_TYPE" $RELEASE_IT_ARGS; then
            success "Release-it completed successfully"

            # Verify the tag was created and pushed
            NEW_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' package.json | cut -d'"' -f4)
            EXPECTED_TAG="${PACKAGE_NAME}@${NEW_VERSION}"

            log "Verifying tag creation..."
            if git tag -l | grep -q "^${EXPECTED_TAG}$"; then
                success "Tag created locally: $EXPECTED_TAG"

                # Verify tag was pushed
                if git ls-remote --tags origin | grep -q "refs/tags/${EXPECTED_TAG}"; then
                    success "Tag pushed to remote: $EXPECTED_TAG"
                else
                    error "Tag was created locally but not found on remote"
                    log "Attempting to push tags manually..."
                    git push origin --tags
                fi
            else
                error "Expected tag not found: $EXPECTED_TAG"
                log "Available tags:"
                git tag -l | tail -5
            fi
        else
            error "Release-it failed"
            exit 1
        fi
        ;;
    *)
        error "Unknown bump type: $BUMP_TYPE"
        exit 1
        ;;
esac
