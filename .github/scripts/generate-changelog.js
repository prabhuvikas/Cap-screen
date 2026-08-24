#!/usr/bin/env node

/**
 * Generate and update CHANGELOG.md
 * Adds new version entry based on PR information
 */

const fs = require('fs');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Diagnostics
//
// This runs unattended in the release workflow, so a failure can only ever be
// debugged from the job log after the fact. Everything the next person needs -
// where each input came from, what was parsed out of it, and what was written -
// is logged here, wrapped in collapsed ::group:: blocks so a healthy run stays
// readable.
// ---------------------------------------------------------------------------

const inActions = Boolean(process.env.GITHUB_ACTIONS);
const diagnostics = {};

function group(title, body) {
  console.log(inActions ? `::group::${title}` : `--- ${title} ---`);
  try {
    body();
  } finally {
    console.log(inActions ? '::endgroup::' : '---');
  }
}

function warn(message) {
  console.log(inActions ? `::warning::${message}` : `[WARN] ${message}`);
}

function annotateError(message) {
  console.log(inActions ? `::error::${message}` : `[ERROR] ${message}`);
}

/** Append to the job summary so a failure is visible without opening the log. */
function appendSummary(markdown) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  try {
    fs.appendFileSync(summaryPath, `${markdown}\n`);
  } catch (error) {
    console.log(`[WARN] Could not write job summary: ${error.message}`);
  }
}

/**
 * Describe an input without dumping a whole PR body into the log: length, line
 * count, a short hash for comparing runs, the first line, and any characters
 * that have historically broken this step.
 */
function describeInput(name, value, source) {
  if (value === undefined || value === null || value === '') {
    console.log(`  ${name.padEnd(9)} (empty)  [from ${source}]`);
    return;
  }

  const lines = value.split('\n');
  const hash = crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
  const hazards = [
    value.includes('`') && 'backticks',
    value.includes('$(') && '$(...)',
    /["']/.test(value) && 'quotes',
    lines.length > 1 && `${lines.length} lines`
  ].filter(Boolean);

  console.log(`  ${name.padEnd(9)} ${value.length} chars, sha256:${hash}  [from ${source}]`);
  console.log(`  ${''.padEnd(9)} first line: ${JSON.stringify(lines[0].slice(0, 160))}`);
  if (hazards.length > 0) {
    console.log(`  ${''.padEnd(9)} contains: ${hazards.join(', ')}`);
  }
}

/** Read an input from the environment, falling back to a positional argument. */
function readInput(envName, argIndex) {
  if (process.env[envName]) {
    return { value: process.env[envName], source: `env ${envName}` };
  }
  const arg = process.argv[argIndex];
  return { value: arg, source: arg ? `argv[${argIndex}]` : 'unset' };
}

// Get inputs. The release workflow passes these through the environment so PR
// text never has to survive a trip through a shell command line; positional
// arguments still work for running the script by hand.
const versionInput = readInput('VERSION', 2);
const prTitleInput = readInput('PR_TITLE', 3);
const prBodyInput = readInput('PR_BODY', 4);
const prNumberInput = readInput('PR_NUMBER', 5);
const prAuthorInput = readInput('PR_AUTHOR', 6);

const version = versionInput.value;
const prTitle = prTitleInput.value;
const prBody = prBodyInput.value || '';
const prNumber = prNumberInput.value;
const prAuthor = prAuthorInput.value;

group('Changelog inputs', () => {
  describeInput('version', version, versionInput.source);
  describeInput('title', prTitle, prTitleInput.source);
  describeInput('body', prBody, prBodyInput.source);
  describeInput('number', prNumber, prNumberInput.source);
  describeInput('author', prAuthor, prAuthorInput.source);
  console.log(`  argv count: ${process.argv.length - 2}, cwd: ${process.cwd()}, node: ${process.version}`);
});

if (!version || !prTitle) {
  annotateError('Changelog generation needs at least a version and a PR title.');
  console.error(`  version: ${version ? 'present' : 'MISSING'} (${versionInput.source})`);
  console.error(`  title:   ${prTitle ? 'present' : 'MISSING'} (${prTitleInput.source})`);
  console.error('Usage: node generate-changelog.js <version> <pr-title> <pr-body> <pr-number> <pr-author>');
  console.error('   or: VERSION=... PR_TITLE=... PR_BODY=... PR_NUMBER=... PR_AUTHOR=... node generate-changelog.js');
  appendSummary('### Changelog step failed\n\nMissing required input (version or PR title). See the job log for which one.');
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

// A bullet requires whitespace after the marker, so bold headings such as
// "**AI client**" are not mistaken for list items.
const BULLET_RE = /^[-*+]\s+/;

/**
 * Lines that carry no changelog value: markdown tables, rules, headings,
 * italic footers (e.g. "_Generated by ..._") and HTML comments.
 */
function isNoiseLine(line) {
  if (!line) return true;
  if (line.startsWith('|')) return true;                 // table rows
  if (/^([-*_])\1{2,}$/.test(line)) return true;          // --- *** ___
  if (line.startsWith('#')) return true;                 // headings
  if (line.startsWith('<!--')) return true;              // comments
  if (/^_.*_$/.test(line)) return true;                  // _italic footer_
  if (/^\*\*.*\*\*:?$/.test(line)) return true;          // **bold heading**
  return false;
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
    diagnostics.parse = { bodyLines: 0, hasExplicitCategories: false, counts: { added: 0, fixed: 0, changed: 0, removed: 0 } };
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
    else if (BULLET_RE.test(trimmed)) {
      const item = trimmed.replace(BULLET_RE, '').trim();
      if (item && currentCategory && changes[currentCategory]) {
        changes[currentCategory].push(item);
      }
    }
  }

  diagnostics.parse = {
    bodyLines: lines.length,
    hasExplicitCategories,
    counts: Object.fromEntries(Object.entries(changes).map(([key, items]) => [key, items.length]))
  };

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

  diagnostics.detectedCategory = detectedCategory;
  diagnostics.path = (hasCategories && hasExplicitCategories) ? 'explicit-categories' : 'title-fallback';

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

    // Try to extract meaningful information from PR body.
    // Real bullet points describe the change best, so prefer them and only
    // fall back to prose paragraphs when the body has no list at all.
    if (prBody) {
      const candidates = prBody.split('\n')
        .map(line => line.trim())
        .filter(line => !isNoiseLine(line));

      const bullets = candidates.filter(line => BULLET_RE.test(line));
      const source = bullets.length > 0
        ? bullets
        : candidates.filter(line => line.length > 20);

      diagnostics.fallback = {
        candidateLines: candidates.length,
        bulletLines: bullets.length,
        using: bullets.length > 0 ? 'bullets' : 'prose'
      };

      source
        .map(line => line.replace(BULLET_RE, '').trim())
        .filter(line => line && line !== prTitle)
        .slice(0, 5) // Max 5 lines
        .forEach(line => {
          entry += `  - ${line}\n`;
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

  diagnostics.insertIndex = insertIndex;
  diagnostics.insertAnchor = lines[insertIndex] === undefined
    ? '(end of file)'
    : JSON.stringify(lines[insertIndex].slice(0, 80));

  // Insert the new entry
  lines.splice(insertIndex, 0, '', newEntry);

  return lines.join('\n');
}

/**
 * Sanity-check the generated entry before it is written.
 *
 * These are the shapes a corrupted entry took when the workflow used to
 * interpolate PR text into its shell command (a non-numeric PR number, an
 * author with spaces in it, an entry with no content) - cheap to check, and
 * they turn a silently wrong CHANGELOG into a visible warning.
 */
function validateEntry(entry) {
  const problems = [];

  if (prNumber && !/^\d+$/.test(prNumber)) {
    problems.push(`PR number is not numeric: ${JSON.stringify(prNumber.slice(0, 60))}`);
  }
  if (prAuthor && /\s/.test(prAuthor)) {
    problems.push(`PR author contains whitespace: ${JSON.stringify(prAuthor.slice(0, 60))}`);
  }
  if (!/^- .+/m.test(entry)) {
    problems.push('Entry has no bullet points - the PR title and body produced nothing.');
  }
  if (!new RegExp(`^## \\[${version.replace(/\./g, '\\.')}\\]`, 'm').test(entry)) {
    problems.push(`Entry heading does not carry version ${version}.`);
  }

  return problems;
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

    group('Changelog diagnostics', () => {
      console.log(`  detected category: ${diagnostics.detectedCategory}`);
      console.log(`  extraction path:   ${diagnostics.path}`);
      if (diagnostics.parse) {
        console.log(`  body lines parsed: ${diagnostics.parse.bodyLines}, explicit ## sections: ${diagnostics.parse.hasExplicitCategories === true}`);
        console.log(`  items per section: ${JSON.stringify(diagnostics.parse.counts)}`);
      }
      if (diagnostics.fallback) {
        console.log(`  fallback source:   ${diagnostics.fallback.using} (${diagnostics.fallback.bulletLines} bullets of ${diagnostics.fallback.candidateLines} non-noise lines)`);
      }
      console.log(`  insert at line:    ${diagnostics.insertIndex} (before ${diagnostics.insertAnchor})`);
      console.log(`  entry size:        ${newEntry.length} chars, ${newEntry.split('\n').length} lines`);
      console.log(`  CHANGELOG.md:      ${changelogContent.length} -> ${updatedChangelog.length} chars`);
    });

    const problems = validateEntry(newEntry);
    for (const problem of problems) {
      warn(`Changelog entry looks wrong: ${problem}`);
    }

    console.log('✅ CHANGELOG.md updated successfully');

    const summaryLines = [`### Changelog entry for v${version}`, ''];
    if (problems.length > 0) {
      summaryLines.push(`**${problems.length} sanity check(s) failed - review the entry before release:**`, '');
      problems.forEach(problem => summaryLines.push(`- ${problem}`));
      summaryLines.push('');
    }
    summaryLines.push('```markdown', newEntry.trimEnd(), '```', '');
    appendSummary(summaryLines.join('\n'));

  } catch (error) {
    annotateError(`Failed to update changelog: ${error.message}`);
    console.error(error.stack);

    group('State at failure', () => {
      console.error(`  version: ${JSON.stringify(version)} (${versionInput.source})`);
      console.error(`  title:   ${JSON.stringify(prTitle)} (${prTitleInput.source})`);
      console.error(`  body:    ${prBody.length} chars (${prBodyInput.source})`);
      console.error(`  number:  ${JSON.stringify(prNumber)} (${prNumberInput.source})`);
      console.error(`  author:  ${JSON.stringify(prAuthor)} (${prAuthorInput.source})`);
      console.error(`  cwd:     ${process.cwd()}`);
      console.error(`  CHANGELOG.md exists: ${fs.existsSync(changelogPath)}`);
      console.error(`  diagnostics so far: ${JSON.stringify(diagnostics)}`);
    });

    appendSummary([
      '### Changelog step failed',
      '',
      `\`${error.message}\``,
      '',
      `Inputs: version \`${version}\`, PR #\`${prNumber}\` by \`${prAuthor}\`, body ${prBody.length} chars.`,
      'Full state is in the "State at failure" group in the job log.'
    ].join('\n'));

    process.exit(1);
  }
}

main();
