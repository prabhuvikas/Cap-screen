#!/usr/bin/env node

/**
 * Create Redmine news entry for new release
 * Posts news with changelog and download link
 */

const fs = require('fs');
const https = require('https');

// Get arguments
const version = process.argv[2];
const driveLink = process.argv[3];

if (!version || !driveLink) {
  console.error('Usage: node create-redmine-news.js <version> <drive-link>');
  process.exit(1);
}

// Get Redmine configuration from environment
const apiKey = process.env.REDMINE_API_KEY;
const serverUrl = process.env.REDMINE_SERVER_URL;
const projectId = process.env.REDMINE_PROJECT_ID;

if (!apiKey || !serverUrl || !projectId) {
  console.error('[ERROR] Missing Redmine configuration:');
  if (!apiKey) console.error('  - REDMINE_API_KEY not set');
  if (!serverUrl) console.error('  - REDMINE_SERVER_URL not set');
  if (!projectId) console.error('  - REDMINE_PROJECT_ID not set');
  process.exit(1);
}

console.log(`Creating Redmine news for v${version}...`);
console.log(`Server: ${serverUrl}`);
console.log(`Project: ${projectId}`);

/**
 * Extract changelog for specific version
 */
function extractChangelog(version) {
  const changelogPath = 'CHANGELOG.md';
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
 * Sanitize text to remove Unicode characters
 * Replaces non-ASCII characters with ASCII equivalents or removes them
 */
function sanitizeUnicode(text) {
  if (!text) return text;

  // Common Unicode replacements
  const replacements = {
    '\u2018': "'",   // Left single quote
    '\u2019': "'",   // Right single quote
    '\u201C': '"',   // Left double quote
    '\u201D': '"',   // Right double quote
    '\u2013': '-',   // En dash
    '\u2014': '--',  // Em dash
    '\u2026': '...', // Ellipsis
    '\u00A0': ' ',   // Non-breaking space
    '\u2022': '*',   // Bullet
    '\u00B7': '*',   // Middle dot
    '\u2713': '[x]', // Check mark
    '\u2714': '[x]', // Heavy check mark
    '\u2715': '[x]', // X mark
    '\u2716': '[x]', // Heavy X mark
    '\u2717': '[ ]', // Ballot X
    '\u2610': '[ ]', // Ballot box
    '\u2611': '[x]', // Ballot box with check
    '\u2612': '[x]', // Ballot box with X
  };

  let result = text;

  // Apply specific replacements
  for (const [unicode, ascii] of Object.entries(replacements)) {
    result = result.split(unicode).join(ascii);
  }

  // Remove any remaining non-ASCII characters (keep only printable ASCII)
  result = result.replace(/[^\x00-\x7F]/g, '');

  return result;
}

/**
 * Remove PR references from changelog text
 * Strips patterns like (#32), (PR #32), PR #32, etc.
 */
function stripPRReferences(text) {
  if (!text) return text;

  return text
    // Remove PR references in parentheses: (#32), (PR #32), (pull #32)
    .replace(/\s*\(#\d+\)/g, '')
    .replace(/\s*\(PR\s*#\d+\)/gi, '')
    .replace(/\s*\(pull\s*#\d+\)/gi, '')
    // Remove standalone PR references: PR #32, pull #32
    .replace(/\s*PR\s*#\d+/gi, '')
    .replace(/\s*pull\s*#\d+/gi, '')
    // Clean up any double spaces left behind
    .replace(/  +/g, ' ')
    // Clean up lines that end with just whitespace
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
 * Create news entry in Redmine
 */
function createRedmineNews(title, description, summary) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/projects/${projectId}/news.json`, serverUrl);

    const newsData = {
      news: {
        title: title,
        summary: summary,
        description: description
      }
    };

    const postData = JSON.stringify(newsData);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Redmine-API-Key': apiKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`\nPosting to: ${url.href}`);
    console.log('Request body preview:', postData.substring(0, 200) + '...');

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);

        if (res.statusCode === 201 || res.statusCode === 204) {
          // 201 = Created, 204 = No Content (both are success)
          if (data) {
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (e) {
              resolve({ message: 'News created successfully' });
            }
          } else {
            resolve({ message: 'News created successfully' });
          }
        } else {
          console.error('Response body:', data);
          reject(new Error(`Failed to create news: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Step 1: Extracting changelog...');
    const changelog = extractChangelog(version);

    if (changelog) {
      console.log('[OK] Changelog extracted');
      console.log('Preview:', changelog.substring(0, 200) + '...\n');
    } else {
      console.warn('[WARN] Using default changelog');
    }

    console.log('Step 2: Formatting for Redmine...');
    const description = formatForRedmine(changelog, driveLink);
    console.log('[OK] Formatted for Redmine\n');

    const title = `Cred Issue Reporter v${version} Released`;

    // Generate summary from parsed sections
    const sections = parseChangelogSections(stripPRReferences(changelog));
    const summaryText = generateSummary(sections);
    const summary = `New version ${version} of Cred Issue Reporter is now available. ${summaryText}`;

    // Sanitize all content to remove Unicode characters
    const sanitizedTitle = sanitizeUnicode(title);
    const sanitizedSummary = sanitizeUnicode(summary);
    const sanitizedDescription = sanitizeUnicode(description);

    console.log('Step 3: Creating Redmine news...');
    const response = await createRedmineNews(sanitizedTitle, sanitizedDescription, sanitizedSummary);

    console.log('\n[OK] Redmine news created successfully!');
    console.log(`\nView at: ${serverUrl}/projects/${projectId}/news`);

  } catch (error) {
    console.error('[ERROR] Failed to create Redmine news:', error.message);

    // Provide helpful debugging info
    console.error('\nDebugging information:');
    console.error(`- Redmine Server: ${serverUrl}`);
    console.error(`- Project ID: ${projectId}`);
    console.error(`- API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'not set'}`);

    process.exit(1);
  }
}

main();
