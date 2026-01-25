# Full Regression Test - Complete Feature Verification

> **Purpose**: Comprehensive testing of all features before major releases
> **When to run**: Before version releases, after major refactoring
> **Time**: ~45-60 minutes

---

## Test Session Info

| Field | Value |
|-------|-------|
| **Date** | |
| **Tester** | |
| **Version** | |
| **Branch** | |
| **Browser** | Chrome v___ |
| **OS** | |
| **Result** | PASS / FAIL |

---

## Pre-Requisites

- [ ] Clean Chrome profile (or cleared extension data)
- [ ] Extension loaded in Developer mode
- [ ] Redmine server accessible
- [ ] Valid Redmine API key available
- [ ] Multiple browser tabs open for testing
- [ ] Test webpage with console errors available
- [ ] Test webpage with network requests available

---

# SECTION 1: EXTENSION POPUP

## 1.1 Popup Basic Functionality

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 1.1.1 | Extension icon click | Click extension icon in toolbar | Popup window opens | |
| 1.1.2 | Popup title display | Observe popup header | Shows "Cred Issue Reporter" | |
| 1.1.3 | Settings button | Click gear icon | Settings page opens in new tab | |
| 1.1.4 | Popup close | Click outside popup | Popup closes | |
| 1.1.5 | Keyboard shortcut | Press Ctrl+Shift+B (Win) / Cmd+Shift+B (Mac) | Popup opens | |

## 1.2 Capture Options Display

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 1.2.1 | Screenshot card visible | Observe capture section | Screenshot capture card shown | |
| 1.2.2 | Video card visible | Observe capture section | Video recording card shown | |
| 1.2.3 | Capture buttons accessible | Check all buttons | All buttons clickable | |

---

# SECTION 2: SCREENSHOT CAPTURE

## 2.1 Current Tab Capture

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 2.1.1 | Capture button works | Click "Capture Current Tab" | Screenshot captured | |
| 2.1.2 | Captures visible viewport | Capture page with scroll | Only visible area captured | |
| 2.1.3 | Success message | After capture | "Screenshot captured successfully!" shown | |
| 2.1.4 | Auto-opens annotation | After capture | Annotation page opens in new tab | |
| 2.1.5 | Image quality | Inspect captured image | Clear, readable image | |

## 2.2 Display Picker Capture

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 2.2.1 | Picker opens | Click "Choose What to Capture" | Browser display picker shown | |
| 2.2.2 | Select current tab | Choose "Current tab" option | Tab captured | |
| 2.2.3 | Select browser window | Choose window option | Window captured | |
| 2.2.4 | Select screen | Choose screen option | Screen captured | |
| 2.2.5 | Cancel picker | Click Cancel in picker | Returns to popup, no error | |

## 2.3 Multi-Screenshot Support

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 2.3.1 | Capture additional | Click "Capture Screenshot" on annotation page | New screenshot added | |
| 2.3.2 | Unique IDs | Capture 3 screenshots | Each has unique ID/name | |
| 2.3.3 | Screenshot list | After multiple captures | Thumbnail list visible | |
| 2.3.4 | Switch screenshots | Click different thumbnail | Canvas shows selected screenshot | |
| 2.3.5 | Annotations preserved | Switch between screenshots | Each keeps its own annotations | |
| 2.3.6 | Delete screenshot | Click X on thumbnail | Screenshot removed from list | |

---

# SECTION 3: VIDEO RECORDING

## 3.1 Recording Initiation

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 3.1.1 | Start recording button | Click "Start Video Recording" | Display picker opens | |
| 3.1.2 | Select tab to record | Choose "This tab" | Recording starts | |
| 3.1.3 | Select window | Choose browser window | Recording starts | |
| 3.1.4 | Select screen | Choose screen | Recording starts | |
| 3.1.5 | Status message | After recording starts | "Recording started!" shown | |
| 3.1.6 | Popup auto-close | After starting | Popup closes automatically | |

## 3.2 Recording Controls

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 3.2.1 | Recording overlay | While recording | Toolbar/indicator visible | |
| 3.2.2 | Timer display | While recording | Elapsed time shown | |
| 3.2.3 | Stop button | Click "Stop Sharing" | Recording stops | |
| 3.2.4 | ESC to stop | Press Escape key | Recording stops | |
| 3.2.5 | Keyboard shortcut stop | Press Ctrl+Shift+S | Recording stops | |
| 3.2.6 | Browser stop sharing | Use browser's stop button | Recording stops properly | |

## 3.3 Video in Submission

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 3.3.1 | Video in annotation page | After recording | Video visible/playable | |
| 3.3.2 | Video preview | Click play | Video plays correctly | |
| 3.3.3 | Video in review modal | Open review | Video shown in Media tab | |

---

# SECTION 4: ANNOTATION TOOLS

## 4.1 Pen Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.1.1 | Select pen tool | Click pen button | Pen tool active (highlighted) | |
| 4.1.2 | Draw freehand line | Click and drag on canvas | Line follows cursor | |
| 4.1.3 | Multiple strokes | Draw several lines | All lines visible | |
| 4.1.4 | Color applies | Change color, draw | New stroke uses new color | |
| 4.1.5 | Width applies | Change width, draw | New stroke uses new width | |

## 4.2 Rectangle Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.2.1 | Select rectangle | Click rectangle button | Tool active | |
| 4.2.2 | Draw rectangle | Click and drag | Rectangle appears | |
| 4.2.3 | Preview while drawing | Observe during drag | Shape previews while dragging | |
| 4.2.4 | Final shape | Release mouse | Rectangle finalized | |
| 4.2.5 | Negative dimensions | Draw right-to-left/bottom-to-top | Rectangle drawn correctly | |

## 4.3 Circle Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.3.1 | Select circle | Click circle button | Tool active | |
| 4.3.2 | Draw circle | Click and drag | Circle appears | |
| 4.3.3 | Radius by distance | Drag further | Circle gets larger | |
| 4.3.4 | Color and width | Draw with settings | Correct color and thickness | |

## 4.4 Arrow Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.4.1 | Select arrow | Click arrow button | Tool active | |
| 4.4.2 | Draw arrow | Click and drag | Arrow with head appears | |
| 4.4.3 | Direction | Draw in various directions | Arrow points correctly | |
| 4.4.4 | Arrowhead visible | Inspect arrow end | Arrowhead clearly visible | |

## 4.5 Text Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.5.1 | Select text | Click T button | Tool active | |
| 4.5.2 | Click to add | Click on canvas | Text input appears | |
| 4.5.3 | Type text | Enter "Test annotation" | Text visible in input | |
| 4.5.4 | Submit with Enter | Press Enter | Text added to canvas | |
| 4.5.5 | Cancel with Escape | Press Escape | Input closed, no text added | |
| 4.5.6 | Text positioning | Click different locations | Text at click position | |
| 4.5.7 | Font size | Change line width, add text | Text size changes | |

## 4.6 Blackout Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.6.1 | Select blackout | Click blackout button | Tool active | |
| 4.6.2 | Draw blackout | Click and drag | Black rectangle appears | |
| 4.6.3 | Covers content | Draw over text/image | Content hidden | |
| 4.6.4 | Multiple blackouts | Draw several | All visible, overlapping OK | |

## 4.7 Tool Settings

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 4.7.1 | Color picker opens | Click color button | Color palette shown | |
| 4.7.2 | Select color | Pick blue | Color button updates | |
| 4.7.3 | Width dropdown | Open width selector | Options 1-10px shown | |
| 4.7.4 | Select width | Choose 5px | Width value updates | |
| 4.7.5 | Default values | New page load | Red color, 3px width | |

---

# SECTION 5: ANNOTATION EDITING

## 5.1 Move/Select Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 5.1.1 | Select move tool | Click move button | Tool active, cursor changes | |
| 5.1.2 | Select annotation | Click on shape | Blue dashed box appears | |
| 5.1.3 | Deselect | Click empty area | Selection removed | |
| 5.1.4 | Drag annotation | Click and drag selected | Shape moves with cursor | |
| 5.1.5 | Release position | Release mouse | Shape stays at new position | |
| 5.1.6 | Move pen stroke | Select and move pen drawing | All points move together | |
| 5.1.7 | Move text | Select and move text | Text moves correctly | |
| 5.1.8 | Move after crop | Crop, then move shape | NO duplicate created | |

## 5.2 Delete Annotation

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 5.2.1 | Delete with Delete key | Select shape, press Delete | Shape removed | |
| 5.2.2 | Delete with Backspace | Select shape, press Backspace | Shape removed | |
| 5.2.3 | No selection delete | Press Delete with nothing selected | No error | |
| 5.2.4 | Delete saves state | Delete shape, check undo | Undo available | |

## 5.3 Undo/Redo

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 5.3.1 | Undo button | Draw shape, click Undo | Shape removed | |
| 5.3.2 | Redo button | Undo, click Redo | Shape restored | |
| 5.3.3 | Multiple undo | Draw 5 shapes, undo 5x | All shapes removed | |
| 5.3.4 | Multiple redo | Redo 5x | All shapes restored | |
| 5.3.5 | Undo at start | Click Undo on fresh canvas | No change, no error | |
| 5.3.6 | Redo at end | Click Redo without undo | No change, no error | |
| 5.3.7 | Undo move | Move shape, undo | Shape at original position | |
| 5.3.8 | Undo delete | Delete shape, undo | Shape restored | |
| 5.3.9 | Undo crop | Crop image, undo | Original size/annotations restored | |
| 5.3.10 | Redo after new action | Undo, draw new, try redo | Redo does nothing | |
| 5.3.11 | State consistency | Undo/redo multiple times | Annotations match canvas | |

## 5.4 Clear All

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 5.4.1 | Clear button | Draw shapes, click Clear | All shapes removed | |
| 5.4.2 | Canvas shows image | After clear | Original screenshot visible | |
| 5.4.3 | Clear confirmation | Click Clear | Confirmation dialog (if any) | |

---

# SECTION 6: CROP & ZOOM

## 6.1 Crop Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 6.1.1 | Select crop | Click crop button | Crop mode active | |
| 6.1.2 | Draw selection | Click and drag | Crop overlay appears | |
| 6.1.3 | Selection visible | During drag | Highlighted area visible | |
| 6.1.4 | Apply button | After selection | "Apply Crop" button shown | |
| 6.1.5 | Cancel button | After selection | "Cancel" button shown | |
| 6.1.6 | Apply crop | Click Apply | Image cropped to selection | |
| 6.1.7 | Cancel crop | Click Cancel | Original image restored | |
| 6.1.8 | Annotations adjusted | Crop with shapes | Shapes move with crop area | |
| 6.1.9 | Annotations filtered | Crop excluding shapes | Outside shapes removed | |
| 6.1.10 | Minimum size | Select < 10px area | Error message shown | |
| 6.1.11 | Undo crop | Crop, then undo | Full image and shapes restored | |
| 6.1.12 | No duplicates after crop | Crop, move shape | Single shape, no duplicate | |

## 6.2 Zoom Controls

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 6.2.1 | Zoom in button | Click "+ Zoom In" | Canvas enlarges | |
| 6.2.2 | Zoom out button | Click "- Zoom Out" | Canvas shrinks | |
| 6.2.3 | Reset zoom button | Click "Reset Zoom" | Returns to 100% | |
| 6.2.4 | Zoom level display | Zoom in/out | Percentage updates | |
| 6.2.5 | Keyboard Ctrl++ | Press Ctrl + Plus | Zooms in | |
| 6.2.6 | Keyboard Ctrl+- | Press Ctrl + Minus | Zooms out | |
| 6.2.7 | Keyboard Ctrl+0 | Press Ctrl + 0 | Resets zoom | |
| 6.2.8 | Max zoom limit | Zoom in repeatedly | Stops at 400% | |
| 6.2.9 | Min zoom limit | Zoom out repeatedly | Stops at 25% | |
| 6.2.10 | Scrollbars appear | Zoom past 100% | Container shows scrollbars | |

## 6.3 Pan Tool

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 6.3.1 | Select pan | Click pan button | Pan mode active | |
| 6.3.2 | Pan zoomed canvas | Zoom in, drag | Viewport moves | |
| 6.3.3 | Smooth panning | Drag around | Movement is smooth | |

---

# SECTION 7: ISSUE SUBMISSION FORM

## 7.1 Create New Issue Mode

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 7.1.1 | Default mode | Load report form | "Create New Issue" selected | |
| 7.1.2 | Project dropdown | Click project field | Projects from Redmine load | |
| 7.1.3 | Tracker dropdown | After project selected | Trackers load | |
| 7.1.4 | Subject field | Type in subject | Text accepted | |
| 7.1.5 | Description field | Type description | Multi-line text accepted | |
| 7.1.6 | Priority dropdown | Click priority | Priorities from Redmine load | |
| 7.1.7 | Assignee dropdown | Click assignee | Project members load | |
| 7.1.8 | Due date picker | Click due date | Date picker opens | |
| 7.1.9 | Category dropdown | Click category | Categories load (if any) | |
| 7.1.10 | Version dropdown | Click version | Versions load (if any) | |
| 7.1.11 | Required field validation | Submit without subject | Validation error shown | |

## 7.2 Add to Existing Issue Mode

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 7.2.1 | Select mode | Click "Add to Existing Issue" | Mode switches | |
| 7.2.2 | Issue search | Type issue number | Search results shown | |
| 7.2.3 | Select issue | Click on search result | Issue selected | |
| 7.2.4 | Issue preview | After selection | Issue details shown | |
| 7.2.5 | Note field | Required | Comment textarea shown | |
| 7.2.6 | Clear selection | Click X | Issue deselected | |

## 7.3 Technical Data Options

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 7.3.1 | Attach technical data | Check checkbox | Technical data will be included | |
| 7.3.2 | Multi-tab capture | Check checkbox | Tab selector appears | |
| 7.3.3 | Tab selection | Select additional tabs | Tabs checked in list | |
| 7.3.4 | Additional documents | Click file input | File picker opens | |
| 7.3.5 | Multiple files | Select 3 files | All files listed | |
| 7.3.6 | Remove file | Click X on file | File removed from list | |

---

# SECTION 8: REVIEW MODAL

## 8.1 Modal Navigation

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 8.1.1 | Modal opens | Click Review/Submit | Modal displayed | |
| 8.1.2 | Issue Details tab | Click tab | Form fields shown | |
| 8.1.3 | Media tab | Click tab | Screenshots/videos shown | |
| 8.1.4 | Page Info tab | Click tab | Page information shown | |
| 8.1.5 | Network tab | Click tab | Network requests shown | |
| 8.1.6 | Console tab | Click tab | Console logs shown | |
| 8.1.7 | Documents tab | Click tab | Attached files shown | |

## 8.2 Review Content

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 8.2.1 | Fields editable | Try editing in modal | All fields can be changed | |
| 8.2.2 | Screenshot preview | Check Media tab | Annotated image visible | |
| 8.2.3 | Video preview | Check Media tab | Video player works | |
| 8.2.4 | Network count | Check Network tab | Request count shown | |
| 8.2.5 | Console log display | Check Console tab | Logs formatted correctly | |
| 8.2.6 | Document list | Check Documents tab | File names shown | |

## 8.3 Submission

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 8.3.1 | Cancel button | Click Cancel | Modal closes, no submission | |
| 8.3.2 | Submit button | Click Confirm & Submit | Submission starts | |
| 8.3.3 | Loading state | During submission | Spinner shown | |
| 8.3.4 | Success message | After successful submit | Success with issue link | |
| 8.3.5 | Issue link works | Click issue link | Opens issue in Redmine | |
| 8.3.6 | Error handling | Force error (disconnect) | Error message shown | |

---

# SECTION 9: SETTINGS PAGE

## 9.1 Redmine Configuration

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 9.1.1 | URL field | Enter Redmine URL | URL accepted | |
| 9.1.2 | API key field | Enter API key | Key accepted (masked) | |
| 9.1.3 | Test connection | Click Test | Success/failure message | |
| 9.1.4 | Invalid URL | Enter bad URL | Error message | |
| 9.1.5 | Invalid key | Enter wrong key | Authentication error | |

## 9.2 Default Values

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 9.2.1 | Default project | Select project | Saved and used in forms | |
| 9.2.2 | Default priority | Select priority | Saved and used in forms | |
| 9.2.3 | Default assignee | Select assignee | Saved and used in forms | |

## 9.3 Privacy Settings

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 9.3.1 | Network requests toggle | Uncheck | Network data not collected | |
| 9.3.2 | Console logs toggle | Uncheck | Console data not collected | |
| 9.3.3 | LocalStorage toggle | Uncheck | Storage data not collected | |
| 9.3.4 | Cookies toggle | Uncheck | Cookie data not collected | |
| 9.3.5 | Sanitize data toggle | Check | Sensitive data removed | |

## 9.4 Settings Persistence

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 9.4.1 | Save settings | Click Save | Success message | |
| 9.4.2 | Settings persist | Reload page | Settings still there | |
| 9.4.3 | Reset to defaults | Click Reset | Confirmation dialog | |
| 9.4.4 | Defaults restored | Confirm reset | All values reset | |

---

# SECTION 10: TECHNICAL DATA COLLECTION

## 10.1 Page Information

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 10.1.1 | URL captured | Check page info | Current URL shown | |
| 10.1.2 | Title captured | Check page info | Page title shown | |
| 10.1.3 | Browser info | Check page info | Chrome version, etc. | |
| 10.1.4 | Screen info | Check page info | Resolution shown | |

## 10.2 Network Requests

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 10.2.1 | Requests captured | Visit page with XHR | Requests listed | |
| 10.2.2 | Method shown | Check request | GET/POST shown | |
| 10.2.3 | Status shown | Check request | 200/404/etc. shown | |
| 10.2.4 | Failed requests | Force error | Marked as error | |
| 10.2.5 | HAR format | Check attachment | Valid HAR file | |

## 10.3 Console Logs

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 10.3.1 | Logs captured | Visit page with console output | Logs listed | |
| 10.3.2 | Error type | Check error log | Red, error icon | |
| 10.3.3 | Warning type | Check warn log | Orange, warning icon | |
| 10.3.4 | Info type | Check info log | Blue, info icon | |
| 10.3.5 | Stack traces | Check error | Stack trace expandable | |

---

# SECTION 11: HELP & DOCUMENTATION

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 11.1 | Help button | Click ? button | Help page opens | |
| 11.2 | Content readable | Read help page | All sections clear | |
| 11.3 | Shortcuts listed | Find shortcuts | All shortcuts documented | |

---

# SECTION 12: EDGE CASES

## 12.1 Error Handling

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 12.1.1 | Network error | Disconnect, submit | Error message shown | |
| 12.1.2 | Large screenshot | Capture 4K page | Handles without crash | |
| 12.1.3 | Many annotations | Draw 50+ shapes | Performance acceptable | |
| 12.1.4 | Empty submission | No screenshot, submit | Validation error | |

## 12.2 Browser Compatibility

| # | Test Case | Steps | Expected | Status |
|---|-----------|-------|----------|--------|
| 12.2.1 | Chrome stable | Test on Chrome | All features work | |
| 12.2.2 | Chrome beta | Test on Chrome Beta | All features work | |
| 12.2.3 | Edge Chromium | Test on Edge | All features work | |

---

# TEST SUMMARY

## Section Results

| Section | Total | Pass | Fail | Skip |
|---------|-------|------|------|------|
| 1. Extension Popup | 8 | | | |
| 2. Screenshot Capture | 14 | | | |
| 3. Video Recording | 15 | | | |
| 4. Annotation Tools | 28 | | | |
| 5. Annotation Editing | 22 | | | |
| 6. Crop & Zoom | 22 | | | |
| 7. Issue Submission Form | 18 | | | |
| 8. Review Modal | 15 | | | |
| 9. Settings Page | 17 | | | |
| 10. Technical Data | 14 | | | |
| 11. Help | 3 | | | |
| 12. Edge Cases | 7 | | | |
| **TOTAL** | **183** | | | |

---

## Overall Result

- [ ] **PASS** - All critical tests passed
- [ ] **CONDITIONAL PASS** - Minor issues, can release with known issues
- [ ] **FAIL** - Blocking issues found

---

## Issues Found

| # | Section | Test Case | Description | Severity | Status |
|---|---------|-----------|-------------|----------|--------|
| 1 | | | | Critical/High/Medium/Low | Open/Fixed |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

---

## Notes & Observations

```
(Add any additional observations, performance notes, or suggestions here)




```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| QA Lead | | | |
| Dev Lead | | | |
