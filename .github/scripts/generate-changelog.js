#!/usr/bin/env node

/**
 * Generate and update CHANGELOG.md
 * Adds new version entry based on PR information
 */

const fs = require('fs');

// Get arguments
const version = process.argv[2];
const prTitle = process.argv[3];
const prBody = process.argv[4] || '';
const prNumber = process.argv[5];
const prAuthor = process.argv[6];

if (!version || !prTitle) {
  console.error('Usage: node generate-changelog.js <version> <pr-title> <pr-body> <pr-number> <pr-author>');
  process.exit(1);
}

console.log(`Updating CHANGELOG.md for v${version}...`);

const changelogPath = 'CHANGELOG.md';

/**
 * Detect change type from PR title using conventional commit prefixes and keywords
 */
function detectChangeType(prTitle) {
  const title = prTitle.toLowerCase();

  // Conventional commit prefixes
  if (/^fix[:\(]|^bugfix[:\(]|^hotfix[:\(]/.test(title)) {
    return 'fixed';
  }
  if (/^feat[:\(]|^feature[:\(]/.test(title)) {
    return 'added';
  }
  if (/^refactor[:\(]|^perf[:\(]|^style[:\(]|^chore[:\(]/.test(title)) {
    return 'changed';
  }
  if (/^revert[:\(]|^remove[:\(]/.test(title)) {
    return 'removed';
  }

  // Keyword-based detection
  if (/\bfix(es|ed|ing)?\b|\bbug\b|\bpatch\b|\bresolve[sd]?\b|\bcorrect(s|ed|ing)?\b/.test(title)) {
    return 'fixed';
  }
  if (/\badd(s|ed|ing)?\b|\bnew\b|\bimplement(s|ed|ing)?\b|\bcreate[sd]?\b|\bintroduce[sd]?\b/.test(title)) {
    return 'added';
  }
  if (/\bremove[sd]?\b|\bdelete[sd]?\b|\bdeprecate[sd]?\b/.test(title)) {
    return 'removed';
  }
  if (/\bupdate[sd]?\b|\bchange[sd]?\b|\bmodif(y|ies|ied)\b|\brefactor(s|ed|ing)?\b|\bimprove[sd]?\b|\benhance[sd]?\b|\boptimize[sd]?\b/.test(title)) {
    return 'changed';
  }

  // Default to 'changed' if no pattern matches
  return 'changed';
}

/**
 * Get human-readable category name
 */
function getCategoryName(category) {
  const names = {
    added: 'Added',
    fixed: 'Fixed',
    changed: 'Changed',
    removed: 'Removed'
  };
  return names[category] || 'Changed';
}

/**
 * Parse PR body to extract categorized changes
 */
function parseChanges(prBody, prTitle) {
  const changes = {
    added: [],
    fixed: [],
    changed: [],
    removed: []
  };

  // Detect category from PR title for fallback
  const detectedCategory = detectChangeType(prTitle);

  if (!prBody) {
    return { changes, detectedCategory };
  }

  const lines = prBody.split('\n');
  let currentCategory = null;
  let hasExplicitCategories = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect category headers
    if (/^##\s*(added|fixed|changed|removed)/i.test(trimmed)) {
      const match = trimmed.match(/^##\s*(added|fixed|changed|removed)/i);
      currentCategory = match[1].toLowerCase();
      hasExplicitCategories = true;
    }
    // Extract bullet points
    else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const item = trimmed.replace(/^[-*]\s*/, '').trim();
      if (item && currentCategory && changes[currentCategory]) {
        changes[currentCategory].push(item);
      }
    }
  }

  return { changes, detectedCategory, hasExplicitCategories };
}

/**
 * Format date as "Month Day, Year"
 */
function formatDate() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const now = new Date();
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();

  return `${month} ${day}, ${year}`;
}

/**
 * Generate changelog entry
 */
function generateChangelogEntry(version, prTitle, prBody, prNumber, prAuthor) {
  const date = formatDate();
  const { changes, detectedCategory, hasExplicitCategories } = parseChanges(prBody, prTitle);

  let entry = `## [${version}] - ${date}\n\n`;

  // If we have explicit categorized changes from PR body, use them
  const hasCategories = Object.values(changes).some(arr => arr.length > 0);

  if (hasCategories && hasExplicitCategories) {
    if (changes.added.length > 0) {
      entry += '### Added\n';
      changes.added.forEach(item => {
        entry += `- ${item}\n`;
      });
      entry += '\n';
    }

    if (changes.fixed.length > 0) {
      entry += '### Fixed\n';
      changes.fixed.forEach(item => {
        entry += `- ${item}\n`;
      });
      entry += '\n';
    }

    if (changes.changed.length > 0) {
      entry += '### Changed\n';
      changes.changed.forEach(item => {
        entry += `- ${item}\n`;
      });
      entry += '\n';
    }

    if (changes.removed.length > 0) {
      entry += '### Removed\n';
      changes.removed.forEach(item => {
        entry += `- ${item}\n`;
      });
      entry += '\n';
    }
  } else {
    // Use detected category from PR title
    const categoryName = getCategoryName(detectedCategory);
    entry += `### ${categoryName}\n`;
    entry += `- ${prTitle}\n`;

    // Try to extract meaningful information from PR body
    if (prBody) {
      const lines = prBody.split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Include lines that look like list items or descriptions
          return (line.startsWith('-') || line.startsWith('*') ||
                  (line.length > 20 && !line.startsWith('#')));
        })
        .slice(0, 5); // Max 5 lines

      lines.forEach(line => {
        const cleaned = line.replace(/^[-*]\s*/, '').trim();
        if (cleaned && cleaned !== prTitle) {
          entry += `  - ${cleaned}\n`;
        }
      });
    }

    entry += '\n';
  }

  // Add PR reference
  if (prNumber && prAuthor) {
    entry += `_Merged PR #${prNumber} by @${prAuthor}_\n`;
  }

  entry += '\n---\n\n';

  return entry;
}

/**
 * Insert changelog entry
 */
function insertChangelogEntry(changelogContent, newEntry) {
  // Find the position after the header section
  const lines = changelogContent.split('\n');
  let insertIndex = 0;

  // Skip header lines (# Changelog, description, etc.)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('---')) {
      insertIndex = i + 1;
      break;
    }
    if (lines[i].startsWith('## [')) {
      insertIndex = i;
      break;
    }
  }

  // If no existing entries found, append after header
  if (insertIndex === 0) {
    insertIndex = lines.length;
  }

  // Insert the new entry
  lines.splice(insertIndex, 0, '', newEntry);

  return lines.join('\n');
}

/**
 * Main execution
 */
function main() {
  try {
    // Read existing changelog
    let changelogContent = '';
    if (fs.existsSync(changelogPath)) {
      changelogContent = fs.readFileSync(changelogPath, 'utf8');
      console.log('✅ Existing CHANGELOG.md loaded');
    } else {
      // Create new changelog with header
      changelogContent = `# Changelog

All notable changes to Cred Issue Reporter will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

`;
      console.log('✅ Creating new CHANGELOG.md');
    }

    // Generate new entry
    console.log('Generating changelog entry...');
    const newEntry = generateChangelogEntry(version, prTitle, prBody, prNumber, prAuthor);

    console.log('Preview:');
    console.log('---');
    console.log(newEntry);
    console.log('---');

    // Insert into changelog
    const updatedChangelog = insertChangelogEntry(changelogContent, newEntry);

    // Write back to file
    fs.writeFileSync(changelogPath, updatedChangelog);

    console.log('✅ CHANGELOG.md updated successfully');

  } catch (error) {
    console.error('❌ Failed to update changelog:', error.message);
    process.exit(1);
  }
}

main();
