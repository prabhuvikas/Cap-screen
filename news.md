# 🚀 Cred Issue Reporter - Latest Updates

---

## 🔧 Version 2.0.1 - Bug Fix Release

**Release Date:** December 21, 2025
**Version:** 2.0.1

### What's Fixed

#### Critical Bug Fix: Technical Data Attachment Control

We've resolved a critical issue where the "Attach technical data" checkbox wasn't working as expected.

**The Problem:**
- When you unchecked "Attach technical data (page info, network requests, console logs)", the HAR files and console log files were still being attached to your bug reports
- Only the technical-data JSON file was being controlled by the checkbox

**The Solution:**
- The checkbox now properly controls ALL technical data attachments:
  - ✅ technical-data-*.json file
  - ✅ network-requests-*.har files
  - ✅ console-logs-*.txt files
- When unchecked, NO technical data will be attached to your reports
- When checked, ALL technical data will be included as before

**Why This Matters:**
- Better privacy control - you decide exactly what gets shared
- Smaller attachments when technical data isn't needed
- Consistent behavior across the extension

This fix applies to both the main popup workflow and the annotate page workflow.

---

---

## 🎉 Version 2.0.0 - Major Feature Update

**Release Date:** December 16, 2025
**Version:** 2.0.0

### What's New

#### Update Existing Issues
- Add notes and attachments to existing Redmine issues
- Search issues by number or subject
- Filter issues by project
- Preview selected issue before updating

#### Enhanced Storage Management
- IndexedDB support for large video files (>10MB)
- Optimized network request storage
- Better quota management and cleanup

#### Improved Validation
- Enhanced error handling and validation
- Better feedback during submission
- Improved project filtering

---

---

## 🚀 Version 1.0.0 - Initial Release

**Release Date:** December 7, 2025
**Version:** 1.0.0

---

## What is Cred Issue Reporter?

Cred Issue Reporter is a powerful Chrome extension that streamlines the bug reporting process by enabling you to capture, annotate, and submit detailed issue reports directly to Redmine - all without leaving your browser.

### Why Use It?

- **Save Time**: No more manual screenshot tools, copy-pasting URLs, or gathering technical details
- **Comprehensive Reports**: Automatically captures page info, network requests, console logs, and more
- **Visual Communication**: Annotate screenshots and videos to clearly highlight issues
- **Privacy-First**: Full control over what data gets shared with review before submission
- **Seamless Integration**: Direct Redmine integration - create issues in seconds

---

## Key Features

### Flexible Media Capture
- **Quick Screenshot**: Instant capture of current tab
- **Advanced Screenshot**: Choose what to capture (tab, window, entire screen, other applications)
- **Video Recording**: Record screen activity with optional audio to demonstrate complex issues

### Powerful Annotation Tools
- Freehand drawing/pen tool
- Shapes (rectangle, circle, arrow) to highlight areas
- Blackout tool to hide sensitive information
- Text annotations
- Customizable colors and line widths
- Undo/redo support

### Automatic Technical Data Collection
- Current URL and page title
- Browser and platform information
- Viewport and screen resolution
- Network requests with headers and status codes
- Console logs (errors, warnings, info)
- Performance metrics
- Timestamps

### Privacy Controls
- Toggle network request collection on/off
- Toggle console log collection on/off
- Toggle localStorage and cookie collection
- Automatic sensitive data sanitization
- Pre-submission review modal with tab-based interface
- Complete transparency - see exactly what data will be sent

### Direct Redmine Integration
- Select project, tracker, priority, assignee
- Add categories and target versions
- All media automatically attached
- Technical data exported as JSON
- Get direct link to created issue

---

## Installation Instructions

### Step 1: Download the Extension

Download the extension package: **[Cap-screen.zip](https://drive.google.com/file/d/1THJl2k5pf9NTVrRESVFL5wVGhlJ3sKaG/view?usp=sharing)**

### Step 2: Install in Chrome

1. Open Google Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** toggle in the top-right corner
4. Click **"Load unpacked"** button
5. Extract the **Cap-screen.zip** file to a permanent location on your computer
6. Select the extracted folder (the one containing `manifest.json`)
7. The extension icon should now appear in your Chrome toolbar

### Step 3: Configure Redmine Integration

1. Click the **Cred Issue Reporter** icon in your Chrome toolbar
2. Click the **settings icon** or navigate to extension options
3. Enter your **Redmine server URL** (`https://support.credenceanalytics.com/`)
4. Enter your **Redmine API key**
   - To find your API key: Log in to Redmine → **My account** → **API access key** (on the right side)
5. Click **"Test Connection"** to verify your credentials
6. (Optional) Select a default project
7. Configure privacy settings based on your needs
8. Click **"Save Settings"**

---

## How to Use

### Creating an Issue Report

1. **Navigate** to the page where you found the bug

2. **Open the extension**
   - Click the Cred Issue Reporter icon, or
   - Use keyboard shortcut: `Ctrl+Shift+B` (Windows) or `Cmd+Shift+B` (Mac)

3. **Capture media**
   - **Quick Capture**: Click "Capture Current Tab" for instant screenshot
   - **Advanced Capture**: Click "Choose What to Capture" to select tab/window/screen
   - **Video**: Click "Start Video Recording" to record screen activity

4. **Annotate** (for screenshots)
   - Use pen tool to draw and highlight
   - Add shapes (arrows, circles, rectangles)
   - Use blackout tool to hide passwords or sensitive data
   - Add text annotations
   - Click "Continue to Report" when done

5. **Fill issue details**
   - **Project**: Select the target Redmine project
   - **Tracker**: Choose Bug, Feature, or Support
   - **Subject**: Brief title for the issue
   - **Description**: Detailed explanation
   - **Priority**: Set appropriate priority level
   - **Assignee**: (Optional) Assign to team member
   - **Steps to Reproduce**: List steps to reproduce the issue
   - **Expected vs Actual Behavior**: Describe what should happen vs what actually happens

6. **Review and submit**
   - Click "Submit Issue Report"
   - Review all data in the preview modal (tabs for Issue Details, Media, Page Info, Network, Console)
   - Click "Confirm & Submit" to create the issue
   - Copy the issue link from the success message

---

## Best Practices

### For Better Bug Reports

1. **Use the blackout tool** to hide any sensitive information (passwords, API keys, personal data)
2. **Add annotations** to clearly mark the problematic area
3. **Record videos** for issues that involve interactions or animations
4. **Include steps to reproduce** - this helps developers fix issues faster
5. **Review technical data** before submitting to ensure no sensitive information is included

### Privacy & Security

- The extension only collects data when you explicitly trigger it
- All data is reviewed before submission in the preview modal
- Enable "Sanitize Sensitive Data" in settings to auto-redact common patterns (API keys, tokens)
- Use privacy toggles to exclude network/console/storage data if not needed
- The blackout tool permanently redacts areas in screenshots

---

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Issue Reporter | `Ctrl+Shift+B` | `Cmd+Shift+B` |

---

## Troubleshooting

### Can't Connect to Redmine
- Verify server URL is correct and accessible from your network
- Ensure API key is valid (test in Redmine: My account → API access key)
- Check that Redmine REST API is enabled (admin setting)

### Screenshots Not Working
- Grant screen capture permissions when browser prompts
- Some protected content (e.g., Netflix, DRM content) cannot be captured due to browser security
- Try reloading the extension at `chrome://extensions/`

### Video Recording Issues
- Click the browser's "Stop Sharing" button (in address bar) to stop recording
- Check "Share audio" in the picker if you need system audio
- Large recordings may take a few seconds to process - please wait

### Technical Data Not Attached
- Ensure "Attach Technical Data" checkbox is enabled before submission
- Check file size limits in Redmine configuration
- Verify your API key has upload permissions in Redmine

---

## Support & Feedback

### Need Help?
- Report issues at: https://support.credenceanalytics.com/projects/redmine_tracker/issues

### Feature Requests
We're actively improving Cred Issue Reporter! Share your ideas and suggestions through the support channels above.

---

## Technical Requirements

- **Browser**: Google Chrome 72+ or Microsoft Edge 79+
- **Redmine**: REST API enabled with valid API key
- **Permissions**: The extension requires permissions for screen capture, storage, and network monitoring

---


## Get Started Today!

Download **[Cap-screen.zip](https://drive.google.com/file/d/1THJl2k5pf9NTVrRESVFL5wVGhlJ3sKaG/view?usp=sharing)**, follow the installation steps above, and start creating detailed, professional bug reports in seconds!

**Questions?** Reach out to the development team or IT support.

---

*Cred Issue Reporter v1.0.0 - Making bug reporting simple, comprehensive, and efficient.*
