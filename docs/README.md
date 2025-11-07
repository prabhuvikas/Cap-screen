# GitHub Pages Documentation

This directory contains the GitHub Pages site for the Cred Issue Reporter extension.

## Contents

- **privacy-policy.html** - Privacy policy for Chrome Web Store compliance
- **index.html** - Redirects to privacy policy

## Accessing the Privacy Policy

Once GitHub Pages is enabled, the privacy policy will be available at:
```
https://prabhuvikas.github.io/Cap-screen/privacy-policy.html
```

## Enabling GitHub Pages

1. Go to your repository settings: https://github.com/prabhuvikas/Cap-screen/settings/pages
2. Under "Source", select the branch you want to use (e.g., `main`)
3. Under "Folder", select `/docs`
4. Click "Save"
5. Wait 1-2 minutes for deployment
6. Visit https://prabhuvikas.github.io/Cap-screen/privacy-policy.html to verify

## After GitHub Pages is Enabled

Add the privacy policy URL to your manifest.json:

```json
{
  "manifest_version": 3,
  "name": "Cred Issue Reporter",
  "privacy_policy": "https://prabhuvikas.github.io/Cap-screen/privacy-policy.html",
  ...
}
```

Then update the Chrome Web Store listing with this URL.
