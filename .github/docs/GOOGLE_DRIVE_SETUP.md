# Google Drive Setup for Automated Releases

This guide explains how to set up Google Drive integration for automated extension release uploads.

## Overview

The release workflow automatically uploads the Chrome extension ZIP file to a Google Drive folder and generates a shareable link. This requires:

1. A Google Cloud project with Drive API enabled
2. A service account with credentials
3. A shared Google Drive folder

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `cap-screen-releases` (or your preferred name)
4. Click **"Create"**
5. Wait for the project to be created, then select it

---

## Step 2: Enable Google Drive API

1. In your Google Cloud project, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on **"Google Drive API"**
4. Click **"Enable"**
5. Wait for the API to be enabled

---

## Step 3: Create Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in the details:
   - **Service account name**: `github-actions-uploader`
   - **Service account ID**: (auto-generated)
   - **Description**: `Service account for automated GitHub releases`
4. Click **"Create and Continue"**
5. **Grant this service account access** (optional): Skip this step
6. Click **"Continue"**
7. **Grant users access** (optional): Skip this step
8. Click **"Done"**

---

## Step 4: Create Service Account Key

1. In the **"Credentials"** page, find your service account
2. Click on the service account email (e.g., `github-actions-uploader@...`)
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** as the key type
6. Click **"Create"**
7. The JSON key file will be automatically downloaded
8. **IMPORTANT**: Keep this file secure! It provides full access to the service account

The downloaded JSON file will look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "github-actions-uploader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

---

## Step 5: Create Google Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder (e.g., "Cap-screen Releases")
3. Open the folder and copy the **Folder ID** from the URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```
4. Right-click the folder → **"Share"**
5. Add the service account email as an editor:
   - Paste: `github-actions-uploader@your-project.iam.gserviceaccount.com`
   - Role: **"Editor"**
6. Click **"Share"**
7. **Optional**: Change folder sharing settings to "Anyone with the link can view" if you want public access

---

## Step 6: Configure GitHub Secrets

Now add the credentials to your GitHub repository:

### 6.1 Add Google Drive Credentials

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `GOOGLE_DRIVE_CREDENTIALS`
5. Value: Paste the **entire contents** of the JSON key file you downloaded
6. Click **"Add secret"**

### 6.2 Add Folder ID

1. Click **"New repository secret"**
2. Name: `GOOGLE_DRIVE_FOLDER_ID`
3. Value: Paste the folder ID from Step 5
4. Click **"Add secret"**

### 6.3 Add Redmine Credentials

1. Click **"New repository secret"**
2. Name: `REDMINE_API_KEY`
3. Value: Your Redmine API key
4. Click **"Add secret"**

5. Click **"New repository secret"**
6. Name: `REDMINE_SERVER_URL`
7. Value: Your Redmine server URL (e.g., `https://redmine.example.com`)
8. Click **"Add secret"**

9. Click **"New repository secret"**
10. Name: `REDMINE_PROJECT_ID`
11. Value: Your Redmine project identifier (e.g., `cap-screen`)
12. Click **"Add secret"**

---

## Step 7: Verify Setup

Your GitHub Secrets should now include:

- ✅ `GOOGLE_DRIVE_CREDENTIALS` - JSON service account key
- ✅ `GOOGLE_DRIVE_FOLDER_ID` - Target folder ID
- ✅ `REDMINE_API_KEY` - Redmine API key
- ✅ `REDMINE_SERVER_URL` - Redmine server URL
- ✅ `REDMINE_PROJECT_ID` - Redmine project identifier

---

## Testing

To test the setup:

1. Create a test PR with a small change
2. Label it with `version:patch`
3. Merge the PR
4. Check the **Actions** tab for the workflow run
5. If successful, check your Google Drive folder for the uploaded ZIP
6. Check your Redmine project for the news entry

---

## Troubleshooting

### Error: "Failed to get access token"

**Cause**: Invalid service account credentials

**Solution**:
- Verify the JSON key is correctly copied to GitHub Secrets
- Ensure no extra spaces or line breaks were added
- Try creating a new service account key

### Error: "Failed to upload file"

**Cause**: Service account doesn't have access to the folder

**Solution**:
- Verify the service account email is shared with the folder
- Check the folder ID is correct
- Ensure the service account has "Editor" permissions

### Error: "Folder ID not found"

**Cause**: Invalid folder ID

**Solution**:
- Open the folder in Google Drive
- Copy the ID from the URL (after `/folders/`)
- Update the `GOOGLE_DRIVE_FOLDER_ID` secret

### Error: "Failed to make file public"

**Cause**: Folder sharing settings prevent public access

**Solution**:
- Open the folder in Google Drive
- Right-click → "Share"
- Change to "Anyone with the link can view"

---

## Security Best Practices

1. **Never commit** the service account JSON key to your repository
2. **Use GitHub Secrets** for all sensitive data
3. **Limit service account permissions** to only Google Drive
4. **Rotate keys regularly** (every 90 days recommended)
5. **Monitor access logs** in Google Cloud Console
6. **Delete old keys** after rotation

---

## Additional Resources

- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## Support

If you encounter issues:

1. Check the GitHub Actions logs for detailed error messages
2. Verify all secrets are correctly configured
3. Test the service account credentials manually using Google Drive API
4. Contact your Google Workspace admin if you have permission issues
