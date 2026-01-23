# Chrome Extension Cache Troubleshooting Guide

## Problem: Extension changes not loading even after reload

This is a common Chrome extension caching issue. Try these solutions **IN ORDER**:

---

## Solution 1: Disable Cache in DevTools (EASIEST - TRY THIS FIRST!)

1. Click the extension icon
2. Right-click the popup → **Inspect**
3. In DevTools, go to the **Network** tab
4. Check the box: **"Disable cache"** (top of the Network tab)
5. Keep DevTools OPEN
6. Close and reopen the popup
7. The extension should now load fresh files every time

**⚠️ IMPORTANT: DevTools must stay open for this to work!**

---

## Solution 2: Use chrome://restart (FAST & EFFECTIVE)

1. Go to `chrome://extensions/`
2. Remove "Cred Issue Reporter"
3. Type in address bar: `chrome://restart`
4. Chrome will automatically restart
5. Go to `chrome://extensions/`
6. Load unpacked → `/home/user/Cap-screen`

---

## Solution 3: Clear Service Worker Cache

Service Workers are notorious for caching aggressively.

1. Go to `chrome://serviceworker-internals/`
2. Search for "Cred" or your extension
3. Click **"Unregister"** next to it
4. Go to `chrome://extensions/`
5. **Remove** the extension
6. Type in address bar: `chrome://restart`
7. After restart, load unpacked again

---

## Solution 4: Hard Reset with Profile Reload

### For Linux:
1. Close ALL Chrome windows
2. Run the cache clear script:
   ```bash
   cd /home/user/Cap-screen
   ./CHROME_CACHE_FIX.sh
   ```
3. Or manually delete cache:
   ```bash
   rm -rf ~/.config/google-chrome/Default/Service\ Worker
   rm -rf ~/.cache/google-chrome/Default/Cache
   rm -rf ~/.cache/google-chrome/Default/Code\ Cache
   ```
4. Restart Chrome
5. Load extension

### For Windows (Batch File):
1. Close ALL Chrome windows
2. Double-click: `CHROME_CACHE_FIX_WINDOWS.bat`
3. Follow the prompts
4. Restart Chrome
5. Load extension

### For Windows (PowerShell - Recommended):
1. Right-click `CHROME_CACHE_FIX_WINDOWS.ps1`
2. Select "Run with PowerShell"
3. If you get an execution policy error, run PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
   ```
4. Then run the script again
5. Follow the prompts
6. Restart Chrome
7. Load extension

### For Windows (Manual):
1. Close ALL Chrome windows
2. Press `Win + R`, type: `%LOCALAPPDATA%\Google\Chrome\User Data`
3. Delete these folders:
   - `Default\Service Worker`
   - `Default\Cache`
   - `Default\Code Cache`
   - `Default\GPUCache`
4. Restart Chrome
5. Load extension

---

## Solution 5: Test in Incognito Mode

Extensions in incognito mode don't use the same cache:

1. Go to `chrome://extensions/`
2. Find "Cred Issue Reporter"
3. Click **"Details"**
4. Enable **"Allow in incognito"**
5. Open an incognito window (Ctrl+Shift+N)
6. Test the extension there

If it works in incognito, it's definitely a cache issue!

---

## Solution 6: Change Extension ID (NUCLEAR OPTION)

This forces Chrome to treat it as a completely new extension:

1. Remove the extension from chrome://extensions/
2. Edit `/home/user/Cap-screen/manifest.json`
3. Add a random "key" field (this changes the extension ID):
   ```json
   {
     "manifest_version": 3,
     "name": "Cred Issue Reporter TEST",
     "version": "2.0.9",
     "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA",
     ...
   }
   ```
4. Load unpacked again
5. It will have a different ID and fresh cache

---

## Solution 7: Check DevTools Console for Errors

Sometimes the HTML loads but JavaScript fails:

1. Open the extension
2. Right-click → Inspect
3. Go to **Console** tab
4. Look for any RED errors
5. Share those errors for debugging

---

## What to Check After Each Solution:

After trying each solution, verify these:

1. **Version number**: Check footer shows `v2.0.9-CACHE-BUST`
2. **Console messages**: Should see `Version 2024-01-16-v9-CACHE-BUST`
3. **Red test box**: When you reach Issue Details page
4. **Yellow due date field**: Between Assignee and Category

---

## If NOTHING Works:

Try a fresh Chrome profile:

1. Close Chrome
2. Open terminal:
   ```bash
   google-chrome --user-data-dir=/tmp/chrome-test-profile
   ```
3. This opens Chrome with a completely fresh profile
4. Load the extension in this fresh profile
5. Test if it works

---

## Quick Verification Script

Run this to verify your files are correct:

```bash
cd /home/user/Cap-screen
grep "v9-CACHE-BUST" popup/popup.html
grep "2.0.9" manifest.json
grep "dueDate" popup/popup.html | head -5
```

If these commands show results, the files are correct and it's definitely a Chrome cache issue.
