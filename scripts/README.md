# Version Bump and Release Scripts

This directory contains shell scripts that provide intelligent version bumping and release management based on conventional commits.

## Overview

The `skipOnEmpty` functionality in `@release-it/conventional-changelog` was not working reliably with extended configurations. These scripts provide a robust alternative that:

1. Analyzes conventional commits to determine if a release is needed
2. Determines the appropriate version bump (major/minor/patch)
3. Integrates with release-it to perform the actual release
4. Provides CI/CD integration for automated pipelines

## Scripts

### `check-version-bump.sh`

Core script that analyzes git commits and determines version bump requirements.

**Usage:**
```bash
./check-version-bump.sh [library-path] [package-name]
```

**Examples:**
```bash
# Check current directory
./check-version-bump.sh

# Check specific library
./check-version-bump.sh ./libs/my-lib

# Check with specific package name
./check-version-bump.sh ./libs/my-lib @scope/package-name

# Enable verbose output
VERBOSE=1 ./check-version-bump.sh ./libs/my-lib
```

**Exit Codes:**
- `0`: Release needed (outputs: major|minor|patch)
- `1`: No release needed (outputs: none)

**Conventional Commit Analysis:**
- `feat:` → minor version bump
- `fix:` → patch version bump
- `feat!:`, `fix!:`, or `BREAKING CHANGE:` → major version bump
- `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `chore:` → no release
- Non-conventional commits → patch version bump (for safety)

### `release-wrapper.sh`

Wrapper around release-it that uses version bump detection.

**Usage:**
```bash
./release-wrapper.sh [library-path] [package-name] [release-it-args...]
```

**Examples:**
```bash
# Standard release
./release-wrapper.sh ./libs/my-lib @scope/package-name

# Dry run
./release-wrapper.sh ./libs/my-lib @scope/package-name --dry-run

# Skip CI checks
./release-wrapper.sh ./libs/my-lib @scope/package-name --ci=false
```

### `ci-release-check.sh`

CI/CD pipeline helper that sets environment variables and provides GitHub Actions outputs.

**Usage:**
```bash
./ci-release-check.sh [library-path] [package-name]
```

**GitHub Actions Integration:**
```yaml
- name: Check if release is needed
  id: release-check
  run: ./scripts/ci-release-check.sh ./libs/my-lib @scope/package-name

- name: Release
  if: steps.release-check.outputs.needs_release == 'true'
  run: ./scripts/release-wrapper.sh ./libs/my-lib @scope/package-name
```

**Environment Variables Set:**
- `NEEDS_RELEASE`: "true" or "false"
- `BUMP_TYPE`: "major", "minor", "patch", or "none"
- `VERSION_OUTPUT`: Full output from version check

## Integration with release-it

The scripts work with simplified release-it configurations that don't rely on the conventional changelog plugin:

```json
{
  "$schema": "https://unpkg.com/release-it@19/schema/release-it.json",
  "git": {
    "tagName": "${npm.name}@${version}",
    "commitMessage": "chore(${npm.name}): release v${version}",
    "requireCleanWorkingDir": false,
    "commitsPath": ".",
    "push": true,
    "requireCommits": false
  },
  "npm": {
    "publish": true,
    "skipChecks": true
  },
  "github": {
    "release": true,
    "releaseName": "${npm.name} v${version}"
  }
}
```

## Workflow

1. **Analysis**: `check-version-bump.sh` analyzes commits since the last tag
2. **Decision**: Script determines if release is needed and what type
3. **Execution**: `release-wrapper.sh` calls release-it with the appropriate version bump
4. **CI Integration**: `ci-release-check.sh` provides pipeline integration

## Benefits

- **Reliable**: No dependency on plugin configurations that may not work with inheritance
- **Fast**: Shell scripts can run before Node.js setup in CI/CD
- **Flexible**: Easy to customize conventional commit rules
- **Transparent**: Verbose mode shows exactly what commits are being analyzed
- **CI-Friendly**: Proper exit codes and environment variable setting

## Examples

### Local Development
```bash
# Check what would be released
./scripts/check-version-bump.sh ./libs/my-lib @scope/package-name

# Perform a dry-run release
./scripts/release-wrapper.sh ./libs/my-lib @scope/package-name --dry-run

# Perform actual release
./scripts/release-wrapper.sh ./libs/my-lib @scope/package-name
```

### CI/CD Pipeline
```bash
# In your CI script
if ./scripts/ci-release-check.sh ./libs/my-lib @scope/package-name; then
  echo "Release needed, proceeding..."
  ./scripts/release-wrapper.sh ./libs/my-lib @scope/package-name
else
  echo "No release needed, skipping..."
fi
```

## Troubleshooting

### No Package Name Auto-Detection
If the script can't detect the package name from `package.json`, provide it explicitly:
```bash
./scripts/check-version-bump.sh ./libs/my-lib "@scope/package-name"
```

### Verbose Debugging
Use `VERBOSE=1` to see detailed commit analysis:
```bash
VERBOSE=1 ./scripts/check-version-bump.sh ./libs/my-lib
```

### Git Tag Issues
Ensure your git tags follow the expected pattern:
- With package name: `@scope/package-name@1.0.0`
- Without package name: `1.0.0` or `v1.0.0`
