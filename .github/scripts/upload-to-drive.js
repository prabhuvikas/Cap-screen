#!/usr/bin/env node

/**
 * Upload extension ZIP to Google Drive
 * Uses service account authentication
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get arguments
const zipFile = process.argv[2];
const version = process.argv[3];

if (!zipFile || !version) {
  console.error('Usage: node upload-to-drive.js <zip-file> <version>');
  process.exit(1);
}

// Get credentials from environment
const credentialsJson = process.env.GOOGLE_DRIVE_CREDENTIALS;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!credentialsJson) {
  console.error('❌ GOOGLE_DRIVE_CREDENTIALS environment variable not set');
  process.exit(1);
}

if (!folderId) {
  console.error('❌ GOOGLE_DRIVE_FOLDER_ID environment variable not set');
  process.exit(1);
}

console.log(`Uploading ${zipFile} to Google Drive...`);

// Parse credentials
let credentials;
try {
  credentials = JSON.parse(credentialsJson);
} catch (error) {
  console.error('❌ Failed to parse Google Drive credentials JSON:', error.message);
  process.exit(1);
}

// Verify zip file exists
if (!fs.existsSync(zipFile)) {
  console.error(`❌ ZIP file not found: ${zipFile}`);
  process.exit(1);
}

/**
 * Create JWT token for service account authentication
 */
function createJWT(credentials) {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');

  const crypto = require('crypto');
  const signatureInput = `${base64Header}.${base64Claim}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signatureInput)
    .sign(credentials.private_key, 'base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Get access token from Google OAuth2
 */
function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.access_token);
        } else {
          reject(new Error(`Failed to get access token: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Upload file to Google Drive
 */
function uploadFile(accessToken, zipFile, fileName, folderId) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(zipFile);
    const fileSize = fileContent.length;

    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/zip\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      fileContent.toString('base64') +
      closeDelimiter;

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: '/upload/drive/v3/files?uploadType=multipart',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(multipartRequestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          resolve(response.id);
        } else {
          reject(new Error(`Failed to upload file: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(multipartRequestBody);
    req.end();
  });
}

/**
 * Make file publicly accessible
 */
function makeFilePublic(accessToken, fileId) {
  return new Promise((resolve, reject) => {
    const permission = {
      role: 'reader',
      type: 'anyone'
    };

    const postData = JSON.stringify(permission);

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: `/drive/v3/files/${fileId}/permissions`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve();
        } else {
          reject(new Error(`Failed to make file public: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Step 1: Creating JWT...');
    const jwt = createJWT(credentials);

    console.log('Step 2: Getting access token...');
    const accessToken = await getAccessToken(jwt);
    console.log('✅ Access token obtained');

    const fileName = path.basename(zipFile);
    console.log(`Step 3: Uploading ${fileName}...`);
    const fileId = await uploadFile(accessToken, zipFile, fileName, folderId);
    console.log(`✅ File uploaded with ID: ${fileId}`);

    console.log('Step 4: Making file publicly accessible...');
    await makeFilePublic(accessToken, fileId);
    console.log('✅ File is now publicly accessible');

    const driveLink = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log('\n📦 Upload complete!');
    console.log(`View link: ${driveLink}`);
    console.log(`Download link: ${downloadLink}`);

    // Save link to file for workflow to read
    fs.writeFileSync('drive-link.txt', driveLink);

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }
}

main();
