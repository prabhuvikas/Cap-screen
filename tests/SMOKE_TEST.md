# Smoke Test - Pre-Merge Quick Verification

> **Purpose**: Quick sanity check before every merge to ensure core functionality works
> **When to run**: Before every PR merge
> **Time**: ~5 minutes

---

## Test Session Info

| Field | Value |
|-------|-------|
| **Date** | |
| **Tester** | |
| **Version** | |
| **Branch** | |
| **Browser** | Chrome v___ |
| **Result** | PASS / FAIL |

---

## Pre-Requisites

- [ ] Extension loaded in Chrome (Developer mode)
- [ ] Redmine connection configured in Settings
- [ ] At least one webpage open to capture

---

## Critical Path Tests

### 1. Extension Launch (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 1.1 | Click extension icon | Popup opens | |
| 1.2 | Verify UI loads | Both capture cards visible | |

### 2. Screenshot Capture (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 2.1 | Click "Capture Current Tab" | Screenshot captured | |
| 2.2 | Verify annotation page opens | Canvas shows screenshot | |

### 3. Annotation Tools (1 min)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 3.1 | Draw with Pen tool | Freehand line appears | |
| 3.2 | Draw a Rectangle | Rectangle shape appears | |
| 3.3 | Draw an Arrow | Arrow shape appears | |
| 3.4 | Add Text annotation | Text appears on canvas | |

### 4. Undo/Redo (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 4.1 | Click Undo button | Last shape removed | |
| 4.2 | Click Undo again | Previous shape removed | |
| 4.3 | Click Redo button | Shape restored | |

### 5. Move Annotation (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 5.1 | Select Move tool | Cursor changes to grab | |
| 5.2 | Click on a shape | Selection box appears | |
| 5.3 | Drag shape to new position | Shape moves, no duplicate | |

### 6. Crop Function (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 6.1 | Select Crop tool | Crop mode activated | |
| 6.2 | Draw crop selection | Overlay with selection shown | |
| 6.3 | Click Apply Crop | Image cropped to selection | |
| 6.4 | Move an annotation | No duplicate created | |

### 7. Undo After Crop (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 7.1 | Click Undo after crop | Canvas restored to pre-crop | |
| 7.2 | Click Redo | Crop re-applied | |

### 8. Continue to Report (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 8.1 | Click "Continue to Report" | Report form appears | |
| 8.2 | Verify screenshot preview | Annotated image shown | |
| 8.3 | Verify no console errors | No [object Object] errors | |

### 9. Form Validation (30 sec)
| # | Step | Expected | Status |
|---|------|----------|--------|
| 9.1 | Project dropdown loads | Projects from Redmine shown | |
| 9.2 | Priority dropdown loads | Priorities available | |
| 9.3 | Assignee dropdown loads | Members available | |

---

## Quick Result

| Test Area | Result |
|-----------|--------|
| Extension Launch | |
| Screenshot Capture | |
| Annotation Tools | |
| Undo/Redo | |
| Move Annotation | |
| Crop Function | |
| Undo After Crop | |
| Continue to Report | |
| Form Validation | |

---

## Overall Result

- [ ] **PASS** - All tests passed, safe to merge
- [ ] **FAIL** - Issues found, do not merge

---

## Blocking Issues Found

| # | Description | Severity | Blocks Merge? |
|---|-------------|----------|---------------|
| 1 | | High/Medium/Low | Yes/No |
| 2 | | | |
| 3 | | | |

---

## Notes

```
(Add any observations or minor issues here)


```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
