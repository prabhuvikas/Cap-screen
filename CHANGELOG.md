# Changelog

All notable changes to Cred Issue Reporter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.5] - January 25, 2026

### Removed
- Remove zip file from git commit in release workflow
  - Updated the release workflow to exclude the zip file from the git commit when releasing a new version.
  - Removed  from the  command in the release workflow
  - The commit now only stages  and  files
  - The zip file (build artifact) should not be committed to the repository. Build artifacts are typically excluded from version control and should be managed separately (e.g., uploaded to releases, stored in artifact repositories, etc.). This change ensures only the necessary version control files are committed during the release process.

_Merged PR #38 by @prabhuvikas_

---



## [2.1.4] - January 25, 2026

### Changes
- Add pre-check job to conditionally skip releases
  - Added a new  job to the release workflow that determines whether a release should proceed based on PR labels and changed files. This prevents unnecessary releases for documentation-only or CI configuration changes.
  - **New  job**: Runs before the  stage and outputs a  flag
  - Checks for  label on the merged PR
  - Detects if only CI/docs files were changed (.github/**, *.md, .gitignore, .editorconfig, LICENSE)
  - Skips release if either condition is met

_Merged PR #35 by @prabhuvikas_

---



## [2.1.3] - January 24, 2026

### Changes
- Refactor release workflow into 4 sequential stages
  - Restructured the monolithic release workflow into a modular 4-stage pipeline with clear separation of concerns, improved artifact handling, and better visibility into each phase.
  - **Stage 1 (Prepare)**: Version bump type detection only
  - Outputs version type for downstream stages
  - Minimal permissions (pull-requests: read)
  - **Stage 2 (Build)**: Version bumping, changelog generation, and extension build

_Merged PR #34 by @prabhuvikas_

---



## [2.1.2] - January 24, 2026

### Changes
- Handle 204 No Content responses in Redmine news creation
  - Updated the Redmine news creation script to properly handle both 201 (Created) and 204 (No Content) HTTP response codes as successful outcomes, with improved handling of empty response bodies.
  - Extended success status code check to accept both  and  responses
  - Added conditional logic to safely parse response data only when present
  - Implemented fallback to success message when response body is empty or unparseable
  - Added clarifying comment documenting the meaning of each success status code

_Merged PR #33 by @prabhuvikas_

---



## [2.1.1] - January 23, 2026

### Added
- **Due Date Field**: Automatic due date assignment for all Redmine issues
  - Due date field appears in the issue creation form (between Assignee and Category)
  - Automatically pre-filled with today's date for convenience
  - Fully editable in both main form and review modal before submission
  - Required field with proper validation
  - Sent to Redmine API with all issue data

### Improved
- **Developer Experience**: Added comprehensive Chrome extension cache troubleshooting tools
  - Windows cache clearing scripts (`.bat` and `.ps1`)
  - Linux/Mac cache clearing script (`.sh`)
  - Comprehensive troubleshooting documentation
  - Windows-specific cache fix guide

### Fixed
- CSS styling for date input field to match other form controls
- Content Security Policy violations in debug scripts
- Cleaned up unused code from popup files

### Changed
- Updated version display across all pages to v2.1.1
- Updated help documentation version

---

## [2.0.1] - December 21, 2025

### Fixed
- **Technical Data Attachment**: Fixed critical bug where HAR files and console logs were being attached even when "Attach technical data" checkbox was unchecked
  - HAR (network requests) files now properly respect the checkbox state
  - Console log files now properly respect the checkbox state
  - All technical data types (technical-data JSON, HAR files, console logs) are now controlled by the single checkbox
  - Affects both annotate.js and popup.js submission flows

---

## [2.0.0] - December 16, 2025

### Added
- **Issue Management Enhancement**: Ability to update existing Redmine issues with notes and attachments
- **Project Filtering**: Intelligent project filter for issue selection with validation
- **Storage Optimization**: IndexedDB support for handling large video files exceeding 10MB
- **Enhanced Validation**: Improved validation logic for bug report submission with better error messages

### Fixed
- **Storage Quota Management**:
  - Fixed session storage quota exceeded errors by optimizing network request accumulation
  - Implemented per-tab request limits (maximum 100 requests per tab)
  - Added individual request age checking (30-minute retention limit)
  - Improved cleanup intervals from 5 minutes to 1 minute for faster quota recovery
  - Added aggressive quota recovery (reduces to 10 requests/tab when quota exceeded)
  - Optimized request body storage (only stores bodies under 1KB)
  - Added idle tab cleanup (removes tabs with no activity for 5+ minutes)

- **Video Handling Improvements**:
  - Fixed full screen recording for long videos by utilizing IndexedDB
  - Improved error handling for large file storage
  - Better progress indication for video file processing

- **Content Script Error Handling**:
  - Fixed "Could not establish connection" errors when recording finishes
  - Added message listener for `recordingStopped` action in content script
  - Improved tab existence verification before sending messages
  - Added graceful error handling for closed/navigated tabs
  - Fixed recording overlay removal on stop

- **Redmine Integration**:
  - Enhanced error handling for API communication
  - Better validation of API responses
  - Improved handling of edge cases in issue creation

### Changed
- Optimized session storage usage patterns for better stability under heavy use
- Improved performance when dealing with multiple simultaneous tabs

---

## [1.1.0] - December 10, 2025

### Added
- **Storage Quota Fixes**: Comprehensive optimization of storage quota management
- **Video Recording Enhancements**: Support for longer video recordings through improved memory management
- **IndexedDB Integration**: Support for storing large files that exceed Chrome's session storage limits
- **Enhanced Console Logging**: Better tracking and organization of console messages

### Fixed
- **Session Storage Management**:
  - Reduced storage accumulation from network request monitoring
  - Implemented intelligent cleanup strategies
  - Fixed quota overflow errors
  - Better handling of large request payloads

- **Full Screen Recording**:
  - Fixed issue where report window was hidden during full screen recording
  - Improved overlay management during recording sessions

- **Recording Lifecycle**:
  - Fixed connection errors between background script and content scripts
  - Improved message passing reliability

### Improved
- Code Noir theme consistency across extension UI
- Typography system for better visual hierarchy
- Overall extension stability and error recovery

---

## [1.0.0] - December 7, 2025

### Added

#### Media Capture Features
- **Quick Screenshot**: Instant capture of current browser tab
- **Advanced Screenshot**: Browser-native picker for selecting capture source:
  - Current tab
  - Other browser tabs
  - Browser window
  - Entire screen (all monitors)
  - Other application windows
- **Video Recording**: Screen activity recording with optional audio capture
- High-quality PNG screenshots and WebM video format support

#### Annotation Tools
- Freehand drawing/pen tool with customizable colors and line widths
- Shape tools: rectangles, circles, and arrows
- Blackout/redaction tool for hiding sensitive information
- Text annotation support
- Color picker with predefined color palette
- Adjustable line width (1-10 pixels)
- Undo/redo functionality
- Clear all annotations option

#### Technical Data Collection
- Automatic URL and page title capture
- Browser and platform information collection
- Viewport and screen resolution detection
- Timestamp recording with timezone awareness
- Page metadata extraction
- Performance metrics collection

#### Network Monitoring
- Capture all HTTP/HTTPS requests made by the page
- Request and response headers logging
- HTTP method and request type tracking
- Status code recording
- Failed request identification
- Request timing information (duration, latency)
- Network waterfall visualization support

#### Console Monitoring
- Capture console.log, console.warn, console.error, console.info messages
- Error stack trace collection
- Unhandled promise rejection tracking
- Timestamp and source URL for each log entry
- Log level categorization

#### Data Privacy & Security
- Toggle network request collection on/off
- Toggle console log collection on/off
- Toggle localStorage and cookie data collection
- Automatic sensitive data sanitization (API keys, tokens, passwords)
- Pre-submission review modal with tabbed interface
- Complete data transparency before submission
- GDPR-compliant data handling

#### Redmine Integration
- Direct Redmine server integration with API key authentication
- Project selection with dynamic project listing
- Tracker selection (Bug, Feature, Support)
- Priority assignment (Low, Normal, High, Urgent)
- Assignee selection from project members
- Category and target version selection
- Automatic media attachment to issues
- Technical data export as JSON file
- Direct link to created issue in success notification
- Test connection verification

#### User Interface
- Modern, intuitive popup interface
- Tab-based settings page for configuration
- Keyboard shortcut support (Ctrl+Shift+B on Windows, Cmd+Shift+B on Mac)
- Dark theme UI (Code Noir aesthetic)
- Progress indicators for long operations
- Error messages with helpful troubleshooting hints
- Help documentation and tooltip support

#### Extension Management
- Options/settings page for configuration
- Persistent settings storage using Chrome storage API
- Default project configuration
- Privacy setting preferences
- Manual and test modes

---

## Installation & Compatibility

### Supported Browsers
- Google Chrome 72+
- Microsoft Edge 79+

### System Requirements
- Active Redmine instance with REST API enabled
- Valid Redmine API key
- Minimum 100MB free disk space for video recording
- 10MB available session storage

---

## Known Limitations

### Version 2.0.0
- DRM-protected content (Netflix, Disney+, etc.) cannot be captured due to browser security restrictions
- Very large video files (>500MB) may require extended processing time
- Some legacy Redmine versions may have limited API compatibility

### Version 1.1.0
- IndexedDB storage limited by available disk space
- Video recording audio requires explicit user permission per session

### Version 1.0.0
- Session storage quota of ~10MB (addressed in v1.1.0+)
- No support for offline issue creation

---

## Migration Guide

### Upgrading from 1.0.0 to 1.1.0
- No configuration changes required
- Existing settings will be preserved
- New storage optimization is automatic

### Upgrading from 1.1.0 to 2.0.0
- No breaking changes
- All previous settings and data are compatible
- New issue update feature is opt-in
- Existing issues can continue to be created as before

---

## Deprecations

- None currently planned

---

## Technical Details

### Permissions Used
- `activeTab`: Access current tab for capturing
- `storage`: Store user settings and preferences
- `tabs`: Access tab information and send messages
- `webRequest`: Monitor network activity (deprecated in MV3, using webRequest alternative)
- `scripting`: Inject and run content scripts
- `tabCapture`: Capture screen/tab content
- `offscreen`: Run background tasks in offscreen document

### Storage Usage
- Session Storage: ~1-5MB typical (optimized in v1.1.0+)
- Local Storage: ~100KB for settings
- IndexedDB: Up to available disk space for large videos (v1.1.0+)

### API Integrations
- Redmine REST API v1.0+
- Chrome Extensions API (MV3)
- Web APIs: Canvas, MediaRecorder, IndexedDB, WebRTC

---

## Support & Reporting

For bug reports and feature requests, please visit:
https://github.com/prabhuvikas/Cap-screen/issues

For general support:
https://support.credenceanalytics.com/projects/redmine_tracker/issues

---

## License

This project is proprietary software. All rights reserved.
