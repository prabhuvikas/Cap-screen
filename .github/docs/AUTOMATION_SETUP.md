# CI/CD Automation

Complete automation for testing, building, and releasing the Chrome Extension.

---

## 🧪 Automated Testing (CI)

The test workflow (`.github/workflows/ci.yml`) runs automatically on every pull request.

### What Gets Tested

When a PR is opened or updated:

1. ✅ **Smoke Tests** - Critical path verification
2. ✅ **Unit Tests** - Annotator class functionality
3. ✅ **Regression Tests** - Full feature verification
4. ✅ **PR Comment** - Test results posted to PR
5. ✅ **Status Check** - Blocks merge if tests fail

### Enforcing Test Requirements

To require tests to pass before merging:

1. Go to **Settings > Branches** in GitHub
2. Click **Add rule** for the `main` branch
3. Enable **"Require status checks to pass before merging"**
4. Search for and select **"Run Tests"**
5. Click **Create** or **Save changes**

Now PRs cannot be merged until all tests pass.

### Running Tests Locally

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:smoke      # Quick critical path tests
npm run test:unit       # Annotator class tests
npm run test:regression # Full feature verification
```

---

## 🚀 Automated Release Workflow

The release workflow (`.github/workflows/release.yml`) runs automatically when PRs are merged to main.

### What Gets Automated

When a PR is merged to the `main` branch, the workflow automatically:

1. ✅ **Bumps version** in `manifest.json` (based on PR labels)
2. ✅ **Updates CHANGELOG.md** with PR details
3. ✅ **Builds extension ZIP** with clean distribution files
4. ✅ **Uploads to Google Drive** and generates shareable link
5. ✅ **Creates Redmine news** with changelog and download link
6. ✅ **Creates GitHub Release** with version tag and assets
7. ✅ **Commits changes** back to main branch

---

## 🚀 Quick Start

### Prerequisites

1. **Google Drive** - For hosting extension releases
   - Follow [Google Drive Setup Guide](./.GOOGLE_DRIVE_SETUP.md)

2. **Redmine API Access** - For posting news
   - Get your API key from Redmine account settings
   - Ensure you have news creation permissions

3. **GitHub Repository Access** - For creating releases
   - GitHub Actions must have write permissions (default)

### Setup Steps

1. **Configure Google Drive** (see [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md))

2. **Add GitHub Secrets**:
   - `GOOGLE_DRIVE_CREDENTIALS` - Service account JSON key
   - `GOOGLE_DRIVE_FOLDER_ID` - Target folder ID
   - `REDMINE_API_KEY` - Your Redmine API key
   - `REDMINE_SERVER_URL` - Your Redmine server (e.g., `https://redmine.example.com`)
   - `REDMINE_PROJECT_ID` - Project identifier (e.g., `cap-screen`)

3. **Enable GitHub Actions**:
   - Go to repository **Settings** → **Actions** → **General**
   - Under "Workflow permissions", select **"Read and write permissions"**
   - Check **"Allow GitHub Actions to create and approve pull requests"**
   - Click **"Save"**

4. **Done!** The workflow is ready to use.

---

## 📝 How to Use

### Version Bumping with Labels

Add one of these labels to your PR to control version bumping:

| Label | Version Bump | Example |
|-------|-------------|---------|
| `version:major` | Breaking changes | 1.0.0 → 2.0.0 |
| `version:minor` | New features | 1.0.0 → 1.1.0 |
| `version:patch` | Bug fixes | 1.0.0 → 1.0.1 |
| _(no label)_ | Defaults to patch | 1.0.0 → 1.0.1 |

### Changelog Format

The changelog is automatically categorized based on your PR title:

| PR Title Pattern | Changelog Section |
|------------------|-------------------|
| `fix:`, `bugfix:`, "fix", "bug" | `### Fixed` |
| `feat:`, `feature:`, "add", "new" | `### Added` |
| `refactor:`, "update", "improve" | `### Changed` |
| `remove:`, "remove", "delete" | `### Removed` |

**Best practice**: Use conventional commit prefixes in PR titles:
- `fix: resolve login bug` → **Fixed**
- `feat: add dark mode toggle` → **Added**
- `refactor: improve API performance` → **Changed**

For more detailed changelogs, format your PR description like this:

```markdown
## Added
- New feature A
- New feature B

## Fixed
- Bug fix C
- Bug fix D

## Changed
- Updated component E
- Improved performance F
```

The workflow will extract these categories automatically if present.

### Example Workflow

1. **Create a PR**:
   ```bash
   git checkout -b feature/new-annotation-tool
   # Make your changes
   git commit -m "Add circle annotation tool"
   git push origin feature/new-annotation-tool
   ```

2. **Add PR label**: `version:minor` (since it's a new feature)

3. **Write PR description**:
   ```markdown
   ## Added
   - Circle annotation tool for highlighting areas
   - Color picker for circle stroke
   ```

4. **Merge the PR** (review and approve first)

5. **Workflow runs automatically**:
   - Version bumped: `2.0.1` → `2.1.0`
   - CHANGELOG.md updated
   - ZIP created: `Cap-screen-v2.1.0.zip`
   - Uploaded to Google Drive
   - Redmine news created with download link
   - GitHub release created with tag `v2.1.0`
   - Changes committed to main

6. **Results**:
   - ✅ New version `v2.1.0` is live
   - ✅ Download available on Google Drive
   - ✅ News posted on Redmine
   - ✅ GitHub release created
   - ✅ Team can immediately download and test

---

## 🏗️ Architecture

### Workflow File

`.github/workflows/release.yml` - Main orchestrator

### Scripts

- `bump-version.js` - Updates manifest.json version
- `generate-changelog.js` - Creates CHANGELOG.md entry
- `build-extension.js` - Creates distribution ZIP
- `upload-to-drive.js` - Uploads to Google Drive
- `create-redmine-news.js` - Posts news to Redmine

### Triggers

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]
```

Only runs when PR is **merged** (not just closed).

---

## 🔍 Monitoring

### View Workflow Runs

1. Go to **Actions** tab in GitHub
2. Click on **"Automated Release Workflow"**
3. View logs for each step

### Workflow Summary

After each run, check the workflow summary for:
- Version number
- Bump type (major/minor/patch)
- Artifacts created
- Links to Google Drive and GitHub Release

### Example Output

```
🎉 Release Complete!

Version: v2.1.0
Type: minor

📦 Artifacts
- Extension ZIP: Cap-screen-v2.1.0.zip
- Google Drive: https://drive.google.com/file/d/.../view
- GitHub Release: https://github.com/.../releases/tag/v2.1.0

📝 Updates
- ✅ manifest.json version bumped
- ✅ CHANGELOG.md updated
- ✅ Extension built and uploaded to Google Drive
- ✅ Redmine news created
- ✅ GitHub release created
- ✅ Changes committed to main branch
```

---

## 🛠️ Customization

### Change Version Detection

Edit `.github/workflows/release.yml`:

```yaml
- name: Detect version bump type
  id: version_type
  run: |
    # Customize label names here
    if echo "$LABELS" | grep -q "breaking"; then
      echo "type=major" >> $GITHUB_OUTPUT
    # ... more conditions
```

### Exclude Files from ZIP

Edit `.github/scripts/build-extension.js`:

```javascript
const excludePatterns = [
  '.git/',
  'node_modules/',
  // Add more patterns here
];
```

### Customize Redmine News Format

Edit `.github/scripts/create-redmine-news.js`:

```javascript
function formatForRedmine(changelog, driveLink) {
  // Customize the formatting here
}
```

---

## 🐛 Troubleshooting

### Workflow doesn't run

**Symptoms**: PR merged but no workflow execution

**Causes**:
- PR merged to wrong branch (must be `main`)
- GitHub Actions disabled
- Workflow file has syntax errors

**Solution**:
1. Check branch name in workflow file
2. Go to Settings → Actions → Enable workflows
3. Validate YAML syntax

### Version not bumped

**Symptoms**: Version stays the same after merge

**Causes**:
- Label not recognized
- manifest.json has invalid format
- Script failed to parse version

**Solution**:
1. Check PR had correct label (`version:patch/minor/major`)
2. Verify manifest.json has valid semantic version
3. Check workflow logs for errors

### Google Drive upload fails

**Symptoms**: "Failed to upload file" error

**Causes**:
- Invalid credentials
- Service account lacks folder access
- Network issues

**Solution**:
1. Follow [GOOGLE_DRIVE_SETUP.md](./GOOGLE_DRIVE_SETUP.md) carefully
2. Verify service account is shared with folder
3. Check credentials secret is correct JSON
4. Review detailed logs in Actions tab

### Redmine news creation fails

**Symptoms**: "Failed to create news" error

**Causes**:
- Invalid API key
- Insufficient permissions
- Project ID incorrect
- Redmine version doesn't support news API

**Solution**:
1. Verify API key in Redmine account settings
2. Check you have news creation permissions
3. Confirm project identifier (not project name)
4. Test endpoint: `curl -X POST https://redmine.example.com/projects/PROJECT_ID/news.json -H "X-Redmine-API-Key: YOUR_KEY"`

### Commit fails

**Symptoms**: "Failed to push" error

**Causes**:
- Branch protection rules
- GitHub Actions lacks write permissions

**Solution**:
1. Go to Settings → Actions → General
2. Enable "Read and write permissions"
3. Update branch protection to allow GitHub Actions

---

## 🔐 Security

### Secrets Management

- ✅ All sensitive data stored in GitHub Secrets
- ✅ Never commit credentials to repository
- ✅ Service account has minimal permissions (Drive only)
- ✅ Secrets masked in workflow logs

### Best Practices

1. **Rotate credentials** every 90 days
2. **Audit access logs** regularly
3. **Use dedicated service accounts** (not personal accounts)
4. **Limit repository access** to trusted contributors
5. **Review workflow changes** before merging

---

## 📊 Workflow Metrics

### Average Runtime

- **Total**: ~2-3 minutes
- Version bump: ~5 seconds
- Build ZIP: ~10 seconds
- Google Drive upload: ~30 seconds
- Redmine news: ~10 seconds
- GitHub release: ~20 seconds
- Commit: ~10 seconds

### File Sizes

- Extension ZIP: ~2-5 MB (depending on assets)
- Service account JSON: ~2 KB
- Changelog entry: ~500 bytes

---

## 🎓 Advanced Usage

### Skip Release

To merge a PR without triggering release:

1. Add `[skip ci]` to the PR title or commit message
2. Or add label `no-release`

### Manual Release

To manually trigger a release:

```bash
# Tag and push
git tag v2.1.0
git push origin v2.1.0

# Run workflow manually from Actions tab
```

### Multiple Environments

For staging/production releases:

1. Duplicate workflow file
2. Use different branches (e.g., `develop`, `main`)
3. Configure separate Google Drive folders
4. Use environment-specific secrets

---

## 📚 Additional Documentation

- [Google Drive Setup Guide](./GOOGLE_DRIVE_SETUP.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Redmine API Documentation](https://www.redmine.org/projects/redmine/wiki/Rest_Api)
- [Semantic Versioning](https://semver.org/)

---

## 🤝 Contributing

To improve this automation:

1. Test changes in a feature branch
2. Update documentation
3. Create PR with clear description
4. Request review from maintainers

---

## 📞 Support

For issues or questions:

1. Check troubleshooting section above
2. Review workflow logs in Actions tab
3. Open an issue with:
   - Error message
   - Workflow run link
   - Steps to reproduce

---

## 🎉 Benefits

This automation provides:

- ⚡ **Zero manual effort** - Fully automated releases
- 🎯 **Consistency** - No human errors in versioning
- 📦 **Instant distribution** - Immediate Google Drive access
- 📢 **Stakeholder communication** - Auto Redmine news
- 📝 **Complete audit trail** - All changes tracked
- ⏱️ **Time savings** - ~15 minutes saved per release
- 🔄 **Repeatable process** - Same workflow every time

---

**Last updated**: January 2026
**Maintained by**: Cap-screen Team
