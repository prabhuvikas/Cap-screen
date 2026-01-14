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
  console.error('❌ Missing Redmine configuration:');
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
    console.error('❌ CHANGELOG.md not found');
    return null;
  }

  const changelog = fs.readFileSync(changelogPath, 'utf8');

  // Find the section for this version
  const versionHeader = `## [${version}]`;
  const versionIndex = changelog.indexOf(versionHeader);

  if (versionIndex === -1) {
    console.warn(`⚠️  Version ${version} not found in CHANGELOG.md`);
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
 * Format changelog as Redmine textile markup
 */
function formatForRedmine(changelog, driveLink) {
  if (!changelog) {
    changelog = 'Release notes coming soon.';
  }

  // Convert markdown to Redmine textile
  let textile = changelog
    // Convert markdown headers (###) to Redmine headers (h3.)
    .replace(/^#### (.+)$/gm, 'h4. $1')
    .replace(/^### (.+)$/gm, 'h3. $1')
    .replace(/^## (.+)$/gm, 'h2. $1')
    // Convert bold **text** to *text*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // Convert markdown lists with proper indentation
    .replace(/^- /gm, '* ')
    .replace(/^  - /gm, '** ')
    .replace(/^    - /gm, '*** ');

  // Add download section
  const downloadSection = `

h3. Download

Download the latest version of Cred Issue Reporter:

* "Chrome Extension v${version}":${driveLink}

h3. Installation

# Download the ZIP file from the link above
# Extract the ZIP file
# Open Chrome and navigate to chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" and select the extracted folder
# The extension is now installed and ready to use

---

For support and bug reports, visit: "GitHub Issues":https://github.com/prabhuvikas/Cap-screen/issues`;

  return textile + downloadSection;
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

        if (res.statusCode === 201) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (e) {
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
      console.log('✅ Changelog extracted');
      console.log('Preview:', changelog.substring(0, 200) + '...\n');
    } else {
      console.warn('⚠️  Using default changelog');
    }

    console.log('Step 2: Formatting for Redmine...');
    const description = formatForRedmine(changelog, driveLink);
    console.log('✅ Formatted for Redmine\n');

    const title = `Cred Issue Reporter v${version} Released`;
    const summary = `New version ${version} of Cred Issue Reporter is now available for download`;

    console.log('Step 3: Creating Redmine news...');
    const response = await createRedmineNews(title, description, summary);

    console.log('\n✅ Redmine news created successfully!');
    console.log(`\nView at: ${serverUrl}/projects/${projectId}/news`);

  } catch (error) {
    console.error('❌ Failed to create Redmine news:', error.message);

    // Provide helpful debugging info
    console.error('\nDebugging information:');
    console.error(`- Redmine Server: ${serverUrl}`);
    console.error(`- Project ID: ${projectId}`);
    console.error(`- API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'not set'}`);

    process.exit(1);
  }
}

main();
