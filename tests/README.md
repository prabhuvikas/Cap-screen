# Test Documentation

This directory contains automated tests for the Cred Issue Reporter Chrome extension.

## Automated Testing (CI)

Tests run automatically on every pull request via GitHub Actions. **PRs cannot be merged unless all tests pass.**

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:smoke      # Critical path tests (~5 sec)
npm run test:unit       # Unit tests (~10 sec)
npm run test:regression # Full regression (~30 sec)

# Run with coverage
npm test -- --coverage
```

### CI Workflow

The CI workflow (`.github/workflows/ci.yml`) automatically:
1. Runs all test suites on every PR
2. Posts test results as a PR comment
3. Blocks merge if any tests fail

To view test results:
- Check the PR for the bot comment with results
- Click **"Details"** on the status check
- View the **Actions** tab for full logs

## Test Files

| File | Purpose | When to Use | Time |
|------|---------|-------------|------|
| `smoke.test.js` | Critical path verification | Every PR (automated) | ~5 sec |
| `annotator.test.js` | Annotator class unit tests | Every PR (automated) | ~10 sec |
| `regression.test.js` | Full feature verification | Every PR (automated) | ~30 sec |

### Manual Test Documentation

| File | Purpose |
|------|---------|
| `UNIT_TESTS.md` | Manual unit test procedures |
| `SMOKE_TEST.md` | Manual smoke test checklist |
| `REGRESSION_TEST.md` | Manual regression test checklist |

## Testing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT PHASE                            │
├─────────────────────────────────────────────────────────────────┤
│  Developer makes changes                                         │
│       ↓                                                          │
│  Run tests locally: npm test                                     │
│       ↓                                                          │
│  Create PR                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CI TESTING (Automated)                       │
├─────────────────────────────────────────────────────────────────┤
│  GitHub Actions runs all tests automatically                     │
│       ↓                                                          │
│  All tests pass? → PR ready for review                           │
│  Tests fail? → Fix issues, push again                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     MERGE & RELEASE                              │
├─────────────────────────────────────────────────────────────────┤
│  PR approved and tests passing → Merge to main                   │
│       ↓                                                          │
│  Release workflow runs automatically                             │
└─────────────────────────────────────────────────────────────────┘
```

## How to Use

### 1. Copy the Template
Before each test session, copy the relevant markdown file or use it directly and track results.

### 2. Fill in Test Session Info
Record:
- Date
- Tester name
- Version being tested
- Browser version
- Branch name (for PRs)

### 3. Execute Tests
Work through each test case:
- Follow the steps exactly
- Mark status: ✓ (pass), ✗ (fail), or - (skip)
- Note any issues immediately

### 4. Document Issues
For any failures:
- Record the exact error/behavior
- Note severity (Critical/High/Medium/Low)
- Add screenshots if helpful

### 5. Sign Off
Complete the summary section and sign off on results.

## Status Markers

Use these markers in the Status column:

| Marker | Meaning |
|--------|---------|
| ✓ or PASS | Test passed |
| ✗ or FAIL | Test failed |
| - or SKIP | Test skipped (with reason) |
| N/A | Not applicable |

## Severity Levels

| Level | Description | Action |
|-------|-------------|--------|
| **Critical** | Core functionality broken, data loss, crash | Block release |
| **High** | Major feature broken, no workaround | Block release |
| **Medium** | Feature partially broken, workaround exists | Consider blocking |
| **Low** | Minor issue, cosmetic | Document, fix later |

## Quick Reference: Recent Bug Fixes

When testing, pay special attention to these recently fixed areas:

### Undo/Redo (Fixed in v2.1.x)
- Undo now properly restores both canvas AND annotations
- Test: Draw → Undo → Redo sequence
- Test: Undo after crop

### Move After Crop (Fixed in v2.1.x)
- Moving annotations after crop no longer creates duplicates
- Test: Draw shape → Crop → Move shape

### History Format (Fixed in v2.1.x)
- History supports both legacy string and new object format
- Test: Switch between screenshots with annotations

## Test Framework

Tests use **Jest** with `jest-environment-jsdom` for browser API simulation.

### Test Structure

```javascript
// Example: Unit test for undo
describe('Annotator.undo()', () => {
  it('should decrement historyStep', () => {
    // Setup
    annotator.saveState();
    annotator.saveState();
    expect(annotator.historyStep).toBe(2);

    // Action
    annotator.undo();

    // Assert
    expect(annotator.historyStep).toBe(1);
  });
});
```

### Future Enhancements

Potential additions:
- **E2E tests**: Puppeteer or Playwright for full browser testing
- **Visual regression**: Percy or Chromatic for UI screenshot testing

## Contributing

When adding new features:
1. Add corresponding test cases to relevant test files
2. Ensure test cases cover happy path and edge cases
3. Update this README if adding new test categories
