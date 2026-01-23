# Windows Chrome Extension Cache Fix

This guide provides Windows-specific solutions to fix Chrome extension caching issues.

## 🚨 Problem

Chrome extensions sometimes cache files aggressively, preventing updates from loading even after clicking the reload button in `chrome://extensions/`.

## ✅ Solutions for Windows Users

### Option 1: PowerShell Script (RECOMMENDED)

The PowerShell script provides the most features including:
- Automatic Chrome process detection
- Option to auto-close Chrome
- Shows cache folder sizes
- Color-coded output
- Lists installed extensions

**How to run:**

1. **Locate the script:** `CHROME_CACHE_FIX_WINDOWS.ps1`

2. **Right-click** the file → Select **"Run with PowerShell"**

3. **If you get a security error:**
   - Open PowerShell as Administrator
   - Run this command:
     ```powershell
     Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
     ```
   - Close PowerShell
   - Try running the script again

4. **Follow the prompts:**
   - Script will detect if Chrome is running
   - Choose whether to close Chrome automatically
   - Choose which caches to clear
   - Script will show you exactly what was deleted

### Option 2: Batch File (SIMPLE)

The batch file is simpler and doesn't require changing execution policies.

**How to run:**

1. **Double-click:** `CHROME_CACHE_FIX_WINDOWS.bat`

2. **Follow the prompts:**
   - Close Chrome if it's running
   - Choose which caches to clear

### Option 3: Manual Deletion

If you prefer to do it manually:

1. **Close ALL Chrome windows** (check system tray too!)

2. **Press** `Win + R` and type:
   ```
   %LOCALAPPDATA%\Google\Chrome\User Data
   ```
   Then press Enter

3. **Navigate to** the `Default` folder

4. **Delete these folders:**
   - `Service Worker`
   - `Cache`
   - `Code Cache`
   - `GPUCache`

5. **Restart Chrome**

6. **Reload your extension:**
   - Go to `chrome://extensions/`
   - Click the reload button (🔄) on your extension

---

## 📋 What Gets Deleted?

| Folder | What it does | Safe to delete? |
|--------|--------------|-----------------|
| `Service Worker` | Caches background scripts and service workers | ✅ Yes |
| `Cache` | HTTP cache for web resources | ✅ Yes |
| `Code Cache` | Compiled JavaScript code | ✅ Yes |
| `GPUCache` | Graphics rendering cache | ✅ Yes |

**Note:** These folders will be automatically recreated by Chrome when needed. You won't lose any important data.

---

## 🔍 Verifying the Cache was Cleared

After running the script and reloading your extension:

1. Open the extension popup
2. Press **F12** to open DevTools
3. Look for these console messages:
   ```
   🚨 IMMEDIATE TEST: popup.html loaded! Version 2024-01-16-v9-CACHE-BUST
   🚨 If you see v9-CACHE-BUST, the new HTML is loaded!
   ```

4. Check the footer of the popup - it should say:
   ```
   v2.0.9-CACHE-BUST
   ```

If you see these, the cache was successfully cleared! ✅

---

## 💡 Alternative: Use chrome://restart

Instead of manually closing Chrome, you can use Chrome's built-in restart:

1. In Chrome, type in the address bar: `chrome://restart`
2. Chrome will automatically close and restart
3. All cache will be cleared
4. Reload your extension at `chrome://extensions/`

---

## ⚠️ Troubleshooting

### "Cannot delete folder - access denied"

**Solution:** Make sure Chrome is completely closed:
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Look for **all** `Google Chrome` processes
3. Select each one and click "End Task"
4. Run the cache clearing script again

### "Execution policy error" (PowerShell only)

**Solution:** Run this command in PowerShell (as Administrator):
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass -Force
```

### Script doesn't find Chrome folders

**Solution:**
1. Make sure Chrome is installed
2. Run Chrome at least once before trying to clear cache
3. Check if Chrome is installed in a custom location
4. Look in: `C:\Users\[YourUsername]\AppData\Local\Google\Chrome\User Data`

### Extension still shows old version after cache clear

**Solution:**
1. Try the **chrome://restart** method
2. Or try **Incognito mode:**
   - `chrome://extensions/` → Enable "Allow in incognito"
   - Open incognito window (Ctrl+Shift+N)
   - Test extension there
3. Or **completely remove and reinstall** the extension

---

## 📞 Need More Help?

See the full troubleshooting guide: `CHROME_EXTENSION_TROUBLESHOOTING.md`

---

## 🎯 Quick Start (TL;DR)

**For most users:**

1. Close Chrome
2. Double-click `CHROME_CACHE_FIX_WINDOWS.bat`
3. Press Y to clear all caches
4. Restart Chrome
5. Reload extension at `chrome://extensions/`

Done! 🎉
