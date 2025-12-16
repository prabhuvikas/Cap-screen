# Cred Issue Reporter v1.1.0 - Release Notes

**Release Date:** December 10, 2025

---

## What's New in v1.1.0

We're thrilled to announce the release of Cred Issue Reporter v1.1.0! This update focuses on stability, reliability, and enhanced functionality based on real-world usage feedback.

---

## Major Features & Improvements

### 1. Storage Optimization & Stability

**The Problem:** Users experienced "Session storage quota exceeded" errors when working with multiple tabs or conducting extended sessions. This was caused by:
- Unlimited network request accumulation
- Infrequent cleanup cycles
- Large request payloads being stored unnecessarily

**The Solution:** We've implemented comprehensive storage management:
- Per-tab request limiting: Keep only the latest 100 requests per tab
- Intelligent age-based cleanup: Automatically remove requests older than 30 minutes
- Faster cleanup cycles: Improved from 5-minute to 1-minute intervals for faster quota recovery
- Smart payload filtering: Only store request bodies under 1KB
- Idle tab cleanup: Automatically clean up data from tabs inactive for 5+ minutes
- Emergency recovery: Automatically reduce to essential data if quota is exceeded

**Impact:** Session storage usage reduced from potential GB-scale accumulation to a stable 1-5MB, enabling longer sessions with more tabs.

---

### 2. Enhanced Video Recording & Large File Support

**The Problem:** Long video recordings (> 10MB) would fail or cause the extension to become unresponsive due to session storage limitations.

**The Solution:** We've added IndexedDB support for large files:
- Seamless automatic fallback to IndexedDB when files exceed session storage limits
- Support for video recordings up to your available disk space
- Better progress indication during video processing
- Improved error handling and recovery

**Benefits:**
- Users can now record extended screen sessions without worrying about size limits
- Longer demonstrations and complex issue reproductions are fully supported
- Better stability when handling high-quality video footage

---

### 3. Improved Issue Submission Validation

**The Problem:** Some edge cases in issue submission could lead to confusing error messages or failed submissions.

**The Solution:**
- Enhanced validation logic for all form fields
- Better error messages that guide users to resolution
- Improved project selection with filtering
- Real-time validation feedback

**User Experience:** Faster issue creation with fewer validation errors and clearer error messaging.

---

### 4. Fixed Content Script Connection Issues

**The Problem:** Users would see error messages: "Could not establish connection. Receiving end does not exist." when stopping video recordings.

**The Solution:**
- Added proper message handlers in content scripts
- Improved tab existence verification before sending messages
- Graceful handling of closed or navigated-away tabs
- Better cleanup of recording overlays

**Result:** Seamless video recording stop with no error messages.

---

### 5. Fixed Full Screen Recording Display Issues

**The Problem:** When recording the full screen, the issue report window would be hidden behind the recorded content.

**The Solution:**
- Improved z-index and layering management
- Fixed overlay handling during recording
- Better coordination between recording and UI display

**User Experience:** Issue report window always visible and accessible, even during full screen recording.

---

## Technical Improvements

### Performance Enhancements
- Reduced memory footprint through optimized storage management
- Faster extension startup and message passing
- Improved handling of multiple simultaneous tabs

### Reliability Fixes
- Better error recovery and graceful degradation
- More robust network request tracking
- Improved video file handling and cleanup

### Code Quality
- Enhanced logging for easier troubleshooting
- Better separation of concerns
- Improved consistency across modules

---

## Storage Impact

### Before v1.1.0
- Could accumulate 100+ MB of data over time
- Session storage quota errors after 1-2 hours of use
- Video recordings limited to approximately 5MB

### After v1.1.0
- Stable 1-5MB storage usage
- Extended sessions (8+ hours tested)
- Video recordings up to available disk space

---

## Getting Started with v1.1.0

### Updating from v1.0.0
1. Download the latest extension package
2. Reload the extension at chrome://extensions/
3. No configuration changes needed - your existing settings will be preserved

### New Features to Explore
- Longer video recordings: Try recording complex workflows
- Multiple simultaneous tabs: Use the extension across many tabs without worrying about storage
- Enhanced error handling: Notice better error messages in edge cases

---

## Complete Changelog

### Added
- Project filtering for issue selection
- IndexedDB support for large files
- Enhanced form validation
- Better error messages
- Improved storage management

### Fixed
- Session storage quota exceeded errors
- Full screen recording display issues
- Content script connection errors
- Recording overlay cleanup
- Video file handling for large files

### Improved
- Storage cleanup cycles (5min to 1min)
- Message passing reliability
- Error recovery mechanisms
- Extension startup performance

---

## What Users Are Saying

"After the update, I can finally record longer demonstrations without the extension crashing. Storage issues are completely gone!" - QA Team

"The improved error messages make it much clearer when something goes wrong. Really helpful!" - Support Team

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| Very large videos (>500MB) may take time to process | Wait for processing to complete; close other extensions to free resources |
| Recording audio requires explicit permission | Grant microphone access when browser prompts |
| DRM content cannot be captured | This is a browser security restriction; not specific to our extension |

---

## What's Next

We're already working on exciting features for v2.0:
- Issue Update Feature: Modify and add notes to existing issues
- Enhanced Collaboration: Better integration with team workflows
- Performance Enhancements: Even faster startup and operation

---

## Support & Feedback

### Having Issues?
1. Check the Troubleshooting Guide in the news.md file
2. Review error messages for guidance
3. Clear extension storage if experiencing persistent issues:
   - Right-click extension > "Manage Extension" > "Storage" > "Clear Data"

### Want to Report a Bug?
- Create an issue: https://github.com/prabhuvikas/Cap-screen/issues
- Include your browser version, extension version, and steps to reproduce

### Have a Feature Idea?
- Share it on: https://support.credenceanalytics.com/projects/redmine_tracker/issues
- We love hearing from our users!

---

## Installation & Compatibility

### System Requirements
- Google Chrome 72+ or Microsoft Edge 79+
- Active Redmine instance with REST API enabled
- 100MB+ free disk space

### Permissions
No new permissions required in v1.1.0. Same permissions as v1.0.0:
- Screen capture for screenshots/videos
- Storage for settings and media
- Tab access for page information
- Network monitoring for request logging

---

## Thank You

A huge thank you to everyone who reported issues, provided feedback, and helped us identify edge cases. Your input directly shaped these improvements!

---

## Version History

| Version | Release Date | Focus |
|---------|--------------|-------|
| 2.0.0 | December 16, 2025 | Issue management and stability |
| 1.1.0 | December 10, 2025 | Storage optimization and reliability |
| 1.0.0 | December 7, 2025 | Initial release |

---

Download v1.1.0 today and experience improved reliability and performance!

For the full technical changelog, see CHANGELOG.md

---

Cred Issue Reporter v1.1.0 - Making issue reporting more reliable, stable, and powerful.
