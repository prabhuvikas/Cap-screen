# Test Documentation

This directory contains manual test scripts for the Cred Issue Reporter Chrome extension.

## Test Files

| File | Purpose | When to Use | Time |
|------|---------|-------------|------|
| `UNIT_TESTS.md` | Test individual functions/methods | After modifying core logic | 15-20 min |
| `SMOKE_TEST.md` | Quick pre-merge verification | Before every PR merge | 5 min |
| `REGRESSION_TEST.md` | Full feature verification | Before releases | 45-60 min |

## Testing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT PHASE                            │
├─────────────────────────────────────────────────────────────────┤
│  Developer makes changes                                         │
│       ↓                                                          │
│  Run relevant UNIT_TESTS for modified components                 │
│       ↓                                                          │
│  Create PR                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PRE-MERGE PHASE                              │
├─────────────────────────────────────────────────────────────────┤
│  Run SMOKE_TEST (5 min)                                          │
│       ↓                                                          │
│  All tests pass? → Merge PR                                      │
│  Tests fail? → Fix issues, re-test                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RELEASE PHASE                                │
├─────────────────────────────────────────────────────────────────┤
│  Run REGRESSION_TEST (45-60 min)                                 │
│       ↓                                                          │
│  All tests pass? → Create release                                │
│  Tests fail? → Fix critical issues, re-test                      │
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

## Future: Automated Testing

These manual tests are designed to be convertible to automated tests:

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

Recommended tools for future automation:
- **Unit tests**: Jest
- **E2E tests**: Puppeteer or Playwright
- **Visual regression**: Percy or Chromatic

## Contributing

When adding new features:
1. Add corresponding test cases to relevant test files
2. Ensure test cases cover happy path and edge cases
3. Update this README if adding new test categories
