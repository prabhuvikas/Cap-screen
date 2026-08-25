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

// Anything not in includePatterns stays out. The previous approach - zip the
// whole tree and subtract excludePatterns - silently shipped .git/, .github/,
// tests/, package.json and the helper shell scripts, because `zip -x "dir/"`
// does not match a directory's contents (zip wants "dir/*").

// Entries that must never appear in a published extension, checked after the
// zip is built so a mistake in includePatterns fails the build here rather
// than reaching the Chrome Web Store.
const forbiddenEntry = [
  /^\.git\//,
  /^\.github\//,
  /^node_modules\//,
  /^tests?\//,
  /^docs\//,
  /^(package|package-lock|jest\.config)\./,
  /^\.gitignore$/,
  /^CHANGELOG\.md$/,
  /\.(sh|bat|ps1)$/
];

try {
  // Remove old zip if exists
  if (fs.existsSync(zipFileName)) {
    fs.unlinkSync(zipFileName);
    console.log(`Removed old ${zipFileName}`);
  }

  const missing = includePatterns.filter(
    pattern => !fs.existsSync(pattern.replace(/\/$/, ''))
  );
  if (missing.length > 0) {
    throw new Error(`Nothing to package for: ${missing.join(', ')}`);
  }

  // -r: recursive, -q: quiet. Only the include list goes in.
  const inputs = includePatterns.map(pattern => `"${pattern}"`).join(' ');
  // Dev files that live inside otherwise-shipping directories, e.g.
  // assets/create-icons.sh.
  const zipCommand =
    `zip -r -q "${zipFileName}" ${inputs} ` +
    '-x "*/.DS_Store" -x "*.sh" -x "*.bat" -x "*.ps1"';

  console.log('Creating ZIP file...');
  execSync(zipCommand, { stdio: 'inherit' });

  // Verify zip was created
  if (!fs.existsSync(zipFileName)) {
    throw new Error('ZIP file was not created');
  }

  const entries = execSync(`unzip -Z1 "${zipFileName}"`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);

  if (!entries.includes('manifest.json')) {
    throw new Error('ZIP does not contain manifest.json');
  }

  const leaked = entries.filter(entry =>
    forbiddenEntry.some(pattern => pattern.test(entry))
  );
  if (leaked.length > 0) {
    throw new Error(
      `ZIP contains ${leaked.length} file(s) that must not ship, ` +
      `starting with: ${leaked.slice(0, 5).join(', ')}`
    );
  }

  const stats = fs.statSync(zipFileName);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('✅ Extension ZIP created successfully');
  console.log(`File: ${zipFileName}`);
  console.log(`Size: ${fileSizeMB} MB`);

  console.log(`Entries: ${entries.length} (no dev, test or VCS files)`);

  // Top-level breakdown, so the log shows the shape of the package without
  // listing several hundred paths.
  const byTop = entries.reduce((acc, entry) => {
    const top = entry.includes('/') ? `${entry.split('/')[0]}/` : entry;
    acc[top] = (acc[top] || 0) + 1;
    return acc;
  }, {});
  console.log('\nZIP Contents:');
  Object.keys(byTop).sort().forEach(top => {
    console.log(`  ${top}${byTop[top] > 1 ? ` (${byTop[top]} files)` : ''}`);
  });

} catch (error) {
  console.error('❌ Error building extension:', error.message);
  process.exit(1);
}
