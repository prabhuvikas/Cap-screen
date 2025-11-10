# Cred Issue Reporter Extension

A comprehensive Chrome extension for capturing, annotating, and reporting issues directly to Redmine with full technical context.

## Features

### Phase 1 - Core Features

- **Media Capture**
  - **Screenshot capture** with browser-native picker to choose what to capture:
    - Current tab
    - Browser window
    - Entire screen (all monitors)
    - Any other application window
  - **Video recording** with browser-native picker (same options)
  - High-quality PNG screenshots and WebM videos

- **Annotation Tools**
  - Freehand drawing/pen tool
  - Shapes (rectangle, circle, arrow)
  - Blackout/redaction tool (hide sensitive information)
  - Text annotations
  - Color picker
  - Adjustable line width
  - Undo/redo functionality
  - Clear all annotations

- **Page Information Collection**
  - Current URL and title
  - Browser and platform information
  - Viewport and screen resolution
  - Timestamp
  - Page metadata
  - Performance metrics

- **Network Monitoring**
  - Capture all HTTP/HTTPS requests
  - Request and response headers
  - Request methods and types
  - HTTP status codes
  - Failed requests tracking
  - Request timing information

- **Console Logs**
  - Capture console.log, console.warn, console.error, console.info
  - Error stack traces
  - Unhandled promise rejections
  - Timestamps and URLs for each log

- **Redmine Integration**
  - API key configuration
  - Test connection functionality
  - Project selection
  - Tracker selection (Bug, Feature, Support)
  - Priority levels
  - Assignee selection
  - Category selection
  - Version/milestone selection
  - Automatic media attachment (screenshots and videos)
  - Technical data JSON attachment
  - Direct issue creation
  - Issue link on success

- **Video Recording**
  - Browser-native screen picker to choose what to record:
    - Current tab
    - Browser window
    - Entire screen (all monitors)
    - Any other application window
  - Optional audio capture (system audio)
  - Stop recording using browser's "Stop Sharing" button
  - WebM format with VP9 codec at 1080p@30fps
  - Automatic attachment to issue reports
  - Preview video before submission

- **Privacy Controls**
  - Blackout/redaction tool to hide sensitive areas in screenshots
  - Toggle network request collection
  - Toggle console log collection
  - Toggle localStorage collection
  - Toggle cookie collection
  - Automatic sensitive data sanitization
  - Pre-submission data review modal
  - Tab-based interface to inspect all data before sending

- **User Interface**
  - Minimalistic and subtle design
  - Clean, modern aesthetics
  - Tab-based data review before submission
  - Complete transparency on what data is shared
  - No data sent without explicit user confirmation

## Installation

### Option 1: Load Unpacked Extension (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory (the folder containing `manifest.json`)

### Option 2: Install from Chrome Web Store (When Published)

*Coming soon*

## Configuration

### 1. Configure Redmine Integration

1. Click the extension icon in Chrome toolbar
2. Click the settings icon (⚙️) or navigate to extension options
3. Enter your Redmine server URL (e.g., `https://redmine.example.com`)
4. Enter your Redmine API key
   - Find your API key in Redmine: **My account → API access key**
5. Click "Test Connection" to verify credentials
6. (Optional) Select a default project
7. Configure privacy settings as needed
8. Click "Save Settings"

### 2. Privacy Settings

Configure what information to include in issue reports:

- **Include Network Requests**: Capture all HTTP/HTTPS requests made by the page
- **Include Console Logs**: Capture console output (logs, warnings, errors)
- **Include LocalStorage Data**: Capture localStorage contents
- **Include Cookies**: Capture cookie data
- **Sanitize Sensitive Data**: Automatically redact API keys, tokens, and passwords

### 3. Screenshot Settings

- **Screenshot Quality**: Choose between high, medium, or low quality
- **Auto Full Page Screenshot**: Automatically capture full page instead of viewport

## Usage

### Creating an Issue Report

1. **Navigate to the page** where you found the bug

2. **Open the extension**
   - Click the Issue Reporter icon in Chrome toolbar, or
   - Use keyboard shortcut: `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac)

3. **Capture Media**
   - **Screenshot**: Click "📸 Capture Screenshot" and browser will show a picker to choose what to capture:
     - Current tab
     - Browser window
     - Entire screen (all monitors)
     - Any other application window
   - **Video**: Click "🎥 Start Video Recording" and browser will show the same picker

4. **Annotate Media**

   **For Screenshots**:
   - Browser shows native picker - choose what to capture (tab, window, or screen)
   - Screenshot is taken immediately after selection
   - Annotation page opens automatically
   - Use pen tool to draw freehand
   - Add shapes (rectangle, circle, arrow) to highlight issues
   - Use blackout tool to hide sensitive information (passwords, API keys, personal data)
   - Add text annotations
   - Change colors and line width as needed
   - Use undo/redo to refine annotations
   - Click "Continue to Report" when ready

   **For Video Recordings**:
   - Browser shows native picker - choose what to capture (tab, window, or screen)
   - Optionally check "Share audio" to include system audio
   - Recording begins immediately after selection
   - Stop by clicking browser's "Stop Sharing" button (usually in address bar or notification)
   - Video automatically opens in annotation page for preview

5. **Fill Issue Details**
   - **Project**: Select target Redmine project
   - **Tracker**: Choose Bug, Feature, or Support
   - **Subject**: Brief description of the issue
   - **Description**: Detailed explanation
   - **Priority**: Set issue priority
   - **Assignee**: (Optional) Assign to team member
   - **Category**: (Optional) Select issue category
   - **Target Version**: (Optional) Select milestone/version
   - **Steps to Reproduce**: List steps to reproduce the bug
   - **Expected Behavior**: What should happen
   - **Actual Behavior**: What actually happened
   - **Attach Technical Data**: Include page info, network requests, and console logs

6. **Review & Submit**
   - Click "Submit Issue Report"
   - Review modal will appear with all data in tabs:
     - **Issue Details**: Your issue report details
     - **Media**: Preview of annotated screenshots and videos
     - **Page Info**: Browser and page information
     - **Network**: All captured network requests
     - **Console**: All captured console logs
   - Review all data carefully
   - Click "Confirm & Submit" to proceed or "Cancel" to go back
   - All media (screenshots and videos) will be attached automatically
   - Issue link will be displayed on success

## File Structure

```
chrome-bug-reporter/
├── manifest.json                 # Extension configuration
├── background/
│   └── background.js            # Service worker for network monitoring
├── content/
│   ├── content.js               # Page information collection
│   ├── screenshot.js            # Screenshot capture functionality
│   └── annotator.js             # Annotation tools
├── popup/
│   ├── popup.html               # Main extension popup UI
│   ├── popup.css                # Popup styles
│   └── popup.js                 # Popup functionality
├── options/
│   ├── options.html             # Settings page
│   ├── options.css              # Settings styles
│   └── options.js               # Settings functionality
├── lib/
│   ├── redmine-api.js           # Redmine API integration
│   └── utils.js                 # Utility functions
├── assets/
│   ├── icons/                   # Extension icons
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── generate-icons.py        # Icon generator script
│   └── icon-generator.html      # Icon generator HTML
└── README.md                    # This file
```

## Technical Details

### Permissions

- `activeTab`: Access current tab information
- `storage`: Store settings and preferences
- `tabs`: Capture screenshots and tab information
- `webRequest`: Monitor network requests
- `debugger`: Advanced network monitoring
- `scripting`: Inject content scripts
- `<all_urls>`: Access all websites for bug reporting

### APIs Used

- **Chrome Extension APIs**: tabs, storage, webRequest, scripting
- **Redmine REST API**: Issues, Projects, Trackers, Priorities, Uploads
- **Canvas API**: Screenshot annotation
- **Fetch API**: HTTP requests to Redmine

### Data Storage

- Settings are stored using `chrome.storage.sync` (synced across devices)
- Network requests and console logs are stored temporarily in memory
- Data is cleared after 1 hour of inactivity

## Troubleshooting

### Connection Failed

- Verify Redmine server URL is correct and accessible
- Ensure API key is valid and has necessary permissions
- Check if Redmine REST API is enabled
- Verify network connectivity

### Screenshots Not Capturing

- Ensure extension has permission to access the current tab
- Try reloading the page and the extension
- Check browser console for errors

### Network Requests Not Captured

- Network monitoring starts when the page loads
- Reload the page after installing the extension
- Check if privacy settings have network requests enabled

### Technical Data Not Attached

- Ensure "Attach Technical Data" checkbox is enabled
- Check file size limits in Redmine configuration
- Verify API key has upload permissions

### Screenshot Capture Issues

- **Picker doesn't appear**: Check browser permissions for screen sharing
- **Permission denied**: Click "Capture Screenshot" again and grant permission when browser asks
- **Screenshot is blank or black**: Some applications/windows may not allow capture due to security restrictions
- **Screenshot quality**: Screenshots are captured at source resolution (up to 1920x1080 by default)
- **Annotation page doesn't open**: Check for popup blockers or browser security settings

### Video Recording Issues

- **Picker doesn't appear**: Check browser permissions for screen sharing
- **Permission denied**: Click "Start Video Recording" again and grant permission when browser asks
- **Can't stop recording**: Click the browser's "Stop Sharing" button in the address bar or system notification area
- **No audio**: Make sure to check the "Share audio" checkbox in the picker before starting
- **Recording doesn't start**: Try closing and reopening the extension popup, then try again
- **Annotation page doesn't open**: Large recordings may take time to process - please wait a few seconds
- **Recording failed to save**: Check available disk space and try again with a shorter recording
- **Browser support**: Requires modern browser with MediaRecorder and getDisplayMedia API support (Chrome 72+, Edge 79+)

## Development

### Building Custom Icons

To create custom icons, you can use either:

1. **Python script** (requires Pillow):
   ```bash
   cd assets
   pip install Pillow
   python3 generate-icons.py
   ```

2. **HTML generator**:
   ```bash
   cd assets
   open icon-generator.html
   ```

### Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the reload icon on the Issue Reporter extension
4. Test the functionality

## Roadmap

### Phase 2 - Enhanced Features (Future)

- Export bug reports as PDF/JSON
- Multiple bug tracking integrations (Jira, GitHub Issues, Linear)
- Session recording and replay
- Performance monitoring (Core Web Vitals)
- Dark theme
- Report templates
- Saved drafts
- Bulk screenshot annotation
- Custom field mapping

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Credits

Developed with Chrome Extension Manifest V3 and Redmine REST API.

---

**Version**: 1.0.0
**Author**: Cred Issue Reporter Team
**Last Updated**: 2025-10-21
