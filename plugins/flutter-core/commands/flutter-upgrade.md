---
name: flutter-upgrade
description: Upgrade Flutter SDK and project dependencies with automated migration guides and breaking change detection
argument-hint: "[sdk|deps|all] [--check-only] [--migrate]"
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# Flutter Upgrade Manager

This command manages Flutter SDK and dependency upgrades, detects breaking changes, applies migrations, and ensures smooth version transitions.

## Usage

```bash
/flutter-upgrade [target] [options]
```

## Targets

- `sdk` - Upgrade Flutter SDK only
- `deps` - Upgrade project dependencies only
- `all` - Upgrade both SDK and dependencies (default)

## Options

- `--check-only` - Check for available upgrades without applying
- `--migrate` - Run migration tools after upgrade
- `--major` - Allow major version upgrades (default: minor only)
- `--force` - Skip confirmation prompts

## Examples

```bash
# Check what's available
/flutter-upgrade --check-only

# Upgrade SDK only
/flutter-upgrade sdk

# Upgrade dependencies with migration
/flutter-upgrade deps --migrate

# Complete upgrade with major versions
/flutter-upgrade all --major --migrate

# Force upgrade without prompts
/flutter-upgrade --force
```

## Implementation

When this command runs:

### 1. **Environment Check**

Verify Flutter installation:
```bash
flutter --version
flutter doctor -v
```

Check current project:
```bash
# Verify pubspec.yaml exists
if [ ! -f "pubspec.yaml" ]; then
  echo "Error: Not a Flutter project"
  exit 1
fi

# Save current versions for rollback
cp pubspec.yaml pubspec.yaml.backup
flutter --version > .flutter_version_backup
```

### 2. **Check for Updates**

**SDK Updates:**
```bash
# Check Flutter channel
flutter channel

# Check for SDK updates
flutter upgrade --dry-run
```

Parse output to identify:
- Current SDK version
- Available SDK version
- Breaking changes between versions

**Dependency Updates:**
```bash
# Check for outdated packages
flutter pub outdated --mode=null-safety
```

Parse output for:
- Current versions
- Latest compatible versions
- Latest versions (may require major upgrade)

### 3. **Present Upgrade Plan**

Show user what will be upgraded:

```
Flutter Upgrade Plan
====================

SDK Upgrade:
  Current:  Flutter 3.16.5 • Dart 3.2.3
  Available: Flutter 3.19.0 • Dart 3.3.0

  Breaking Changes:
    - Material 3 is now default
    - ThemeData.useMaterial3 defaults to true
    - Deprecated APIs removed: Scaffold.resizeToAvoidBottomPadding

Dependency Upgrades:

  provider: 6.0.5 → 6.1.2 (minor)
  http: 0.13.6 → 1.2.0 (major) ⚠️
    Breaking: Response.body now Future<String>

  dio: 5.3.3 → 5.4.1 (minor)

  flutter_bloc: 8.1.3 → 8.1.5 (patch)

Test Dependencies:
  mockito: 5.4.2 → 5.4.4 (patch)

Recommendations:
  1. Review http 1.x migration guide
  2. Test thoroughly after Material 3 upgrade
  3. Run tests before and after upgrade

Continue? (y/n)
```

### 4. **Upgrade SDK** (if target is 'sdk' or 'all')

```bash
# Upgrade Flutter SDK
flutter upgrade

# Verify upgrade
flutter --version

# Run doctor to check for issues
flutter doctor
```

Check for platform-specific setup needed:
```bash
# Check if Xcode upgrade needed (macOS)
xcodebuild -version

# Check if Android SDK tools need update
flutter doctor --android-licenses
```

### 5. **Upgrade Dependencies** (if target is 'deps' or 'all')

Update pubspec.yaml with new versions.

**Minor/Patch Upgrades:**
```bash
# Upgrade to latest compatible versions
flutter pub upgrade
```

**Major Upgrades** (if --major flag):
```bash
# Manually update pubspec.yaml
# Ask user to confirm each major upgrade

# For example, http 0.13.6 → 1.2.0:
```

Show diff before applying:
```diff
dependencies:
-  http: ^0.13.6
+  http: ^1.2.0
```

### 6. **Detect Breaking Changes**

Analyze upgrade for breaking changes:

**SDK Breaking Changes:**
- Check Flutter changelog: https://docs.flutter.dev/release/breaking-changes
- Parse relevant sections for current → target version

**Dependency Breaking Changes:**
- Check package changelogs on pub.dev
- Search for "BREAKING" or "Breaking Change" in CHANGELOG.md

Create breaking changes report:
```
Breaking Changes Detected
=========================

Flutter SDK (3.16.5 → 3.19.0):

  1. Material 3 Default
     Impact: Medium
     Files affected: All UI files
     Migration: Review Material Design 3 components

  2. Deprecated API Removal
     Impact: Low
     Files: lib/screens/settings.dart
     Fix: Replace Scaffold.resizeToAvoidBottomPadding with
          Scaffold.resizeToAvoidBottomInset

http (0.13.6 → 1.2.0):

  1. Async Response Body
     Impact: High
     Files: lib/services/api_client.dart, lib/repositories/*.dart
     Migration: await response.body instead of response.body

  2. Client Configuration
     Impact: Medium
     Files: lib/core/network/http_client.dart
     Fix: Update Client() constructor parameters
```

### 7. **Run Migration Tools** (if --migrate flag)

Apply automated migrations:

```bash
# Run Dart migration tool
dart migrate --apply-changes

# Run Flutter fix
dart fix --apply

# Format code
dart format lib/ test/
```

**Manual Migration Steps:**

For each breaking change:
1. Search codebase for affected patterns
2. Show user locations
3. Suggest fixes
4. Ask to apply or skip

Example for Material 3:
```bash
# Find files using old Material 2 patterns
grep -r "primarySwatch" lib/

# Suggest migration
echo "Replace ThemeData(primarySwatch: Colors.blue) with"
echo "ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue))"

# Ask user: Apply this change? (y/n/skip all)
```

### 8. **Test After Upgrade**

Run comprehensive tests:
```bash
# Analyze code
flutter analyze

# Run tests
flutter test

# Try building for each platform
flutter build apk --debug
flutter build ios --debug --no-codesign
flutter build web
```

If any tests fail:
```
⚠️ Tests Failed After Upgrade

3 test(s) failed:
  - test/services/api_client_test.dart: HTTP response body access
  - test/widgets/theme_test.dart: Material 3 color scheme

Review failures and fix before proceeding.

Rollback? (y/n)
```

### 9. **Generate Migration Report**

Create detailed upgrade report:

```markdown
# Flutter Upgrade Report
Date: 2026-01-23 15:45:00

## Versions
- Flutter: 3.16.5 → 3.19.0 ✓
- Dart: 3.2.3 → 3.3.0 ✓

## Dependencies Upgraded
- provider: 6.0.5 → 6.1.2 ✓
- http: 0.13.6 → 1.2.0 ✓
- dio: 5.3.3 → 5.4.1 ✓
- flutter_bloc: 8.1.3 → 8.1.5 ✓

## Migrations Applied
1. Material 3 theme updates (5 files)
2. HTTP async response body (3 files)
3. Deprecated API removals (2 files)

## Test Results
- Analyze: ✓ No issues
- Unit Tests: ✓ 124/124 passed
- Widget Tests: ✓ 45/45 passed
- Integration Tests: ✓ 8/8 passed

## Breaking Changes Resolved
- [x] Material 3 default theme
- [x] HTTP response.body async
- [x] Scaffold bottom inset property

## Action Items
- [ ] Review Material Design 3 guidelines
- [ ] Update UI documentation
- [ ] Notify team of upgrade

## Rollback Instructions
If issues arise:
```bash
# Restore pubspec.yaml
cp pubspec.yaml.backup pubspec.yaml
flutter pub get

# Downgrade Flutter (if needed)
flutter downgrade
```

Backup files saved:
- pubspec.yaml.backup
- .flutter_version_backup
```

Save report to: `UPGRADE_REPORT_2026-01-23.md`

### 10. **Cleanup**

```bash
# Clean build artifacts
flutter clean

# Get dependencies fresh
flutter pub get

# Regenerate generated files
flutter pub run build_runner build --delete-conflicting-outputs
```

## Rollback Procedure

If upgrade fails or causes issues:

```bash
# Restore pubspec.yaml
cp pubspec.yaml.backup pubspec.yaml

# Restore dependencies
flutter pub get

# Downgrade SDK if needed
flutter downgrade

# Verify rollback
flutter doctor
flutter analyze
flutter test
```

Ask user: "Rollback completed. Previous state restored. Investigate issues?"

## Error Handling

- **SDK upgrade fails**: Check internet connection, Flutter channel
- **Dependency conflicts**: Show dependency tree, suggest resolutions
- **Breaking changes too extensive**: Recommend incremental upgrades
- **Tests fail after upgrade**: Offer rollback option
- **Build fails**: Check platform-specific requirements

## Best Practices

1. **Backup before upgrading**: Always create backup of pubspec.yaml
2. **Read changelogs**: Review breaking changes before upgrading
3. **Test incrementally**: Test after each major upgrade
4. **Upgrade regularly**: Smaller, frequent upgrades easier than large jumps
5. **Use version constraints**: Pin major versions to avoid surprises
6. **CI/CD integration**: Run upgrade checks in CI pipeline

## Version Pinning Strategy

Recommend version constraints:

```yaml
dependencies:
  # Pin major version, allow minor/patch
  provider: ^6.0.0

  # Pin major.minor, allow patch only
  http: '>=1.2.0 <1.3.0'

  # Exact version for critical dependencies
  flutter_bloc: 8.1.5
```

## Related Skills

Reference these skills for more information:
- **flutter-testing-quality** - Testing after upgrades
- **flutter-deployment** - Build configuration updates

## Advanced Options

### Channel Management

```bash
# Switch Flutter channels
flutter channel stable
flutter channel beta

# Upgrade channel
flutter upgrade
```

### Dependency Analysis

```bash
# Check dependency tree
flutter pub deps

# Check for conflicts
flutter pub deps --style=compact
```

### Pre-upgrade Health Check

```bash
# Ensure clean state
git status
flutter clean
flutter pub get
flutter analyze
flutter test
```
