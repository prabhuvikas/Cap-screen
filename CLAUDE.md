# CLAUDE.md

This file provides context for Claude Code when working with this repository.

## Project Overview

**Cred Issue Reporter** is a Chrome extension (Manifest V3) for capturing, annotating, and reporting issues directly to Redmine with full technical context. It supports screenshot/video capture, drawing-based annotation, and automated issue submission with network logs, console output, and browser metadata attached.

- **Current Version**: 3.0.0 (authoritative source: `manifest.json`)
- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (no transpilation or bundling)
- **Integration**: Redmine issue tracker
- **Repository**: `prabhuvikas/Cap-screen`

## Development Commands

```bash
# No build step required - load unpacked in Chrome
# Go to chrome://extensions/ -> Enable Developer mode -> Load unpacked -> select this directory

# Run all tests
npm test

# Individual test suites
npm run test:smoke        # Critical path tests (~9 tests)
npm run test:unit         # Annotator class tests
npm run test:regression   # Full feature verification

# Development
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# E2E (Playwright - requires separate setup)
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug
```

## Testing

- **Framework**: Jest 29 with jsdom environment
- **Config**: `jest.config.js` (root)
- **Setup**: `tests/setup.js` provides mocks for Chrome APIs, IndexedDB, Canvas, and Image
- **Coverage collected from**: `content/annotator.js`, `lib/**/*.js`

### Test Files

| File | Purpose |
|------|---------|
| `tests/smoke.test.js` | 9 critical paths: init, tools, undo/redo, move, crop, state, zoom, canvas output |
| `tests/annotator.test.js` | Annotator class unit tests |
| `tests/regression.test.js` | Full feature verification |
| `tests/buildDescription.test.js` | Issue description building logic |
| `tests/draftStorage.test.js` | Draft persistence tests |
| `tests/recordingCountdown.test.js` | Recording countdown UI tests |

### Running Tests in CI

The CI workflow (`.github/workflows/ci.yml`) runs `npm test -- --ci --coverage --coverageReporters=text-summary` on every PR to `main`. Tests must pass before merge.

## Directory Structure & Responsibilities

### `popup/` - Extension Entry Point
The popup UI shown when clicking the extension icon.
- Capture options (screenshot, video recording)
- Multi-tab selection for capture
- Quick actions to open annotation page
- **Files**: `popup.js` (2,224 lines), `popup.html`, `popup.css`

### `annotate/` - Main Annotation & Issue Reporting UI
Full-screen annotation interface and issue submission form.
- Drawing tools: pen, shapes, text, arrows
- Issue details form: title, description, priority, assignee
- Redmine submission with attachments
- Help documentation
- **Files**: `annotate.js` (4,265 lines), `annotate.html`, `annotate.css`, `help.html`

### `background/` - Service Worker
Background script running independently.
- Network request monitoring (max 100/tab, 30-min expiry, 1-min cleanup)
- Console log collection
- Video/screen recording coordination
- Message passing between extension components
- Storage quota management with aggressive cleanup on quota exceeded
- **Files**: `background.js` (883 lines)

### `content/` - Content Scripts (Injected into Pages)
Scripts injected into web pages to collect data.
- `content.js` - Page info collection, console log interception
- `screenshot.js` - Screenshot capture (viewport and full-page)
- `annotator.js` - Drawing/annotation canvas class (1,139 lines) - also used in annotate page
- `recording-overlay.js` - Recording indicator overlay

### `offscreen/` - Offscreen Document
Chrome offscreen document for video recording coordination.
- `offscreen.html`, `offscreen.js` - MediaRecorder handling

### `options/` - Settings Page
Extension settings accessible via Chrome settings.
- Redmine server URL and API key configuration
- Default project, priority, and assignee settings
- Data collection toggles (network requests, console logs, cookies)
- Connection testing
- **Files**: `options.js`, `options.html`, `options.css`

### `lib/` - Shared Libraries
Reusable modules across the extension:
- `redmine-api.js` - Redmine API client (projects, issues, uploads, users)
- `utils.js` - Common utilities (date formatting, sanitization, browser detection, debounce/throttle)
- `draft-storage.js` - Draft issue persistence via IndexedDB
- `screenshot-storage.js` - Screenshot storage management
- `video-storage.js` - Video data storage management

### `assets/` - Static Assets
Extension icons (16, 32, 48, 128px PNG) and icon generation tools.

### `tests/` - Test Suite
Jest tests and manual testing checklists (see Testing section above).

### `.github/` - CI/CD Automation
- `workflows/ci.yml` - Test workflow for PRs
- `workflows/release.yml` - Automated release pipeline
- `scripts/` - Node.js scripts for version bumping, changelog, builds, uploads
- `docs/` - CI/CD setup documentation

## Code Patterns & Conventions

### Module System
- **Browser context**: Global scope (no module bundler)
- **Node.js compatibility**: Conditional export at bottom of files:
  ```javascript
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { /* exports */ };
  }
  ```
- This pattern enables Jest testing of browser-targeted code

### Architecture
- Class-based for major components (`Annotator`, `RedmineAPI`)
- Constructor with async `init()` pattern (stores `this.initPromise`)
- Event handling via `addEventListener` with `bind(this)` for context

### Naming
- `camelCase` for variables and functions
- `PascalCase` for classes
- `SCREAMING_SNAKE_CASE` for constants (e.g., `MAX_REQUESTS_PER_TAB`)

### Logging
- Console logging with `[Prefix]` context tags: `console.log('[Background]', ...)`

### Data Sanitization
- Emoji removal (4-byte UTF-8) for MySQL/Redmine compatibility
- Unicode normalization: `normalize('NFD')` then remove diacritics and non-ASCII
- Applied consistently to filenames and text content sent to Redmine

### Storage
- `chrome.storage.session` - Temporary in-session data
- `chrome.storage.local` - Persistent settings and preferences
- `chrome.storage.sync` - Synced settings
- `IndexedDB` - Large media (screenshots, videos, drafts)
- Fallback strategy: SessionStorage -> IndexedDB on quota exceeded

### Error Handling
- Try-catch with detailed console logging
- Defensive programming in storage operations (quota checks, cleanup)

## CI/CD Pipeline

### Testing (ci.yml)
- **Trigger**: PRs to `main` (opened, synchronize, reopened)
- **Node**: 20
- **Steps**: checkout, `npm ci`, `npm test --ci --coverage`, post PR comment, fail on test failure

### Release (release.yml)
Triggered when PRs are merged to `main`. Four stages:

1. **Pre-check** - Skip if `skip-release` label or only CI/docs files changed
2. **Prepare** - Detect version bump from PR labels (`version:major`, `version:minor`, default: patch)
3. **Build** - Bump version in `manifest.json`, generate changelog, create ZIP
4. **Distribute** - Upload to Google Drive, create Redmine news
5. **Publish** - Commit changes, create GitHub Release with tag

### Release Skip Rules
- `skip-release` PR label
- Auto-skipped for changes only in: `.github/**`, `**.md`, `.gitignore`, `.editorconfig`, `LICENSE`

### Changelog Auto-Detection (PR title patterns)
| Pattern | Section |
|---------|---------|
| `fix:`, `bugfix:`, contains "fix"/"bug" | Fixed |
| `feat:`, `feature:`, contains "add"/"new" | Added |
| `refactor:`, contains "update"/"improve" | Changed |
| `remove:`, contains "remove"/"delete" | Removed |

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config, permissions, version (authoritative) |
| `package.json` | Dev dependencies and npm scripts |
| `jest.config.js` | Test configuration |
| `background/background.js` | Service worker: network/console monitoring |
| `annotate/annotate.js` | Main annotation UI logic (largest file) |
| `popup/popup.js` | Extension popup logic |
| `content/annotator.js` | Canvas drawing class (shared) |
| `lib/redmine-api.js` | Redmine API integration |
| `lib/draft-storage.js` | Draft issue persistence |
| `lib/utils.js` | Shared utilities |
| `CHANGELOG.md` | Auto-generated changelog |

## Secrets Required (for CI/CD)

- `GOOGLE_DRIVE_CREDENTIALS` - Service account JSON for Drive uploads
- `GOOGLE_DRIVE_FOLDER_ID` - Target folder ID in Shared Drive
- `REDMINE_API_KEY` - API key for Redmine news creation
- `REDMINE_SERVER_URL` - Redmine server URL
- `REDMINE_PROJECT_ID` - Target project identifier

## Important Notes for AI Assistants

- The version in `manifest.json` (3.0.0) is authoritative; `package.json` version (2.1.3) is stale and only used for npm metadata.
- There is no build step. Source files are loaded directly by Chrome.
- All source is vanilla JS with no dependencies. Only dev dependencies exist (Jest, Playwright).
- `content/annotator.js` is used both as a content script and imported in the annotate page - changes affect both contexts.
- The `tests/setup.js` file provides comprehensive mocks; review it before writing new tests.
- When modifying Redmine integration, be aware of the sanitization requirements (emoji stripping, unicode normalization).
- Keyboard shortcut: `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`) opens the extension.
