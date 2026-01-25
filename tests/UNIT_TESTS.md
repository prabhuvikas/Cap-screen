# Unit Tests - Manual Testing Checklist

> **Purpose**: Test individual functions and methods in isolation
> **When to run**: After modifying core logic in `annotator.js`, `redmine-api.js`, or `utils.js`
> **Time**: ~15-20 minutes

---

## Test Session Info

| Field | Value |
|-------|-------|
| **Date** | |
| **Tester** | |
| **Version** | |
| **Browser** | |
| **Result** | PASS / FAIL |

---

## 1. Annotator Class - State Management

### 1.1 saveState()
> Location: `content/annotator.js:746`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1.1 | Initial state saved on load | Load annotation page with screenshot | `history.length === 1`, `historyStep === 0` | |
| 1.1.2 | State saved after drawing | Draw one shape | `history.length === 2`, `historyStep === 1` | |
| 1.1.3 | State includes annotations | Draw shape, check console | State object contains `annotations` array with shape | |
| 1.1.4 | State includes canvas data | Draw shape, check console | State object contains `canvasData` as data URL | |
| 1.1.5 | State includes dimensions | After crop, save state | State contains `canvasWidth` and `canvasHeight` | |
| 1.1.6 | Redo stack cleared on new action | Undo, then draw new shape | Redo not available (history truncated) | |

### 1.2 restoreStateFromHistory()
> Location: `content/annotator.js:761`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.2.1 | Restores canvas image | Draw shape, undo | Canvas shows previous state | |
| 1.2.2 | Restores annotations array | Draw 2 shapes, undo | `annotations.length` decreases by 1 | |
| 1.2.3 | Restores canvas dimensions | Crop, undo | Canvas size reverts to original | |
| 1.2.4 | Restores imageDataUrl | Crop, undo | Base image URL reverts | |
| 1.2.5 | Clears selection on restore | Select shape, undo | No shape selected after undo | |
| 1.2.6 | Handles legacy string format | (N/A - internal) | No error when history contains string | |

### 1.3 undo()
> Location: `content/annotator.js:800`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.3.1 | Decrements historyStep | Draw shape, undo | `historyStep` decreases by 1 | |
| 1.3.2 | Does nothing at step 0 | Load page, click undo | No change, no error | |
| 1.3.3 | Multiple undos work | Draw 3 shapes, undo 3 times | All shapes removed | |
| 1.3.4 | Undo after move | Move shape, undo | Shape returns to original position | |
| 1.3.5 | Undo after crop | Crop image, undo | Image and canvas size restored | |
| 1.3.6 | Undo after delete | Delete shape, undo | Shape reappears | |

### 1.4 redo()
> Location: `content/annotator.js:807`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.4.1 | Increments historyStep | Undo, then redo | `historyStep` increases by 1 | |
| 1.4.2 | Does nothing at end | Draw shape (no undo), click redo | No change, no error | |
| 1.4.3 | Multiple redos work | Draw 3 shapes, undo 3x, redo 3x | All shapes restored | |
| 1.4.4 | Redo after undo move | Move, undo, redo | Shape in moved position | |
| 1.4.5 | Redo cleared after new action | Undo, draw new shape, try redo | Redo does nothing | |

---

## 2. Annotator Class - Annotation Operations

### 2.1 findAnnotationAt(x, y)
> Location: `content/annotator.js:556`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1.1 | Find pen stroke | Draw pen stroke, click on it with move tool | Annotation selected | |
| 2.1.2 | Find rectangle | Draw rectangle, click inside it | Annotation selected | |
| 2.1.3 | Find circle | Draw circle, click on its edge | Annotation selected | |
| 2.1.4 | Find arrow | Draw arrow, click on the line | Annotation selected | |
| 2.1.5 | Find text | Add text, click on it | Annotation selected | |
| 2.1.6 | Find blackout | Draw blackout, click inside | Annotation selected | |
| 2.1.7 | Return null for empty area | Click on area with no annotation | No selection (null) | |
| 2.1.8 | Top annotation selected | Draw overlapping shapes, click overlap | Top shape selected | |

### 2.2 deleteSelectedAnnotation()
> Location: `content/annotator.js:369`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.2.1 | Delete removes from array | Select and delete shape | `annotations.length` decreases | |
| 2.2.2 | Delete clears selection | Delete selected shape | `selectedAnnotation === null` | |
| 2.2.3 | Delete redraws canvas | Delete shape | Shape visually removed | |
| 2.2.4 | Delete saves state | Delete shape | Undo available for deleted shape | |
| 2.2.5 | No action without selection | Press Delete with nothing selected | No error, no change | |

### 2.3 adjustAnnotationForCrop(annotation, offsetX, offsetY)
> Location: `content/annotator.js:1001`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.3.1 | Adjusts pen points | Crop with pen stroke inside | All points offset correctly | |
| 2.3.2 | Adjusts rectangle coords | Crop with rectangle inside | x, y, endX, endY adjusted | |
| 2.3.3 | Adjusts text position | Crop with text inside | x, y adjusted | |
| 2.3.4 | Returns null for out of bounds | Crop excluding annotation | Annotation removed (null) | |
| 2.3.5 | Keeps partial overlap | Crop partially including shape | Shape kept with adjusted coords | |

---

## 3. Annotator Class - Crop Operations

### 3.1 applyCrop()
> Location: `content/annotator.js:929`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1.1 | Updates canvas dimensions | Apply crop | `canvas.width` and `height` match crop area | |
| 3.1.2 | Updates imageDataUrl | Apply crop | `imageDataUrl` is new cropped image | |
| 3.1.3 | Filters annotations | Crop excluding some shapes | Excluded shapes removed from array | |
| 3.1.4 | Adjusts annotation coords | Crop | Remaining shapes have adjusted coordinates | |
| 3.1.5 | Rejects small crop | Select < 10px area | Error message shown | |
| 3.1.6 | Saves state after crop | Apply crop | Undo available | |
| 3.1.7 | No duplicate annotations | Crop, then move shape | Single shape, no duplicate | |

### 3.2 cancelCrop()
> Location: `content/annotator.js:1091`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.2.1 | Resets crop state | Start crop, cancel | `cropActive === false` | |
| 3.2.2 | Redraws original canvas | Start crop, cancel | Canvas shows original | |
| 3.2.3 | Hides crop controls | Cancel crop | Apply/Cancel buttons hidden | |

---

## 4. Annotator Class - Zoom Operations

### 4.1 setZoom(level)
> Location: `content/annotator.js:874`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1.1 | Sets zoom level | Call setZoom(2.0) | `zoomLevel === 2.0` | |
| 4.1.2 | Clamps to minZoom | Call setZoom(0.1) | `zoomLevel === 0.25` | |
| 4.1.3 | Clamps to maxZoom | Call setZoom(5.0) | `zoomLevel === 4.0` | |
| 4.1.4 | Applies CSS transform | Zoom in | Canvas style has `scale()` | |

### 4.2 zoomIn() / zoomOut() / zoomReset()

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.2.1 | Zoom in increases by step | Click Zoom In | Zoom increases by 0.25 | |
| 4.2.2 | Zoom out decreases by step | Click Zoom Out | Zoom decreases by 0.25 | |
| 4.2.3 | Reset returns to 1.0 | Zoom in, click Reset | `zoomLevel === 1.0` | |

---

## 5. Annotator Class - Drawing Tools

### 5.1 Tool Selection

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1.1 | Pen tool sets currentTool | Select pen | `currentTool === 'pen'` | |
| 5.1.2 | Rectangle tool sets currentTool | Select rectangle | `currentTool === 'rectangle'` | |
| 5.1.3 | Circle tool sets currentTool | Select circle | `currentTool === 'circle'` | |
| 5.1.4 | Arrow tool sets currentTool | Select arrow | `currentTool === 'arrow'` | |
| 5.1.5 | Text tool sets currentTool | Select text | `currentTool === 'text'` | |
| 5.1.6 | Blackout tool sets currentTool | Select blackout | `currentTool === 'blackout'` | |
| 5.1.7 | Move tool sets currentTool | Select move | `currentTool === 'move'` | |
| 5.1.8 | Crop tool sets currentTool | Select crop | `currentTool === 'crop'` | |

### 5.2 Color and Width

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.2.1 | setColor updates color | Pick blue color | `currentColor === '#0000ff'` (or selected) | |
| 5.2.2 | setLineWidth updates width | Select 5px | `lineWidth === 5` | |
| 5.2.3 | New shapes use current color | Change color, draw | Shape uses new color | |
| 5.2.4 | New shapes use current width | Change width, draw | Shape uses new width | |

---

## 6. Annotator Class - State Persistence

### 6.1 getState()
> Location: `content/annotator.js:795`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1.1 | Returns complete state | Call getState() | Contains history, annotations, tool, color, etc. | |
| 6.1.2 | Deep copies annotations | Modify returned state | Original annotations unchanged | |

### 6.2 restoreState(state)
> Location: `content/annotator.js:843`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.2.1 | Restores all properties | Switch screenshots and back | All annotations restored | |
| 6.2.2 | Handles new history format | Restore with object history | No errors, canvas restored | |
| 6.2.3 | Handles legacy string format | Restore with string history | No errors, canvas restored | |
| 6.2.4 | Restores zoom level | Switch with different zoom | Zoom level restored | |

---

## 7. Redmine API Functions

### 7.1 Connection & Authentication
> Location: `lib/redmine-api.js`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1.1 | Valid credentials accepted | Test connection with valid API key | Success message | |
| 7.1.2 | Invalid credentials rejected | Test with wrong API key | Error message | |
| 7.1.3 | Invalid URL handled | Test with malformed URL | Error message | |
| 7.1.4 | Network error handled | Test with unreachable server | Timeout/error message | |

### 7.2 Data Fetching

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.2.1 | Fetch projects | Open project dropdown | Projects list loads | |
| 7.2.2 | Fetch trackers | Select project | Trackers load for project | |
| 7.2.3 | Fetch members | Select project | Assignees load for project | |
| 7.2.4 | Fetch priorities | Open priority dropdown | Priorities list loads | |
| 7.2.5 | Fetch categories | Select project | Categories load | |
| 7.2.6 | Fetch versions | Select project | Versions load | |

---

## 8. Utility Functions

### 8.1 Data Sanitization
> Location: `lib/utils.js` or inline

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1.1 | Unicode sanitization | Submit with emojis | Emojis removed/converted | |
| 8.1.2 | Smart quotes converted | Submit with smart quotes | Converted to straight quotes | |
| 8.1.3 | Sensitive data removed | Check HAR output | API keys/passwords redacted | |

---

## Test Summary

| Section | Total | Pass | Fail | Skip |
|---------|-------|------|------|------|
| State Management | 22 | | | |
| Annotation Operations | 13 | | | |
| Crop Operations | 10 | | | |
| Zoom Operations | 6 | | | |
| Drawing Tools | 12 | | | |
| State Persistence | 6 | | | |
| Redmine API | 10 | | | |
| Utility Functions | 3 | | | |
| **TOTAL** | **82** | | | |

---

## Notes & Issues Found

| # | Issue Description | Severity | Test Case |
|---|-------------------|----------|-----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
