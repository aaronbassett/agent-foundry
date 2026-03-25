---
name: flutter-analyze
description: Comprehensive code quality analysis with Flutter analyzer, Dart analyzer, AI rules compliance checking, and auto-fix capabilities
argument-hint: "[--fix] [--rules] [--strict] [--format=<json|default>]"
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---

# Flutter Code Analysis

This command performs comprehensive code quality analysis on your Flutter project, checking for issues, verifying Flutter AI rules compliance, and optionally auto-fixing problems.

## Usage

```bash
/flutter-analyze [options]
```

## Options

- `--fix` - Automatically fix issues where possible
- `--rules` - Check compliance with Flutter AI rules (flutter/flutter rules.md)
- `--strict` - Use strict analysis options (treat warnings as errors)
- `--format=<json|default>` - Output format (default: human-readable)
- `--coverage` - Include test coverage analysis

## Examples

```bash
# Basic health check
/flutter-analyze

# Auto-fix issues
/flutter-analyze --fix

# Check Flutter AI rules compliance
/flutter-analyze --rules

# Strict mode for CI/CD
/flutter-analyze --strict --format=json

# Complete analysis with coverage
/flutter-analyze --fix --rules --coverage
```

## Implementation

When this command runs:

### 1. **Environment Verification**

Check Flutter and Dart are available:
```bash
flutter --version
dart --version
```

If not found, guide user to install Flutter SDK.

### 2. **Project Detection**

Verify we're in a Flutter project:
```bash
# Check for pubspec.yaml
if [ ! -f "pubspec.yaml" ]; then
  echo "Error: Not a Flutter project (no pubspec.yaml found)"
  exit 1
fi

# Check if dependencies are up to date
flutter pub get
```

### 3. **Run Flutter Analyzer**

Execute Flutter's analyzer:
```bash
flutter analyze --no-pub
```

Capture output and parse for:
- **Errors** (critical issues)
- **Warnings** (potential problems)
- **Info** (suggestions)
- **Lints** (style violations)

### 4. **Run Dart Analyzer** (if --strict flag)

```bash
dart analyze --fatal-infos --fatal-warnings
```

This treats warnings and info messages as errors.

### 5. **Check Flutter AI Rules** (if --rules flag)

Verify compliance with Flutter AI rules from https://raw.githubusercontent.com/flutter/flutter/refs/heads/main/docs/rules/rules.md

Check for common violations:

**Rule: Prefer const constructors**
```bash
# Search for potential const violations
grep -r "Widget build" lib/ | grep -v "const"
```

**Rule: Avoid late variables when possible**
```bash
# Find late variable usage
grep -r "late " lib/
```

**Rule: Use meaningful names**
```bash
# Find single-letter variable names (excluding i, j, k in loops)
grep -rE "\b[a-z]\s*=" lib/ | grep -v "for ("
```

**Rule: Prefer final over var**
```bash
# Find var usage that could be final
grep -r " var " lib/
```

**Rule: Avoid dynamic when possible**
```bash
# Find dynamic types
grep -r " dynamic " lib/
```

Present violations with:
- File path and line number
- Rule violated
- Suggested fix

### 6. **Auto-Fix Issues** (if --fix flag)

Run dart fix:
```bash
# Dry run first to show what would be fixed
dart fix --dry-run

# Ask user to confirm
# If confirmed:
dart fix --apply
```

Run flutter format:
```bash
dart format lib/ test/
```

### 7. **Test Coverage** (if --coverage flag)

Run tests with coverage:
```bash
flutter test --coverage

# Generate coverage report
genhtml coverage/lcov.info -o coverage/html

# Parse coverage percentage
lcov --summary coverage/lcov.info
```

### 8. **Generate Report**

Create comprehensive analysis report.

**Default Format** (human-readable):
```
Flutter Code Analysis Report
============================

Project: my_flutter_app
Analyzed: 2026-01-23 14:32:15

Summary:
  ✓ 0 errors
  ⚠ 3 warnings
  ℹ 5 info messages
  📝 12 lints

Details:

  [WARNING] lib/screens/home.dart:45
  Prefer const with constant constructors
  → const SizedBox(height: 16)

  [INFO] lib/services/api.dart:23
  Consider using final instead of var
  → final response = await http.get(url)

  [LINT] lib/widgets/button.dart:12
  Missing trailing comma
  → child: Text('Submit'),

Flutter AI Rules:
  ✓ No late variables
  ⚠ 3 potential const violations
  ✓ No dynamic types
  ℹ 5 var declarations (consider final)

Test Coverage:
  Overall: 78.5%
  lib/: 82.3%
  test/: 95.1%

Recommendations:
  1. Fix const constructor violations
  2. Replace var with final where appropriate
  3. Add trailing commas for better formatting
  4. Increase coverage in lib/services/ (65.2%)
```

**JSON Format** (for CI/CD):
```json
{
  "timestamp": "2026-01-23T14:32:15Z",
  "project": "my_flutter_app",
  "summary": {
    "errors": 0,
    "warnings": 3,
    "info": 5,
    "lints": 12
  },
  "issues": [
    {
      "severity": "warning",
      "file": "lib/screens/home.dart",
      "line": 45,
      "message": "Prefer const with constant constructors",
      "suggestion": "const SizedBox(height: 16)"
    }
  ],
  "ai_rules": {
    "late_variables": 0,
    "const_violations": 3,
    "dynamic_types": 0,
    "var_declarations": 5
  },
  "coverage": {
    "overall": 78.5,
    "lib": 82.3,
    "test": 95.1
  },
  "passed": false
}
```

### 9. **Exit Code**

Return appropriate exit code:
- **0**: No issues or only info/lints
- **1**: Warnings found (and --strict flag)
- **2**: Errors found

## Error Handling

- **Flutter not installed**: Guide to https://docs.flutter.dev/get-started/install
- **Not a Flutter project**: Suggest creating project with /flutter-new
- **Dependencies out of sync**: Run `flutter pub get`
- **Analysis fails**: Show raw analyzer output for debugging

## Integration with CI/CD

Example GitHub Actions workflow:
```yaml
- name: Flutter Analysis
  run: |
    /flutter-analyze --strict --format=json > analysis.json

- name: Upload Analysis
  uses: actions/upload-artifact@v3
  with:
    name: analysis-report
    path: analysis.json
```

## Tips

- Run analysis before every commit (use pre-commit hook)
- Fix warnings early to prevent accumulation
- Use --strict in CI/CD to enforce quality
- Check AI rules periodically to ensure compliance
- Aim for 80%+ test coverage on critical code
- Review auto-fixes before committing

## Related Skills

Reference these skills for more information:
- **flutter-testing-quality** - Testing and code coverage
- **flutter-performance** - Performance profiling
- **flutter-architecture** - Code organization patterns

## Advanced Features

### Custom Analysis Rules

Create `analysis_options.yaml` in project root:
```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
  errors:
    invalid_annotation_target: ignore

linter:
  rules:
    - prefer_const_constructors
    - prefer_final_fields
    - avoid_dynamic_calls
    - use_key_in_widget_constructors
    - sized_box_for_whitespace
    - prefer_const_literals_to_create_immutables
```

### Incremental Analysis

Analyze only changed files:
```bash
# Get changed files since last commit
git diff --name-only HEAD | grep "\.dart$" | xargs flutter analyze
```

### Performance Tracking

Track analysis metrics over time to measure code quality improvements.
