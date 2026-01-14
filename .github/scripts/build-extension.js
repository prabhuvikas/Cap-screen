#!/usr/bin/env node

/**
 * Build Chrome Extension ZIP file
 * Creates a distribution-ready ZIP excluding dev files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read version from manifest
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const version = manifest.version;

const zipFileName = `Cap-screen-v${version}.zip`;

console.log(`Building Chrome Extension v${version}...`);

// Files and directories to include in the extension
const includePatterns = [
  'manifest.json',
  'popup/',
  'background/',
  'content/',
  'annotate/',
  'options/',
  'lib/',
  'assets/',
  'offscreen/',
  'PRIVACY_POLICY.md',
  'README.md'
];

// Files and directories to exclude
const excludePatterns = [
  '.git/',
  '.github/',
  'node_modules/',
  '*.zip',
  '.DS_Store',
  'debug.log',
  'diff.txt',
  '*.md', // Exclude all markdown except the ones we explicitly include
  'docs/',
  'CHROME_WEBSTORE_REVIEW.md',
  'CONTENT_SCRIPT_ERROR_FIXES.md',
  'INSTALL.md',
  'PR_BUG_FIXES.md',
  'PUBLISHING_GUIDE.md',
  'RELEASE_NOTES_*.md',
  'SETUP_GITHUB_PAGES.md',
  'STORAGE_QUOTA_FIXES.md',
  'STORE_LISTING.md',
  'news.md',
  'CHANGELOG.md',
  'promotional-tile.html'
];

// Build exclusion flags for zip command
const excludeFlags = excludePatterns
  .map(pattern => `-x "${pattern}"`)
  .join(' ');

try {
  // Remove old zip if exists
  if (fs.existsSync(zipFileName)) {
    fs.unlinkSync(zipFileName);
    console.log(`Removed old ${zipFileName}`);
  }

  // Create zip using system zip command
  // -r: recursive
  // -q: quiet mode
  // We include everything then exclude patterns
  const zipCommand = `zip -r -q "${zipFileName}" . ${excludeFlags}`;

  console.log('Creating ZIP file...');
  execSync(zipCommand, { stdio: 'inherit' });

  // Verify zip was created
  if (!fs.existsSync(zipFileName)) {
    throw new Error('ZIP file was not created');
  }

  const stats = fs.statSync(zipFileName);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ Extension ZIP created successfully');
  console.log(`File: ${zipFileName}`);
  console.log(`Size: ${fileSizeMB} MB`);

  // List contents for verification
  console.log('\nZIP Contents:');
  execSync(`unzip -l "${zipFileName}" | head -20`, { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Error building extension:', error.message);
  process.exit(1);
}
