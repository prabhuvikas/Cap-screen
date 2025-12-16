# Cred Issue Reporter v2.0.0 - Release Notes

**Release Date:** December 16, 2025   [Download](https://drive.google.com/file/d/1THJl2k5pf9NTVrRESVFL5wVGhlJ3sKaG/view?usp=drive_link)

---

## What's New in v2.0.0

We're excited to introduce Cred Issue Reporter v2.0.0! This major release brings powerful new issue management capabilities while maintaining the stability and reliability of v1.1.0.

---

## Major Features & Improvements

### 1. Issue Update Feature - Update Existing Issues

**New Capability:** You can now update existing Redmine issues directly from the extension without leaving your browser.

**What You Can Do:**
- Add detailed notes to existing issues with full formatting support
- Attach screenshots and videos to previously created issues
- Add technical data to ongoing issue discussions
- Track issue progress with new evidence and findings
- Collaborate on issues by adding context in real-time

**How It Works:**
1. Click the extension icon
2. Capture new media or gather additional technical data
3. Select "Update Existing Issue" option
4. Choose the issue you want to update
5. Add your note with context
6. Attach all relevant files
7. Submit - your update is immediately visible in Redmine

**Use Cases:**
- "Found additional details about the bug - capturing new screenshots"
- "Reproducing the issue again with different steps"
- "Adding technical logs from a different user session"
- "Following up on a previously reported issue"

---

### 2. Smart Project Filtering

**Enhancement:** Improved project selection with intelligent filtering and validation.

**Features:**
- Quick-filter projects by name or code
- Shows project description and status
- Validates project access permissions
- Highlights recently used projects
- Better error messages if a project is unavailable

**Benefit:** Faster issue updation and reduced errors when selecting the target project.

---

### 3. Enhanced Form Validation

**Improvement:** More robust validation throughout the issue submission process.

**What's Better:**
- Real-time field validation with clear feedback
- Better error messages that guide you to the solution
- Field-level hints and requirements
- Prevention of invalid submissions before they reach the server
- Improved handling of edge cases and special characters

**Result:** Fewer failed submissions and clearer guidance when something needs fixing.

---

### 4. Continued Storage Optimization

**Maintained from v1.1.0:** All storage improvements from v1.1.0 remain in place and have been further optimized.

**Storage Features:**
- Per-tab request limiting (max 100 requests/tab)
- Age-based cleanup (30-minute retention)
- 1-minute cleanup intervals for responsive quota recovery
- Smart request body filtering (only stores < 1KB)
- IndexedDB support for large video files
- Idle tab cleanup (removes data from inactive tabs)

---

## Technical Improvements

### Stability & Reliability
- Enhanced error handling for API communication
- Better validation of Redmine API responses
- Improved handling of edge cases in issue operations
- More robust message passing between components
- Better recovery from transient failures

### Performance
- Optimized database queries for project listing
- Faster issue lookup and filtering
- Improved memory usage during validation
- Better responsive UI during operations

### Code Quality
- Improved separation of concerns
- Better error logging and diagnostics
- Enhanced code documentation
- More consistent naming and patterns

---

## Bug Fixes

### From v1.1.0 Carry-Forward
- Session storage quota management
- Full screen recording display issues
- Content script connection errors
- Video file handling for large recordings

### New Fixes in v2.0.0
- Fixed project filter edge cases
- Improved validation error recovery
- Better handling of network timeouts
- Enhanced Redmine API error responses

---

## Upgrade Notes

### From v1.1.0 to v2.0.0
- No breaking changes
- All existing settings and preferences are preserved
- Existing issue creation workflow unchanged
- New features are backward compatible
- No database migration required

### From v1.0.0 to v2.0.0
- Recommended to update (includes all v1.1.0 fixes)
- Storage quota issues are now resolved
- All new features available
- Configuration settings preserved

---

## What's Changed

### New Workflows
- Issue creation (existing workflow)
- Issue update (new in v2.0.0)
- Both workflows support full annotation and technical data

### UI/UX Improvements
- Clearer form validation messages
- Better project selection interface
- More intuitive issue type selection
- Improved success and error notifications

### Behind the Scenes
- Enhanced API error handling
- Better validation pipelines
- Improved state management
- More robust data persistence

---

## Performance Metrics

### v2.0.0 Benchmarks
- Issue creation: < 2 seconds average
- Issue update: < 1.5 seconds average
- Project listing: < 500ms (first load, cached thereafter)
- Video upload for large files: Seamless with progress indication
- Storage usage: 1-5MB stable (even with extended usage)

---

## Getting Started with v2.0.0

### Installation
1. Download the latest extension package
2. Reload the extension at chrome://extensions/
3. Existing settings will be automatically preserved

### Discovering New Features
1. Open the extension popup
2. Look for "Update Existing Issue" option
3. Try the new project filtering interface
4. Notice the improved form validation

### Migration Path
- If you're on v1.1.0: Simply update and start using new features immediately
- If you're on v1.0.0: Update to get both stability improvements and new features

---

## Roadmap & Future

### What's Coming Next
- Batch issue operations (create/update multiple issues)
- Issue templates for faster submission
- Advanced filtering and search
- Bulk data operations

### Feedback Welcome
Your suggestions help shape the future of Cred Issue Reporter. Share your ideas!

---

## Support & Feedback

### Having Issues?
1. Check troubleshooting guide at news.md
2. Review error messages for guidance
3. Clear extension storage if needed:
   - Right-click extension > "Manage Extension" > "Storage" > "Clear Data"
4. Try reloading the extension at chrome://extensions/

### Report a Bug?
- GitHub Issues: https://support.credenceanalytics.com/projects/redmine_tracker/issues
- Include browser version, extension version, and steps to reproduce

### Request a Feature?
- Submit at: https://support.credenceanalytics.com/projects/redmine_tracker/issues
- Describe your use case and desired behavior
- We actively review and prioritize requests

---

## Compatibility

### System Requirements
- Google Chrome 72+ or Microsoft Edge 79+
- Redmine instance with REST API enabled
- Valid Redmine API key with appropriate permissions
- 100MB+ free disk space for video recording

### No New Permissions Required
v2.0.0 uses the same permissions as v1.0.0 and v1.1.0. No new browser permissions needed.

---

## Known Limitations

- DRM-protected content cannot be captured (browser restriction)
- Very large videos (>500MB) may require extended processing
- Project list is cached for performance (refresh available in settings)
- Some legacy Redmine versions may have limited API compatibility

---

## Version Comparison

| Feature | v1.0.0 | v1.1.0 | v2.0.0 |
|---------|--------|--------|--------|
| Issue Creation | Yes | Yes | Yes |
| Issue Update | No | No | Yes |
| Screenshot | Yes | Yes | Yes |
| Video Recording | Yes | Yes | Yes |
| Annotation Tools | Yes | Yes | Yes |
| Storage Optimization | No | Yes | Yes |
| Large File Support | No | Yes | Yes |
| Project Filtering | Basic | Enhanced | Enhanced+ |
| Form Validation | Basic | Improved | Advanced |
| Network Monitoring | Yes | Yes | Yes |
| Console Logging | Yes | Yes | Yes |

---

## Migration Guide

### From v1.0.0
1. Back up your settings by taking a screenshot
2. Download and install v2.0.0
3. Your settings will auto-migrate
4. Verify Redmine connection still works
5. Try new issue update feature

### From v1.1.0
1. Download and install v2.0.0
2. No action needed - instant compatibility
3. Start using issue update feature

---

## Thank You

We appreciate the continued support and feedback from our community. Your reports and suggestions directly influence our product roadmap.

Special thanks to:
- QA team for rigorous testing
- Support team for user insights
- All users who reported issues and shared feedback

---

## Version History

| Version | Release Date | Focus |
|---------|--------------|-------|
| 2.0.0 | December 16, 2025 | Issue management and enhanced features |
| 1.1.0 | December 10, 2025 | Storage optimization and reliability |
| 1.0.0 | December 7, 2025 | Initial release |

---

Download v2.0.0 today and unlock powerful new issue management capabilities!

For detailed technical information, see CHANGELOG.md

---

Cred Issue Reporter v2.0.0 - Professional issue reporting, now with complete lifecycle management.
