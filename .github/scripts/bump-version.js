#!/usr/bin/env node

/**
 * Bump version script for Chrome Extension
 * Updates version in manifest.json based on semantic versioning
 */

const fs = require('fs');
const path = require('path');

// Get version bump type from command line argument
const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}`);
  console.error('Valid types: major, minor, patch');
  process.exit(1);
}

// Read manifest.json
const manifestPath = path.join(process.cwd(), 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('manifest.json not found!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const currentVersion = manifest.version;

console.log(`Current version: ${currentVersion}`);
console.log(`Bump type: ${bumpType}`);

// Parse version
const versionParts = currentVersion.split('.').map(Number);
if (versionParts.length !== 3 || versionParts.some(isNaN)) {
  console.error(`Invalid version format: ${currentVersion}`);
  process.exit(1);
}

let [major, minor, patch] = versionParts;

// Bump version based on type
switch (bumpType) {
  case 'major':
    major++;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor++;
    patch = 0;
    break;
  case 'patch':
    patch++;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;
console.log(`New version: ${newVersion}`);

// Update manifest
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log('✅ manifest.json updated successfully');
console.log(`Version: ${currentVersion} → ${newVersion}`);

// Exit with success
process.exit(0);
