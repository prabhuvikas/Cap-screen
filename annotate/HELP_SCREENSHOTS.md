# Help Guide Screenshots Documentation

This document describes the screenshots needed for the Cap Screen help guide to provide better user experience.

## Overview

The help guide (`help.html`) currently has placeholder sections marked with:
```html
<div class="screenshot-placeholder">
  <span>📸 Screenshot: [description]</span>
</div>
```

These should be replaced with actual screenshots to help users understand the features better.

## Required Screenshots

### 1. Extension Popup
**Location:** Getting Started section
**Description:** Extension popup showing capture options
**What to capture:** The browser extension popup with all three buttons visible (Capture Screenshot, Record Tab, Record Screen)
**Filename suggestion:** `popup-screenshot.png`

**How to replace:**
```html
<!-- Replace this: -->
<div class="screenshot-placeholder">
  <span>📸 Screenshot: Extension popup showing capture options</span>
</div>

<!-- With this: -->
<img src="screenshots/popup-screenshot.png" alt="Extension popup showing capture options" style="max-width: 100%; border-radius: 8px; border: 1px solid #e8eaed;">
```

### 2. Recording Toolbar
**Location:** Capturing Media section
**Description:** Recording toolbar showing timer and stop button
**What to capture:** The semi-transparent recording toolbar that appears in the top-right corner during recording
**Filename suggestion:** `recording-toolbar.png`

**How to replace:**
```html
<!-- Replace this: -->
<div class="screenshot-placeholder">
  <span>📸 Screenshot: Recording toolbar showing timer and stop button</span>
</div>

<!-- With this: -->
<img src="screenshots/recording-toolbar.png" alt="Recording toolbar" style="max-width: 100%; border-radius: 8px; border: 1px solid #e8eaed;">
```

### 3. Annotation Toolbar
**Location:** Annotations section - Customizing Annotations
**Description:** Annotation toolbar showing all tools and controls
**What to capture:** The bottom toolbar with all annotation tools visible, including the color picker and width dropdown
**Filename suggestion:** `annotation-toolbar.png`

**How to replace:**
```html
<!-- Replace this: -->
<div class="screenshot-placeholder">
  <span>📸 Screenshot: Annotation toolbar showing all tools and controls</span>
</div>

<!-- With this: -->
<img src="screenshots/annotation-toolbar.png" alt="Annotation toolbar with all tools" style="max-width: 100%; border-radius: 8px; border: 1px solid #e8eaed;">
```

## Screenshot Requirements

### Technical Specifications
- **Format:** PNG (for transparency support)
- **Quality:** High resolution, but optimized for web (<500KB each)
- **Size:** Recommended width: 800-1000px
- **Background:** Clean, uncluttered backgrounds preferred
- **Annotations:** May include arrows or highlights to point out key features

### Style Guidelines
1. **Consistent Theme:** Use the same browser/OS theme for all screenshots
2. **Clean State:** Remove personal information, bookmarks, or irrelevant browser extensions
3. **Focus:** Capture only the relevant UI element with minimal surrounding context
4. **Quality:** Use high-DPI displays if available for crisp screenshots

## Directory Structure

Create a `screenshots` directory in the `annotate` folder:

```
annotate/
├── help.html
├── help.css
├── screenshots/
│   ├── popup-screenshot.png
│   ├── recording-toolbar.png
│   └── annotation-toolbar.png
└── HELP_SCREENSHOTS.md (this file)
```

## How to Take Screenshots

### For Extension Popup:
1. Click the Cap Screen extension icon
2. Use your OS screenshot tool (Windows: Win+Shift+S, Mac: Cmd+Shift+4)
3. Capture the popup window
4. Save as `popup-screenshot.png`

### For Recording Toolbar:
1. Start a tab recording
2. Wait for the recording toolbar to appear
3. Hover over it to make it fully opaque
4. Use screenshot tool to capture just the toolbar
5. Save as `recording-toolbar.png`

### For Annotation Toolbar:
1. Open the annotation page with a screenshot
2. Make sure all tools are visible in the bottom toolbar
3. Use screenshot tool to capture the entire toolbar
4. Save as `annotation-toolbar.png`

## Alternative: Using Demo Content

If you prefer to use demo/placeholder images:
- Use tools like Figma or Sketch to create mockups
- Ensure they match the actual UI appearance
- Keep them simple and clear

## Integration Steps

1. Create `annotate/screenshots/` directory
2. Add screenshot files to the directory
3. Open `help.html` in a text editor
4. Find each `<div class="screenshot-placeholder">` section
5. Replace with `<img>` tag as shown in examples above
6. Test the help page by opening it in a browser

## Notes

- Screenshots are optional but highly recommended for better UX
- The help guide is fully functional without screenshots
- Placeholders are styled to be clearly visible if screenshots are not added
- Future enhancements could include animated GIFs for complex workflows
