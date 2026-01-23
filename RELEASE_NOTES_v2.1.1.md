# Cred Issue Reporter v2.1.1 - Release Notes

**Release Date:** January 23, 2026

---

## What's New in v2.1.1

This release adds a critical enhancement to the issue reporting workflow by introducing automatic due date tracking for all Redmine issues. Every issue created through the extension will now have a due date set to the current date by default, ensuring better project management and deadline tracking.

---

## New Features

### 1. Automatic Due Date Assignment

**New Capability:** All issues created through Cred Issue Reporter now automatically include a due date field set to today's date.

**What Changed:**
- Due date field is now visible and required in the issue creation form
- Automatically pre-filled with today's date for convenience
- Fully editable - you can change the date before submission
- Visible in the review/summary modal before final submission
- Properly validated as a required field

**Benefits:**
- Better project management with automatic deadline tracking
- Ensures all issues have a due date for prioritization
- Reduces manual data entry for users
- Improves issue visibility in Redmine dashboards

**Where It Appears:**
- Issue Details form (between Assignee and Category fields)
- Review modal (editable before final submission)
- Sent to Redmine API with all issue data

---

## Technical Improvements

### Code Quality & Maintenance
- Removed unnecessary popup file modifications
- Consolidated all due date logic in annotate files (where the actual form exists)
- Improved CSS styling for date input fields to match other form controls
- Added proper validation for due date as a required field

### Developer Experience
- Added comprehensive Chrome extension cache troubleshooting documentation
- Created Windows-specific cache clearing scripts (both .bat and .ps1)
- Improved debugging capabilities for extension development
- Fixed Content Security Policy violations in inline scripts

---

## Files Changed

### Core Functionality
- `annotate/annotate.html` - Added due date input field (main form and review modal)
- `annotate/annotate.js` - Added due date initialization, validation, and submission logic
- `annotate/annotate.css` - Added proper styling for date input fields

### Documentation & Tools
- `CHROME_CACHE_FIX_WINDOWS.bat` - Batch file for Windows cache clearing
- `CHROME_CACHE_FIX_WINDOWS.ps1` - PowerShell script with advanced features
- `CHROME_CACHE_FIX.sh` - Linux/Mac cache clearing script
- `CHROME_EXTENSION_TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `WINDOWS_CACHE_FIX_README.md` - Windows-specific documentation

### Version Updates
- `manifest.json` - Updated to version 2.1.1
- `popup/popup.html` - Updated footer version display
- `annotate/help.html` - Updated help page version display

---

## Bug Fixes

- Fixed styling inconsistency for date input field to match other form controls
- Resolved Content Security Policy violations in debug scripts
- Cleaned up unused code from popup files that was incorrectly targeting the wrong HTML file

---

## Known Limitations

- Due date can only be set to a specific date (no time component)
- Due date defaults to today but can be changed by the user
- Date picker appearance may vary slightly between different browsers

---

## Upgrade Notes

**For Users:**
1. No action required - the extension will automatically update
2. Due date field will appear in the issue creation form after update
3. All new issues will require a due date to be set

**For Administrators:**
1. Ensure Redmine API allows due_date field updates
2. Verify that your Redmine projects have due date enabled
3. Update any custom Redmine workflows that might conflict with due dates

---

## Support & Troubleshooting

### Extension Not Loading Updated Files?
See the comprehensive troubleshooting guide:
- `CHROME_EXTENSION_TROUBLESHOOTING.md` - General troubleshooting
- `WINDOWS_CACHE_FIX_README.md` - Windows-specific cache clearing

### Common Issues
1. **Due date field not visible:** Clear Chrome extension cache using the provided scripts
2. **Date not saving:** Ensure Redmine API key has permission to set due dates
3. **Validation errors:** Make sure a valid date is selected before submission

---

## Feedback & Issues

Found a bug or have a suggestion? Please report it at:
https://github.com/prabhuvikas/Cap-screen/issues

---

## Previous Releases

- [v2.0.1](RELEASE_NOTES_v2.0.1.md) - HAR file attachment fix
- [v2.0.0](RELEASE_NOTES_v2.0.0.md) - Issue update feature and storage optimization
- [v1.1.0](RELEASE_NOTES_v1.1.0.md) - Initial release with core features
