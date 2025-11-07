# GitHub Pages Setup Instructions

## Quick Guide: Enable GitHub Pages for Privacy Policy Hosting

Your privacy policy is ready in `docs/privacy-policy.html`. Follow these steps to make it publicly accessible:

---

## Step 1: Enable GitHub Pages (2 minutes)

### Option A: Via GitHub Web Interface (Recommended)

1. **Go to your repository settings:**
   ```
   https://github.com/prabhuvikas/Cap-screen/settings/pages
   ```

2. **Configure Source:**
   - Under "Build and deployment"
   - Source: **Deploy from a branch**
   - Branch: Select **`main`** (or your default branch)
   - Folder: Select **`/docs`**
   - Click **Save**

3. **Wait for deployment:**
   - GitHub will show "Your site is live at https://prabhuvikas.github.io/Cap-screen/"
   - Deployment typically takes 1-3 minutes
   - You'll see a green checkmark when ready

4. **Verify it works:**
   ```
   https://prabhuvikas.github.io/Cap-screen/privacy-policy.html
   ```
   - Open this URL in your browser
   - You should see your formatted privacy policy

### Option B: Via GitHub Actions (Advanced)

If you prefer GitHub Actions workflow:

1. Go to Settings → Pages
2. Source: **GitHub Actions**
3. Use the "Static HTML" workflow template
4. Commit the workflow file

---

## Step 2: Update Manifest.json (After Verification)

Once GitHub Pages is live and you've verified the privacy policy URL works:

1. **Edit `manifest.json`:**
   ```json
   {
     "manifest_version": 3,
     "name": "Cred Issue Reporter",
     "version": "1.0.0",
     "description": "Comprehensive issue reporting tool with media annotation and Redmine integration",
     "author": "Cred Issue Reporter Team",
     "homepage_url": "https://github.com/prabhuvikas/Cap-screen",
     "privacy_policy": "https://prabhuvikas.github.io/Cap-screen/privacy-policy.html",
     ...
   }
   ```

2. **Add the privacy_policy field** (shown above) after `homepage_url`

3. **Commit and push:**
   ```bash
   git add manifest.json
   git commit -m "Add privacy policy URL to manifest"
   git push
   ```

4. **Recreate the ZIP package:**
   ```bash
   # Follow the packaging instructions in PUBLISHING_GUIDE.md
   # Or use the existing package if you haven't updated manifest yet
   ```

---

## Step 3: Update Chrome Web Store Listing

When filling out the Chrome Web Store Developer Dashboard:

1. **In the "Privacy" tab:**
   - Privacy Policy URL: `https://prabhuvikas.github.io/Cap-screen/privacy-policy.html`

2. **Paste this exact URL** - it must be publicly accessible via HTTPS

---

## Troubleshooting

### "404 Not Found" when accessing the URL

**Possible causes:**
- GitHub Pages not fully deployed yet (wait 2-5 minutes)
- Wrong branch selected in settings
- Files not in the correct `/docs` folder
- Branch not pushed to GitHub yet

**Solution:**
1. Check repository settings → Pages
2. Ensure "Your site is live" message appears
3. Verify files are in the `docs/` folder on GitHub
4. Try accessing the base URL first: `https://prabhuvikas.github.io/Cap-screen/`

### Privacy policy shows raw HTML

**This shouldn't happen** - the file is already HTML with styling.

If it does:
1. Ensure the file is named `privacy-policy.html` (not `.md`)
2. Check the file was uploaded correctly to GitHub
3. Clear your browser cache and try again

### "Privacy policy URL is not accessible" error in Chrome Web Store

**Solution:**
1. Open the URL in an incognito window to verify it's public
2. Ensure the URL uses HTTPS (GitHub Pages provides this automatically)
3. Wait a few minutes if just enabled - DNS propagation
4. Check there are no typos in the URL

---

## Alternative: Use a Different Domain

If you prefer to host on your own domain:

1. Upload `docs/privacy-policy.html` to your web server
2. Ensure it's accessible via HTTPS
3. Use your domain URL in manifest.json and Chrome Web Store

Example:
```
https://www.yourcompany.com/cred-issue-reporter/privacy-policy.html
```

---

## Verification Checklist

Before submitting to Chrome Web Store:

- [ ] GitHub Pages enabled in repository settings
- [ ] Privacy policy accessible at: `https://prabhuvikas.github.io/Cap-screen/privacy-policy.html`
- [ ] URL loads in browser (test in incognito mode)
- [ ] Privacy policy is properly formatted and readable
- [ ] URL uses HTTPS (required by Chrome Web Store)
- [ ] manifest.json updated with privacy_policy field (optional but recommended)
- [ ] Privacy policy URL ready to paste in Chrome Web Store form

---

## Next Steps

After GitHub Pages is set up:

1. ✅ Privacy policy hosted - **DONE**
2. ⏭️ Create promotional tile (see `promotional-tile.html`)
3. ⏭️ Capture screenshots
4. ⏭️ Fill out Chrome Web Store listing
5. ⏭️ Submit for review

See `PUBLISHING_GUIDE.md` for complete submission instructions.

---

## Need Help?

**GitHub Pages Documentation:**
https://docs.github.com/en/pages/getting-started-with-github-pages

**Questions?**
Open an issue: https://github.com/prabhuvikas/Cap-screen/issues

---

**Created:** 2025-11-07
**Status:** Ready to enable
