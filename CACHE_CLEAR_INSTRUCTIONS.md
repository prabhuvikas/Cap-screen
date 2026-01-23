# COMPLETE CHROME EXTENSION CACHE CLEARING

## Method 1: Chrome Restart (Most Reliable)
1. Go to chrome://extensions/
2. **REMOVE** "Cred Issue Reporter" (click Remove button)
3. **COMPLETELY CLOSE Chrome** (all windows, check system tray)
4. **Restart Chrome**
5. Go to chrome://extensions/
6. Enable "Developer mode" (top right toggle)
7. Click "Load unpacked"
8. Select folder: /home/user/Cap-screen

## Method 2: Clear Service Worker Cache
1. Go to chrome://serviceworker-internals/
2. Find "Cred Issue Reporter" 
3. Click "Unregister" next to it
4. Go to chrome://extensions/
5. Reload the extension (🔄 button)

## Method 3: Clear All Browser Cache
1. Press Ctrl+Shift+Delete
2. Select "All time"
3. Check ONLY "Cached images and files"
4. Click "Clear data"
5. Go to chrome://extensions/ and reload extension

## Method 4: Force Update (try this if above don't work)
1. Close ALL Chrome windows
2. Navigate to Chrome's extension cache folder and delete it:
   - Windows: %LocalAppData%\Google\Chrome\User Data\Default\Extensions
   - Mac: ~/Library/Application Support/Google/Chrome/Default/Extensions
   - Linux: ~/.config/google-chrome/Default/Extensions
3. Restart Chrome
4. Load extension unpacked again
