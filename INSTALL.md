# Installation Guide - Cred Issue Reporter Extension

## Quick Start

### Step 1: Load Extension into Chrome

1. Open Google Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle in the top-right corner
4. Click **Load unpacked** button
5. Navigate to and select the `Cap-screen` directory (the folder containing `manifest.json`)
6. The Issue Reporter extension should now appear in your extensions list

### Step 2: Pin the Extension (Recommended)

1. Click the **Extensions** icon (puzzle piece) in Chrome toolbar
2. Find **Cred Issue Reporter** in the list
3. Click the **pin** icon to pin it to your toolbar for easy access

### Step 3: Configure Redmine Integration

1. Click the **Issue Reporter** icon in your Chrome toolbar
2. Click the **Settings** icon (⚙️) in the popup, or
3. Right-click the extension icon and select **Options**
4. In the settings page:
   - Enter your **Redmine Server URL** (e.g., `https://redmine.example.com`)
   - Enter your **Redmine API Key**
     - To find your API key:
       1. Log into your Redmine instance
       2. Go to **My account** (top-right corner)
       3. Click **Show** under **API access key** section
       4. Copy the API key
   - Click **Test Connection** to verify your credentials
   - (Optional) Select a **Default Project** for quick bug reporting
   - Configure **Privacy Settings** as needed
   - Click **Save Settings**

### Step 4: Test the Extension

1. Navigate to any webpage (e.g., `https://example.com`)
2. Click the **Issue Reporter** icon in the toolbar
3. Click **Capture Viewport** to take a screenshot
4. Try the annotation tools
5. Click **Continue to Report**
6. Fill in the bug report form
7. Click **Submit Bug Report**

## Keyboard Shortcuts

- **Open Issue Reporter**: `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac)

## Getting Your Redmine API Key

### Method 1: Web Interface

1. Log into your Redmine instance
2. Click your name in the top-right corner
3. Select **My account**
4. Look for the **API access key** section on the right side
5. Click **Show** to reveal your API key
6. Click **Reset** if you need to generate a new key
7. Copy the key and paste it into the extension settings

### Method 2: API Request (Advanced)

If your administrator has configured Redmine to allow it:

```bash
curl -X POST https://redmine.example.com/users/current.json \
  -H "Content-Type: application/json" \
  -d '{"login": "your_username", "password": "your_password"}'
```

The response will include your API key.

## Redmine Server Requirements

Your Redmine instance must meet these requirements:

1. **Redmine Version**: 3.0 or higher recommended
2. **REST API Enabled**: Must be enabled in Administration → Settings → API
3. **CORS Configuration** (if applicable): May need to allow cross-origin requests
4. **Permissions**: Your Redmine user must have:
   - Permission to view projects
   - Permission to create issues
   - Permission to upload files
   - Permission to view project members (for assignee selection)

## Verifying Installation

After installation, you should see:

1. Issue Reporter icon in Chrome toolbar (if pinned)
2. Extension listed in `chrome://extensions/`
3. Ability to open the popup by clicking the icon
4. Settings page accessible via the settings icon

## Troubleshooting Installation

### Extension Not Loading

- Ensure you selected the correct directory (containing `manifest.json`)
- Check Chrome DevTools console for errors
- Verify all required files are present
- Try removing and re-adding the extension

### Connection Test Failing

- Verify Redmine URL is correct and accessible
- Ensure API key is valid (try logging into Redmine)
- Check if Redmine REST API is enabled
- Verify your network allows access to Redmine server
- Check for CORS issues (open browser console)

### Screenshots Not Working

- Grant necessary permissions when prompted
- Reload the page you're trying to capture
- Check browser console for permission errors

### Content Script Errors

- Refresh the page after installing/updating the extension
- Check if the website has Content Security Policy restrictions
- Try on a different website to isolate the issue

## Updating the Extension

When updates are available:

1. Pull latest changes from repository
2. Go to `chrome://extensions/`
3. Click the **Reload** icon on the Issue Reporter extension
4. Your settings will be preserved

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find **Cred Issue Reporter**
3. Click **Remove**
4. Confirm removal

Note: All settings and cached data will be deleted.

## Security Notes

- API keys are stored securely using Chrome's storage API
- API keys are synced across your Chrome browsers (if sync is enabled)
- Sensitive data is automatically sanitized if enabled in settings
- Network data is stored temporarily in memory and cleared after 1 hour
- The extension only accesses pages when you explicitly use it

## Getting Help

If you encounter issues:

1. Check the [README.md](README.md) for detailed documentation
2. Review the Troubleshooting section above
3. Check browser console for error messages
4. Open an issue on the GitHub repository

## Next Steps

After installation:

1. Configure your privacy settings
2. Set up default project and preferences
3. Test creating a bug report
4. Share the extension with your team
5. Customize settings based on your workflow

---

**Need Help?** Check the [README.md](README.md) for full documentation and troubleshooting.
