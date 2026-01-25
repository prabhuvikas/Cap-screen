# Release Notes: v2.1.5

**Release Date:** January 25, 2026
**Previous Version:** v2.1.2
**Current Version:** v2.1.5

This document summarizes all changes to the core functionality and infrastructure from version 2.1.2 to 2.1.5.

---

## Summary

Version 2.1.5 focuses on **stability improvements** in the annotation editor, introducing a comprehensive **testing infrastructure**, and enhancing the **CI/CD pipeline** with automated testing and smarter release management.

---

## Fixed (Core Functionality)

### Annotation Editor Bugs

| Issue | Description |
|-------|-------------|
| **Undo/Redo After Crop** | Fixed critical issue where undo/redo functionality stopped working correctly after cropping an image |
| **Duplicate Annotations** | Resolved bug where annotations would appear duplicated after performing a crop operation |
| **History State Handling** | Fixed the `restoreState` method to properly handle the new history format |

### UI Improvements

| Issue | Description |
|-------|-------------|
| **Zoom Reset Button** | Renamed from "1:1" to "Reset Zoom" for better clarity |

### Release Workflow

| Issue | Description |
|-------|-------------|
| **Build Artifact Management** | Removed zip file from git commits (build artifacts should not be version controlled) |

---

## Added

### Testing Infrastructure

| Feature | Description |
|---------|-------------|
| **Automated Test Workflow** | New CI workflow that runs automatically on every PR to `main`, posting results as comments |
| **Jest Unit Tests** | Comprehensive unit tests for the `Annotator` class covering drawing tools, undo/redo, and state management |
| **Smoke Test Suite** | Automated pre-merge smoke tests to catch critical issues before merging |
| **Regression Test Suite** | Comprehensive regression tests covering edge cases in annotation and cropping |
| **Manual Test Scripts** | Scripts for manual pre-merge and regression testing |

### CI/CD Automation

| Feature | Description |
|---------|-------------|
| **Changelog Auto-Detection** | Automatically categorizes changes based on PR title prefixes |
| **Conditional Pipeline Execution** | Skip releases via `skip-release` label or for docs-only changes |

#### Changelog Auto-Detection Patterns

| PR Title Pattern | Changelog Section |
|------------------|-------------------|
| `fix:`, `bugfix:`, contains "fix", "bug" | **Fixed** |
| `feat:`, `feature:`, contains "add", "new" | **Added** |
| `refactor:`, contains "update", "improve" | **Changed** |
| `remove:`, contains "remove", "delete" | **Removed** |

---

## Changed

### Release Pipeline Refactoring

The monolithic release workflow has been restructured into a **4-stage pipeline**:

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Pre-check  │ → │   Prepare   │ → │    Build     │ → │  Distribute │ → Publish
│             │    │             │    │              │    │             │
│ Skip check  │    │ Version     │    │ Bump version │    │ Drive upload│
│ Label check │    │ type detect │    │ Changelog    │    │ Redmine news│
└─────────────┘    └─────────────┘    │ Build ZIP    │    └─────────────┘
                                      └──────────────┘
```

### Repository Hygiene

- Excluded zip build artifacts from the repository via `.gitignore`
- Build artifacts are now only attached to GitHub releases

---

## Documentation Updates

- Expanded `CLAUDE.md` with detailed folder descriptions and responsibilities
- Added CI test workflow documentation
- Included instructions for enabling branch protection in GitHub

---

## Files Changed

### Core Functionality
- `content/annotator.js` - Bug fixes for undo/redo and crop functionality
- `annotate/annotate.js` - UI button label update

### Testing
- `tests/unit/annotator.test.js` - Jest unit tests
- `tests/smoke/smoke.test.js` - Smoke test suite
- `tests/regression/regression.test.js` - Regression test suite
- `scripts/test-pre-merge.sh` - Manual pre-merge test script
- `scripts/test-regression.sh` - Manual regression test script

### CI/CD
- `.github/workflows/ci.yml` - New automated test workflow
- `.github/workflows/release.yml` - Multi-stage pipeline refactoring
- `.github/scripts/generate-changelog.js` - Auto-detection logic

### Configuration
- `.gitignore` - Exclude zip artifacts

---

## Upgrade Instructions

No manual intervention required. Simply update the extension:

1. Download the latest version (v2.1.5)
2. Go to `chrome://extensions/`
3. Remove the old version
4. Load the new unpacked extension

All existing settings and preferences will be preserved.

---

## Related Pull Requests

| PR | Description |
|----|-------------|
| [#38](https://github.com/prabhuvikas/Cap-screen/pull/38) | CI test workflow and changelog auto-detection |
| [#37](https://github.com/prabhuvikas/Cap-screen/pull/37) | Annotation editor bug fixes and testing infrastructure |
| [#36](https://github.com/prabhuvikas/Cap-screen/pull/36) | Exclude zip build artifacts from repository |
| [#35](https://github.com/prabhuvikas/Cap-screen/pull/35) | Conditional pipeline execution with skip-release |
| [#34](https://github.com/prabhuvikas/Cap-screen/pull/34) | Multi-stage release pipeline refactoring |

---

## Contributors

- @prabhuvikas

---

## Support

For bug reports and feature requests:
- GitHub Issues: https://github.com/prabhuvikas/Cap-screen/issues
- Redmine: https://support.credenceanalytics.com/projects/redmine_tracker/issues
