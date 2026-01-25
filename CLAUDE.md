# CLAUDE.md

This file provides context for Claude Code when working with this repository.

## Project Overview

**Cred Issue Reporter** is a Chrome extension (Manifest V3) for capturing, annotating, and reporting issues directly to Redmine with full technical context.

- **Current Version**: 2.1.3
- **Platform**: Chrome Extension (Manifest V3)
- **Integration**: Redmine issue tracker

## Directory Structure & Responsibilities

### `popup/` - Extension Entry Point
The initial popup UI that appears when clicking the extension icon. Handles:
- Capture options (screenshot, video recording)
- Multi-tab selection for capture
- Quick actions to open annotation page
- **Files**: `popup.js`, `popup.html`, `popup.css`
- **When to modify**: Changing initial capture options or adding new capture modes

### `annotate/` - Main Annotation & Issue Reporting UI
Full-screen annotation interface AND the primary issue submission form. This is where users:
- Annotate screenshots with drawing tools (pen, shapes, text, arrows)
- Fill out issue details (title, description, priority, assignee)
- Submit issues to Redmine with attachments
- View help documentation
- **Files**: `annotate.js`, `annotate.html`, `annotate.css`, `help.html`
- **When to modify**: Changing annotation tools, issue form fields, or submission logic

### `background/` - Service Worker
Persistent background script that runs independently. Handles:
- Network request monitoring and storage
- Console log collection
- Video/screen recording coordination
- Message passing between extension components
- **Files**: `background.js`
- **When to modify**: Changing data collection, adding new background tasks, or modifying recording logic

### `content/` - Content Scripts (Injected into Pages)
Scripts injected into web pages to collect data. Each file has a specific role:
- `content.js` - Page info collection, console log interception
- `screenshot.js` - Screenshot capture (viewport and full-page)
- `annotator.js` - Drawing/annotation canvas logic (shared with annotate page)
- `recording-overlay.js` - Recording indicator overlay on pages
- **When to modify**: Changing what data is collected from pages or how screenshots work

### `options/` - Settings Page
Extension settings/preferences page accessible via Chrome settings. Handles:
- Redmine server URL and API key configuration
- Default project, priority, and assignee settings
- Data collection toggles (network requests, console logs, cookies)
- Connection testing
- **Files**: `options.js`, `options.html`, `options.css`
- **When to modify**: Adding new settings or changing configuration options

### `lib/` - Shared Libraries
Reusable modules used across multiple parts of the extension:
- `redmine-api.js` - Redmine API client (projects, issues, uploads, users)
- `utils.js` - Common utility functions
- `video-storage.js` - Video data storage management
- **When to modify**: Changing API integrations or adding shared utilities

### `assets/` - Static Assets
Icons and images for the extension:
- Extension icons (16, 32, 48, 128px)
- UI assets

### `.github/` - CI/CD Automation
GitHub Actions workflows and scripts:
- `workflows/release.yml` - Automated release pipeline
- `scripts/` - Node.js scripts for version bumping, changelog, builds, uploads

## CI/CD Pipeline

The release workflow (`.github/workflows/release.yml`) runs automatically when PRs are merged to `main`.

### Pipeline Stages

1. **Pre-check** - Determines if release should proceed
2. **Prepare** - Detects version bump type from labels
3. **Build** - Bumps version, generates changelog, builds extension ZIP
4. **Distribute** - Uploads to Google Drive and creates Redmine news
5. **Publish** - Commits changes and creates GitHub release

### Skipping Releases

The pipeline can be skipped in two ways:

1. **Label**: Add `skip-release` label to the PR
2. **Auto-skip**: Pipeline auto-skips when only these files change:
   - `.github/**` (CI/workflow files)
   - `**.md` (documentation)
   - `.gitignore`, `.editorconfig`, `LICENSE`

### Version Bump Labels

- `version:major` - Major version bump (breaking changes)
- `version:minor` - Minor version bump (new features)
- *(default)* - Patch version bump (bug fixes)

## Development Commands

```bash
# No build step required - load unpacked in Chrome
# Go to chrome://extensions/ → Enable Developer mode → Load unpacked
```

## Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration and permissions |
| `background/background.js` | Service worker for network/console monitoring |
| `popup/popup.js` | Main extension popup logic |
| `lib/redmine-api.js` | Redmine API integration |
| `CHANGELOG.md` | Auto-generated changelog |

## Secrets Required (for CI/CD)

- `GOOGLE_DRIVE_CREDENTIALS` - Service account JSON for Drive uploads
- `GOOGLE_DRIVE_FOLDER_ID` - Target folder ID in Shared Drive
- `REDMINE_API_KEY` - API key for Redmine news creation
- `REDMINE_SERVER_URL` - Redmine server URL
- `REDMINE_PROJECT_ID` - Target project identifier
