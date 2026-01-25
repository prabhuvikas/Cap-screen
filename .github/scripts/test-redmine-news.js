#!/usr/bin/env node

/**
 * Test script for Redmine news generation
 * Previews the news output without posting to Redmine
 *
 * Usage:
 *   node test-redmine-news.js [version]
 *
 * Examples:
 *   node test-redmine-news.js           # Uses current version from CHANGELOG.md
 *   node test-redmine-news.js 2.1.5     # Uses specific version
 */

const fs = require('fs');

// Get version from argument or detect from changelog
let version = process.argv[2];

const changelogPath = 'CHANGELOG.md';

/**
 * Extract latest version from CHANGELOG.md
 */
function getLatestVersion() {
  if (!fs.existsSync(changelogPath)) {
    return '0.0.0';
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const match = changelog.match(/## \[(\d+\.\d+\.\d+)\]/);
  return match ? match[1] : '0.0.0';
}

/**
 * Extract changelog for specific version
 */
function extractChangelog(version) {
  if (!fs.existsSync(changelogPath)) {
    console.error('[ERROR] CHANGELOG.md not found');
    return null;
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');

  // Find the section for this version
  const versionHeader = `## [${version}]`;
  const versionIndex = changelog.indexOf(versionHeader);

  if (versionIndex === -1) {
    console.warn(`[WARN] Version ${version} not found in CHANGELOG.md`);
    return null;
  }

  // Find the next version header or end of file
  const nextVersionIndex = changelog.indexOf('\n## [', versionIndex + 1);
  const endIndex = nextVersionIndex === -1 ? changelog.length : nextVersionIndex;

  // Extract the section
  const versionSection = changelog.substring(versionIndex, endIndex).trim();

  // Remove the version header line itself
  const lines = versionSection.split('\n');
  lines.shift(); // Remove "## [X.X.X] - Date" line

  return lines.join('\n').trim();
}

/**
 * Remove PR references from changelog text
 */
function stripPRReferences(text) {
  if (!text) return text;

  return text
    .replace(/\s*\(#\d+\)/g, '')
    .replace(/\s*\(PR\s*#\d+\)/gi, '')
    .replace(/\s*\(pull\s*#\d+\)/gi, '')
    .replace(/\s*PR\s*#\d+/gi, '')
    .replace(/\s*pull\s*#\d+/gi, '')
    .replace(/  +/g, ' ')
    .replace(/\s+$/gm, '');
}

/**
 * Parse changelog content into categorized sections
 */
function parseChangelogSections(changelog) {
  const sections = {
    fixed: [],
    added: [],
    changed: [],
    removed: []
  };

  if (!changelog) return sections;

  const lines = changelog.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip horizontal rules
    if (/^-{2,}$/.test(trimmed)) {
      continue;
    }

    // Detect section headers
    if (/^###?\s*Fixed/i.test(trimmed)) {
      currentSection = 'fixed';
    } else if (/^###?\s*Added/i.test(trimmed)) {
      currentSection = 'added';
    } else if (/^###?\s*(Changed|Changes)/i.test(trimmed)) {
      currentSection = 'changed';
    } else if (/^###?\s*Removed/i.test(trimmed)) {
      currentSection = 'removed';
    }
    // Extract only top-level bullet points (not indented sub-items)
    // Top-level items start at column 0 with - or *
    else if (/^[-*]\s+/.test(line) && currentSection) {
      const item = line.replace(/^[-*]\s+/, '').trim();
      // Skip merge references and empty items
      if (item && !item.startsWith('_Merged') && item.length > 3) {
        sections[currentSection].push(item);
      }
    }
  }

  return sections;
}

/**
 * Generate summary based on sections
 */
function generateSummary(sections) {
  const parts = [];

  if (sections.fixed.length > 0) {
    parts.push('stability improvements');
  }
  if (sections.added.length > 0) {
    parts.push('new features');
  }
  if (sections.changed.length > 0) {
    parts.push('enhancements');
  }
  if (sections.removed.length > 0) {
    parts.push('cleanup');
  }

  if (parts.length === 0) {
    return 'General improvements and updates.';
  }

  const summary = parts.join(', ');
  return `This release includes ${summary}.`;
}

/**
 * Format changelog as Markdown for Redmine (matching release notes format)
 */
function formatForRedmine(changelog, driveLink) {
  // Strip PR references from changelog
  const cleanChangelog = stripPRReferences(changelog);

  // Parse into sections
  const sections = parseChangelogSections(cleanChangelog);

  // Generate summary
  const summary = generateSummary(sections);

  // Build formatted template
  let template = `## Summary

${summary}

---

`;

  // Fixed section with table format
  if (sections.fixed.length > 0) {
    template += `## Fixed

| Issue | Description |
|-------|-------------|
`;
    sections.fixed.forEach(item => {
      // Extract title and description if possible
      const parts = item.split(' - ');
      if (parts.length > 1) {
        template += `| **${parts[0].trim()}** | ${parts.slice(1).join(' - ').trim()} |\n`;
      } else {
        template += `| **Fix** | ${item} |\n`;
      }
    });
    template += '\n---\n\n';
  }

  // Added section with table format
  if (sections.added.length > 0) {
    template += `## Added

| Feature | Description |
|---------|-------------|
`;
    sections.added.forEach(item => {
      const parts = item.split(' - ');
      if (parts.length > 1) {
        template += `| **${parts[0].trim()}** | ${parts.slice(1).join(' - ').trim()} |\n`;
      } else {
        template += `| **New** | ${item} |\n`;
      }
    });
    template += '\n---\n\n';
  }

  // Changed section with table format
  if (sections.changed.length > 0) {
    template += `## Changed

| Change | Description |
|--------|-------------|
`;
    sections.changed.forEach(item => {
      const parts = item.split(' - ');
      if (parts.length > 1) {
        template += `| **${parts[0].trim()}** | ${parts.slice(1).join(' - ').trim()} |\n`;
      } else {
        template += `| **Update** | ${item} |\n`;
      }
    });
    template += '\n---\n\n';
  }

  // Removed section with table format
  if (sections.removed.length > 0) {
    template += `## Removed

| Item | Description |
|------|-------------|
`;
    sections.removed.forEach(item => {
      const parts = item.split(' - ');
      if (parts.length > 1) {
        template += `| **${parts[0].trim()}** | ${parts.slice(1).join(' - ').trim()} |\n`;
      } else {
        template += `| **Removed** | ${item} |\n`;
      }
    });
    template += '\n---\n\n';
  }

  // If no sections were parsed, include raw changelog
  if (sections.fixed.length === 0 && sections.added.length === 0 &&
      sections.changed.length === 0 && sections.removed.length === 0) {
    template += `## Changes

${cleanChangelog || 'Release notes coming soon.'}

---

`;
  }

  // Download section
  template += `## Download

Download the latest version of Cred Issue Reporter:

| Version | Link |
|---------|------|
| Chrome Extension v${version} | [Download](${driveLink}) |

---

## Installation

1. Download the ZIP file from the link above
2. Extract the ZIP file
3. Open Chrome and navigate to \`chrome://extensions/\`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder
6. The extension is now installed and ready to use

---

## Upgrade Instructions

To preserve your settings and preferences:

1. Download the latest version (v${version}) and extract the zip file
2. Replace the contents of your existing extension folder with the new files
3. Go to \`chrome://extensions/\`
4. Click the **Reload** button on the Cred Issue Reporter extension

All existing settings and preferences will be preserved.

---

## Support

For bug reports and feature requests:
- **GitHub Issues**: https://github.com/prabhuvikas/Cap-screen/issues
- **Redmine**: https://support.credenceanalytics.com/projects/redmine_tracker/issues`;

  return template;
}

/**
 * Main execution
 */
function main() {
  console.log('='.repeat(80));
  console.log('REDMINE NEWS OUTPUT TEST');
  console.log('='.repeat(80));
  console.log();

  // Get version
  if (!version) {
    version = getLatestVersion();
    console.log(`[INFO] No version specified, using latest: v${version}`);
  } else {
    console.log(`[INFO] Testing with version: v${version}`);
  }
  console.log();

  // Extract changelog
  console.log('[STEP 1] Extracting changelog...');
  const changelog = extractChangelog(version);

  if (changelog) {
    console.log('[OK] Changelog extracted');
    console.log();
    console.log('--- RAW CHANGELOG ---');
    console.log(changelog);
    console.log('--- END RAW CHANGELOG ---');
  } else {
    console.log('[WARN] No changelog found, using placeholder');
  }
  console.log();

  // Parse sections
  console.log('[STEP 2] Parsing changelog sections...');
  const cleanChangelog = stripPRReferences(changelog);
  const sections = parseChangelogSections(cleanChangelog);

  console.log(`  Fixed:   ${sections.fixed.length} items`);
  console.log(`  Added:   ${sections.added.length} items`);
  console.log(`  Changed: ${sections.changed.length} items`);
  console.log(`  Removed: ${sections.removed.length} items`);
  console.log();

  // Generate summary
  console.log('[STEP 3] Generating summary...');
  const summaryText = generateSummary(sections);
  console.log(`  Summary: ${summaryText}`);
  console.log();

  // Format for Redmine
  console.log('[STEP 4] Formatting for Redmine...');
  const driveLink = 'https://drive.google.com/file/d/EXAMPLE_FILE_ID/view';
  const description = formatForRedmine(changelog, driveLink);
  console.log('[OK] Formatted');
  console.log();

  // Output
  const title = `Cred Issue Reporter v${version} Released`;
  const summary = `New version ${version} of Cred Issue Reporter is now available. ${summaryText}`;

  console.log('='.repeat(80));
  console.log('REDMINE NEWS PREVIEW');
  console.log('='.repeat(80));
  console.log();
  console.log(`TITLE: ${title}`);
  console.log();
  console.log(`SUMMARY: ${summary}`);
  console.log();
  console.log('DESCRIPTION:');
  console.log('-'.repeat(80));
  console.log(description);
  console.log('-'.repeat(80));
  console.log();

  // Save to file for review
  const outputFile = `test-redmine-news-v${version}.md`;
  fs.writeFileSync(outputFile, `# ${title}\n\n**Summary:** ${summary}\n\n---\n\n${description}`);
  console.log(`[OK] Output saved to: ${outputFile}`);
  console.log();
  console.log('='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
}

main();
