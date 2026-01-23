#!/usr/bin/env node

/**
 * Upload extension ZIP to Google Drive
 * Uses service account authentication
 *
 * IMPORTANT: Service accounts don't have storage quota. The target folder
 * must be in a Shared Drive (Team Drive), not a regular user's My Drive.
 * See: https://developers.google.com/drive/api/guides/about-shareddrives
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

// Debug logging helper
const DEBUG = process.env.DEBUG === 'true' || process.env.ACTIONS_STEP_DEBUG === 'true';
function debug(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

debug('Starting Google Drive upload script');
debug(`Node version: ${process.version}`);
debug(`Working directory: ${process.cwd()}`);

if (!credentialsJson) {
  console.error('❌ GOOGLE_DRIVE_CREDENTIALS environment variable not set');
  process.exit(1);
}

debug(`Credentials JSON length: ${credentialsJson.length} characters`);

if (!folderId) {
  console.error('❌ GOOGLE_DRIVE_FOLDER_ID environment variable not set');
  process.exit(1);
}

debug(`Folder ID: ${folderId.substring(0, 8)}...${folderId.substring(folderId.length - 4)} (length: ${folderId.length})`);

console.log(`Uploading ${zipFile} to Google Drive...`);

// Parse credentials
let credentials;
try {
  debug('Parsing credentials JSON...');
  credentials = JSON.parse(credentialsJson);
  debug('Credentials parsed successfully');
  debug(`Service account email: ${credentials.client_email}`);
  debug(`Project ID: ${credentials.project_id}`);
  debug(`Private key ID: ${credentials.private_key_id ? credentials.private_key_id.substring(0, 8) + '...' : 'NOT SET'}`);
  debug(`Private key present: ${credentials.private_key ? 'Yes' : 'No'}`);
  debug(`Private key length: ${credentials.private_key ? credentials.private_key.length : 0} characters`);
} catch (error) {
  console.error('❌ Failed to parse Google Drive credentials JSON:', error.message);
  debug(`Raw credentials first 50 chars: ${credentialsJson.substring(0, 50)}...`);
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
  debug('Creating JWT token...');

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    // Using drive scope instead of drive.file to allow uploading to existing folders
    // that the service account has been shared access to
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  debug(`JWT issuer (iss): ${claim.iss}`);
  debug(`JWT scope: ${claim.scope}`);
  debug(`JWT audience (aud): ${claim.aud}`);
  debug(`JWT issued at (iat): ${claim.iat}`);
  debug(`JWT expires (exp): ${claim.exp}`);

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');

  debug(`JWT header (base64url): ${base64Header}`);
  debug(`JWT claim length: ${base64Claim.length} characters`);

  const crypto = require('crypto');
  const signatureInput = `${base64Header}.${base64Claim}`;

  debug('Signing JWT with RSA-SHA256...');
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signatureInput)
    .sign(credentials.private_key, 'base64url');

  debug(`JWT signature length: ${signature.length} characters`);
  debug('JWT created successfully');

  return `${signatureInput}.${signature}`;
}

/**
 * Get access token from Google OAuth2
 */
function getAccessToken(jwt) {
  return new Promise((resolve, reject) => {
    debug('Requesting access token from Google OAuth2...');

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

    debug(`OAuth2 request URL: https://${options.hostname}${options.path}`);
    debug(`OAuth2 request method: ${options.method}`);
    debug(`OAuth2 request body length: ${postData.length} characters`);

    const req = https.request(options, (res) => {
      let data = '';
      debug(`OAuth2 response status: ${res.statusCode}`);
      debug(`OAuth2 response headers: ${JSON.stringify(res.headers)}`);

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        debug(`OAuth2 response body length: ${data.length} characters`);

        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          debug(`Access token obtained, expires in: ${response.expires_in} seconds`);
          debug(`Token type: ${response.token_type}`);
          debug(`Access token length: ${response.access_token ? response.access_token.length : 0} characters`);
          resolve(response.access_token);
        } else {
          debug(`OAuth2 error response: ${data}`);
          reject(new Error(`Failed to get access token: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      debug(`OAuth2 request error: ${error.message}`);
      reject(error);
    });
    req.write(postData);
    req.end();
  });
}

/**
 * Verify folder exists and is accessible
 */
function verifyFolderAccess(accessToken, folderId) {
  return new Promise((resolve, reject) => {
    debug('Verifying folder access...');

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      // supportsAllDrives=true is required to access Shared Drive folders
      path: `/drive/v3/files/${folderId}?fields=id,name,mimeType,owners,permissions,driveId&supportsAllDrives=true`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    };

    debug(`Folder verification URL: https://${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      debug(`Folder verification response status: ${res.statusCode}`);

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        debug(`Folder verification response: ${data}`);

        if (res.statusCode === 200) {
          const folderInfo = JSON.parse(data);
          debug(`Folder name: ${folderInfo.name}`);
          debug(`Folder mimeType: ${folderInfo.mimeType}`);
          if (folderInfo.driveId) {
            debug(`Shared Drive ID: ${folderInfo.driveId}`);
            console.log('✅ Folder is in a Shared Drive (required for service account uploads)');
          } else {
            console.warn('⚠️  WARNING: Folder is NOT in a Shared Drive. Service accounts cannot upload to My Drive folders.');
            console.warn('   Please move the folder to a Shared Drive or use a Shared Drive folder ID.');
          }
          if (folderInfo.owners) {
            debug(`Folder owners: ${folderInfo.owners.map(o => o.emailAddress).join(', ')}`);
          }
          if (folderInfo.permissions) {
            debug(`Folder permissions count: ${folderInfo.permissions.length}`);
            folderInfo.permissions.forEach((p, i) => {
              debug(`  Permission ${i + 1}: role=${p.role}, type=${p.type}, email=${p.emailAddress || 'N/A'}`);
            });
          }
          resolve(folderInfo);
        } else if (res.statusCode === 404) {
          debug('Folder not found (404)');
          reject(new Error(
            `Folder not found (404). The folder ID "${folderId}" does not exist or is not accessible.\n` +
            `Possible causes:\n` +
            `  1. The folder ID is incorrect\n` +
            `  2. The folder has been deleted\n` +
            `  3. The service account doesn't have access to the folder\n` +
            `To fix: Share the Google Drive folder with: ${credentials.client_email}`
          ));
        } else if (res.statusCode === 403) {
          debug('Folder access forbidden (403)');
          reject(new Error(
            `Folder access forbidden (403). The service account doesn't have permission to access this folder.\n` +
            `To fix: Share the Google Drive folder with: ${credentials.client_email}\n` +
            `Make sure to grant at least "Editor" access.`
          ));
        } else {
          reject(new Error(`Failed to verify folder: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      debug(`Folder verification error: ${error.message}`);
      reject(error);
    });
    req.end();
  });
}

/**
 * Upload file to Google Drive
 * @param {string} accessToken - OAuth access token
 * @param {string} zipFile - Path to the file to upload
 * @param {string} fileName - Name for the uploaded file
 * @param {string} folderId - Parent folder ID
 * @param {string|null} driveId - Shared Drive ID (null for My Drive)
 */
function uploadFile(accessToken, zipFile, fileName, folderId, driveId = null) {
  return new Promise((resolve, reject) => {
    debug('Preparing file upload...');

    const fileContent = fs.readFileSync(zipFile);
    const fileSize = fileContent.length;
    debug(`File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

    const metadata = {
      name: fileName,
      parents: [folderId]
    };

    // For Shared Drives, include the driveId in metadata
    if (driveId) {
      debug(`Including driveId in metadata for Shared Drive: ${driveId}`);
    }

    debug(`Upload metadata: ${JSON.stringify(metadata)}`);

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

    const requestBodyLength = Buffer.byteLength(multipartRequestBody);
    debug(`Multipart request body size: ${requestBodyLength} bytes (${(requestBodyLength / 1024 / 1024).toFixed(2)} MB)`);

    // Build the upload path with query parameters
    let uploadPath = '/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true';
    // For Shared Drives, explicitly include the driveId to ensure proper routing
    if (driveId) {
      uploadPath += `&driveId=${encodeURIComponent(driveId)}`;
      debug(`Upload path includes Shared Drive ID: ${driveId}`);
    }

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: uploadPath,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': requestBodyLength
      }
    };

    debug(`Upload URL: https://${options.hostname}${options.path}`);
    debug(`Upload method: ${options.method}`);
    debug(`Upload headers: ${JSON.stringify({ ...options.headers, Authorization: 'Bearer [REDACTED]' })}`);

    const req = https.request(options, (res) => {
      let data = '';
      debug(`Upload response status: ${res.statusCode}`);
      debug(`Upload response headers: ${JSON.stringify(res.headers)}`);

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        debug(`Upload response body: ${data}`);

        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          debug(`Upload successful! File ID: ${response.id}`);
          resolve(response.id);
        } else if (res.statusCode === 404 && data.includes('File not found')) {
          reject(new Error(
            `Failed to upload file: 404 - Target folder not found or not accessible.\n` +
            `This usually means the folder ID "${folderId}" is invalid or the service account ` +
            `doesn't have access to it.\n` +
            `To fix: Share the target Google Drive folder with the service account email: ${credentials.client_email}`
          ));
        } else if (res.statusCode === 403 && data.includes('storageQuotaExceeded')) {
          reject(new Error(
            `Failed to upload file: 403 - Storage quota exceeded.\n` +
            `Service accounts don't have their own storage quota.\n` +
            `SOLUTION: The target folder must be in a Shared Drive (Team Drive), not a regular My Drive folder.\n` +
            `Steps to fix:\n` +
            `  1. Create a Shared Drive in Google Drive (or use an existing one)\n` +
            `  2. Share the Shared Drive with the service account: ${credentials.client_email}\n` +
            `  3. Update GOOGLE_DRIVE_FOLDER_ID to use a folder ID from the Shared Drive\n` +
            `See: https://developers.google.com/drive/api/guides/about-shareddrives`
          ));
        } else {
          reject(new Error(`Failed to upload file: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      debug(`Upload request error: ${error.message}`);
      reject(error);
    });
    req.write(multipartRequestBody);
    req.end();
  });
}

/**
 * Make file publicly accessible
 */
function makeFilePublic(accessToken, fileId) {
  return new Promise((resolve, reject) => {
    debug('Setting file permissions to public...');

    const permission = {
      role: 'reader',
      type: 'anyone'
    };

    const postData = JSON.stringify(permission);
    debug(`Permission payload: ${postData}`);

    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      // supportsAllDrives=true is required for files in Shared Drives
      path: `/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    debug(`Permission URL: https://${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let data = '';
      debug(`Permission response status: ${res.statusCode}`);

      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        debug(`Permission response: ${data}`);

        if (res.statusCode === 200 || res.statusCode === 201) {
          debug('File permissions set successfully');
          resolve();
        } else {
          reject(new Error(`Failed to make file public: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      debug(`Permission request error: ${error.message}`);
      reject(error);
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
    debug('=== Starting Google Drive Upload ===');
    debug(`Timestamp: ${new Date().toISOString()}`);

    console.log('Step 1: Creating JWT...');
    const jwt = createJWT(credentials);
    debug('JWT token created');

    console.log('Step 2: Getting access token...');
    const accessToken = await getAccessToken(jwt);
    console.log('✅ Access token obtained');

    console.log('Step 3: Verifying folder access...');
    let sharedDriveId = null;
    let folderVerified = false;
    try {
      const folderInfo = await verifyFolderAccess(accessToken, folderId);
      console.log(`✅ Folder verified: "${folderInfo.name}"`);
      folderVerified = true;
      // Store the driveId if this is a Shared Drive folder
      if (folderInfo.driveId) {
        sharedDriveId = folderInfo.driveId;
        console.log(`📁 Target is in Shared Drive: ${folderInfo.driveId}`);
        debug(`Will use Shared Drive ID: ${sharedDriveId} for upload`);
      }
    } catch (folderError) {
      console.error('❌ Folder verification failed:', folderError.message);
      console.error('');
      console.error('The upload cannot proceed without access to the target folder.');
      console.error('Please ensure:');
      console.error(`  1. The folder ID "${folderId}" is correct`);
      console.error(`  2. The folder is shared with the service account: ${credentials.client_email}`);
      console.error('  3. For Shared Drives: the service account must be added as a member of the Shared Drive');
      console.error('');
      throw folderError;
    }

    const fileName = path.basename(zipFile);
    debug(`File name for upload: ${fileName}`);
    console.log(`Step 4: Uploading ${fileName}...`);
    const fileId = await uploadFile(accessToken, zipFile, fileName, folderId, sharedDriveId);
    console.log(`✅ File uploaded with ID: ${fileId}`);

    console.log('Step 5: Making file publicly accessible...');
    await makeFilePublic(accessToken, fileId);
    console.log('✅ File is now publicly accessible');

    const driveLink = `https://drive.google.com/file/d/${fileId}/view`;
    const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log('\n📦 Upload complete!');
    console.log(`View link: ${driveLink}`);
    console.log(`Download link: ${downloadLink}`);

    debug(`Saving drive link to drive-link.txt`);
    // Save link to file for workflow to read
    fs.writeFileSync('drive-link.txt', driveLink);
    debug('=== Google Drive Upload Complete ===');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    debug(`Full error stack: ${error.stack}`);
    process.exit(1);
  }
}

main();
