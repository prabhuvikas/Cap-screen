# Troubleshooting Guide

## Common Issues and Solutions

### Extension Packaging Error: "A private key for specified extension already exists"

**Error Message:**
```
A private key for specified extension already exists. Reuse that key or delete it first.
```

**Cause:**
This error occurs when packaging the Chrome extension and a `.pem` (private key) file already exists from a previous packaging attempt.

**Solutions:**

#### Option 1: Delete Existing Key Files (Recommended for Development)

```bash
# Remove .pem files from project directory
rm *.pem

# Remove .pem files from parent directory
rm ../*.pem

# Remove .crx files as well
rm *.crx ../*.crx
```

**Note:** Only delete the key if you're in development. If the extension is already published, you need the same key to maintain the extension ID.

#### Option 2: Reuse Existing Key (For Published Extensions)

If your extension is already published on Chrome Web Store, you must keep the same private key to maintain the extension ID.

1. **Find the existing .pem file:**
   ```bash
   find . -name "*.pem"
   find .. -name "*.pem"
   ```

2. **Add the key to manifest.json:**
   - First, package with the existing .pem file
   - Chrome will output a public key
   - Add that public key to manifest.json:
   ```json
   {
     "key": "YOUR_PUBLIC_KEY_HERE",
     ...
   }
   ```

#### Option 3: Proper Packaging Workflow

**For Chrome Web Store (Recommended):**

Chrome Web Store manages the key for you. Simply:

1. Create a ZIP file of your extension:
   ```bash
   # From project root
   zip -r cap-screen-extension-v1.0.0.zip . \
     -x "*.git*" \
     -x "*.pem" \
     -x "*.crx" \
     -x "*PUBLISHING_GUIDE.md" \
     -x "*TROUBLESHOOTING.md" \
     -x "*.zip"
   ```

2. Upload the ZIP directly to Chrome Web Store Developer Dashboard

3. Chrome Web Store will sign it automatically

**For Local Testing with CRX:**

Only if you need a .crx file for local distribution:

```bash
# Using Chrome/Chromium command line
google-chrome --pack-extension=/path/to/extension

# If key already exists, specify it:
google-chrome --pack-extension=/path/to/extension \
  --pack-extension-key=/path/to/extension.pem
```

**For Developer Mode:**

The easiest way for testing:

1. Open Chrome → Extensions → Enable Developer Mode
2. Click "Load unpacked"
3. Select the extension directory
4. No .pem or .crx needed!

---

### Prevention

The `.gitignore` file now includes:
```gitignore
*.pem
*.crx
*.zip
```

This prevents accidentally committing private keys to version control.

---

### Key Management Best Practices

1. **Development:**
   - Use "Load unpacked" in Chrome Developer Mode
   - Don't worry about .pem files
   - Let Chrome Web Store handle keys when publishing

2. **Publishing:**
   - Let Chrome Web Store manage the key automatically
   - Upload ZIP files, not .crx files
   - Store the auto-generated .pem file securely if Chrome creates one

3. **Updates:**
   - Chrome Web Store maintains the same key across updates
   - Just upload new ZIP files with updated version numbers
   - No manual key management needed

4. **Private Distribution:**
   - If distributing .crx files outside the store, backup your .pem file securely
   - Store it in a secure location (NOT in git)
   - Use the same .pem for all updates to maintain extension ID

---

### Additional Resources

- [Chrome Extension Packaging Documentation](https://developer.chrome.com/docs/extensions/mv3/linux_hosting/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
- [Project Publishing Guide](PUBLISHING_GUIDE.md)

---

## Other Common Issues

### Extension Not Loading

**Issue:** Extension fails to load in Chrome

**Solutions:**
1. Check manifest.json syntax (use JSON validator)
2. Verify all file paths are correct
3. Check browser console for errors
4. Ensure manifest_version is 3
5. Verify all permissions are valid

### Storage Not Persisting

**Issue:** Settings/data not saving

**Solutions:**
1. Verify "storage" permission in manifest.json
2. Check chrome.storage API usage
3. Look for errors in background service worker console
4. Ensure data size doesn't exceed limits (5MB for local storage)

### Permissions Denied

**Issue:** Permission errors in console

**Solutions:**
1. Check that required permissions are in manifest.json
2. Verify host_permissions for specific URLs
3. Reload extension after manifest changes
4. Check that user granted permissions (for optional permissions)

---

**Need more help?**
- Check the [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- Open an issue: https://github.com/prabhuvikas/Cap-screen/issues
