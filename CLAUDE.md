# CLAUDE.md

This file provides context for Claude Code when working with this repository.

## Project Overview

**Cred Issue Reporter** is a Chrome extension (Manifest V3) for capturing, annotating, and reporting issues directly to Redmine with full technical context.

- **Current Version**: 2.1.3
- **Platform**: Chrome Extension (Manifest V3)
- **Integration**: Redmine issue tracker

## Key Directories

```
Cap-screen/
├── .github/
│   ├── workflows/release.yml    # Automated release pipeline
│   └── scripts/                 # CI/CD automation scripts
├── background/                  # Service worker for network monitoring
├── content/                     # Content scripts (page info, screenshots)
├── popup/                       # Extension popup UI
├── options/                     # Settings page
├── annotate/                    # Annotation tools UI
├── lib/                         # Shared libraries (Redmine API, utils)
└── assets/                      # Icons and static assets
```

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
