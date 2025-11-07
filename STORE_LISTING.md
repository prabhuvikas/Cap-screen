# Chrome Web Store Listing Content

## Short Description (132 characters max)

Capture, annotate, and report bugs to Redmine with full context: screenshots, video, network logs, and console output.

---

## Detailed Description

### 🐛 The Complete Bug Reporting Solution for Developers & QA Teams

**Cred Issue Reporter** transforms bug reporting from a tedious manual process into a streamlined, context-rich experience. Capture screenshots, record videos, annotate with precision tools, and automatically include technical diagnostics—all directly integrated with your Redmine project management system.

---

### ✨ KEY FEATURES

#### 📸 **Advanced Screenshot & Video Capture**
• **Flexible Capture Modes**: Capture visible viewport or full-page screenshots
• **Video Recording**: Record tab activity to demonstrate dynamic bugs
• **High Quality**: Crystal-clear PNG screenshots and WebM video

#### 🎨 **Professional Annotation Tools**
• **Drawing Tools**: Freehand pen, shapes (rectangle, circle, arrow)
• **Blackout Tool**: Redact sensitive information (passwords, API keys, PII)
• **Text Annotations**: Add explanatory notes directly on screenshots
• **Customization**: Adjustable colors, line widths, and opacity
• **Undo/Redo**: Perfect your annotations with full edit history
• **Multi-Screenshot Support**: Annotate multiple screenshots per report
• **Zoom Feature**: Zoom in/out for precise annotations

#### 🔍 **Comprehensive Technical Context**
Automatically captures everything developers need to reproduce bugs:
• **Page Information**: URL, title, browser version, OS details
• **Network Monitoring**: All HTTP/HTTPS requests with headers and status codes
• **Console Logs**: JavaScript errors, warnings, and log messages with stack traces
• **Performance Metrics**: Page load times, DOM ready time, response times
• **System Information**: CPU cores, RAM, screen resolution, viewport size
• **Storage Data**: LocalStorage, SessionStorage, Cookies (optional)

#### 🎯 **Seamless Redmine Integration**
• **Direct API Integration**: Connect to any Redmine server
• **Rich Issue Creation**: Set project, tracker, priority, assignee, category, version
• **Automatic Attachments**: Screenshots, videos, HAR files, console logs, technical JSON
• **Batch Operations**: Handle multiple attachments efficiently
• **Custom Fields**: Support for Redmine custom fields

#### 🔒 **Privacy-First Design**
• **No Third-Party Data Collection**: Data goes ONLY to YOUR Redmine server
• **Pre-Submission Review**: See exactly what will be sent before confirming
• **Granular Controls**: Toggle network requests, console logs, storage data
• **Sensitive Data Sanitization**: Automatic removal of problematic characters
• **Local Storage Only**: Settings encrypted in Chrome's secure storage
• **Temporary Memory**: Network/console data cleared after 1 hour

---

### 🎬 HOW IT WORKS

**1. Encounter a Bug**
Navigate to the page with the issue you want to report.

**2. Capture**
Click the extension icon or use `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac):
• Choose between viewport or full-page screenshot
• Or start a video recording to demonstrate the issue

**3. Annotate**
Use professional annotation tools to highlight the problem:
• Draw arrows to point out issues
• Add shapes to highlight areas
• Use blackout tool to hide sensitive data
• Add text explanations

**4. Fill Details**
Complete your bug report:
• Select project and tracker
• Write subject and description
• Set priority and assignee
• Add reproduction steps
• Describe expected vs. actual behavior

**5. Review & Submit**
Review all captured data in the pre-submission modal:
• Check screenshots and videos
• Verify page information
• Review network requests
• Inspect console logs
• Confirm and submit!

**6. Done!**
Issue is created in Redmine with all attachments. You'll get a direct link to the created issue.

---

### 🛡️ PERMISSIONS EXPLAINED

We believe in transparency. Here's exactly why we need each permission:

**✓ Network Request Monitoring (`webRequest`, `<all_urls>`)**
Captures HTTP/HTTPS requests to help debug network-related issues. You control what data is included via privacy settings.

**✓ Tab Access (`tabs`, `activeTab`, `tabCapture`)**
Required for screenshot capture, video recording, and tab information collection.

**✓ Storage (`storage`)**
Saves your Redmine server settings and preferences securely in Chrome's encrypted storage.

**✓ Content Scripts (`scripting`)**
Injects code to collect page information, console logs, and performance metrics only when you trigger a bug report.

**✓ Offscreen Documents (`offscreen`)**
Required for video recording functionality using MediaRecorder API.

---

### 🔐 PRIVACY & SECURITY

**We Take Privacy Seriously:**
• ✅ **Zero Tracking**: No analytics, no telemetry, no user tracking
• ✅ **No Third Parties**: Data never leaves your control
• ✅ **Open Source**: Full source code available on GitHub for auditing
• ✅ **Transparent**: Pre-submission modal shows ALL data before sending
• ✅ **User Control**: Disable any data collection feature you don't need
• ✅ **Secure Storage**: API keys encrypted in Chrome's secure storage
• ✅ **HTTPS Only**: All Redmine communication encrypted
• ✅ **Automatic Cleanup**: Temporary data cleared after 1 hour
• ✅ **GDPR/CCPA Compliant**: Full user control and transparency

**Read our full Privacy Policy:** [Link to be added in Developer Dashboard]

---

### 📊 PERFECT FOR

• **QA Testers**: Streamline bug reporting with rich context
• **Software Developers**: Quickly report bugs encountered during development
• **Product Managers**: Create detailed feature requests with visual examples
• **Support Teams**: Report customer-reported issues with full technical details
• **DevOps Engineers**: Document infrastructure issues with network diagnostics

---

### 🎓 GETTING STARTED

**1. Install the Extension**
Click "Add to Chrome" above.

**2. Configure Redmine**
• Click extension icon → Settings (⚙️)
• Enter your Redmine server URL (e.g., `https://redmine.yourcompany.com`)
• Enter your Redmine API key (find in My Account → API access key)
• Click "Test Connection" to verify
• Save settings

**3. Adjust Privacy Preferences (Optional)**
Choose what data to include in bug reports:
• Network requests
• Console logs
• LocalStorage/SessionStorage
• Cookies

**4. Start Reporting Bugs!**
You're all set! Use `Ctrl+Shift+B` or click the extension icon to start capturing bugs.

---

### 💡 PRO TIPS

• **Keyboard Shortcut**: Use `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac) for quick access
• **Multiple Screenshots**: Capture multiple screenshots and annotate each separately
• **Blackout Sensitive Data**: Always use the blackout tool before capturing sensitive information
• **Review Before Submitting**: Use the pre-submission modal to verify all data is appropriate
• **Network Logs**: Enable "Include Network Requests" to capture API failures
• **Console Logs**: Enable "Include Console Logs" to capture JavaScript errors
• **Test Connection**: Always test your Redmine connection after setup

---

### 📚 TECHNICAL SPECIFICATIONS

• **Manifest Version**: V3 (latest standard)
• **Screenshot Format**: PNG (high quality)
• **Video Format**: WebM
• **Network Export**: HAR (HTTP Archive) format
• **API Integration**: Redmine REST API v3+
• **Supported Browsers**: Chrome, Edge, Brave (Chromium-based)
• **Minimum Chrome Version**: 88+
• **Code**: 100% open source on GitHub

---

### 🆕 WHAT'S NEW IN VERSION 1.0.0

• 📸 High-quality screenshot capture (viewport and full-page)
• 🎥 Video recording with overlay controls
• 🎨 Complete annotation suite with zoom support
• 🔍 Comprehensive technical data collection
• 🌐 Network request monitoring with HAR export
• 📝 Console log capture with stack traces
• 🔒 Privacy-first design with pre-submission review
• ⚙️ Granular privacy controls
• 🎯 Full Redmine API integration
• ✨ Professional UI with tab-based review modal
• 📦 Multi-attachment support
• 🛡️ Automatic data sanitization
• ❓ Comprehensive help documentation

---

### 📞 SUPPORT & FEEDBACK

**Need Help?**
• **Documentation**: https://github.com/prabhuvikas/Cap-screen/blob/main/README.md
• **Installation Guide**: https://github.com/prabhuvikas/Cap-screen/blob/main/INSTALL.md
• **Issue Tracker**: https://github.com/prabhuvikas/Cap-screen/issues
• **Feature Requests**: Submit via GitHub Issues

**Found a Bug?**
Report it using the extension itself! 😉 Or open an issue on GitHub.

---

### 🌟 WHY CHOOSE CRED ISSUE REPORTER?

**Compared to manual bug reporting:**
• ⏱️ **Save Time**: 5-minute process reduced to 30 seconds
• 📊 **Better Quality**: Automatic technical context vs. manual notes
• 🎯 **Higher Accuracy**: Visual annotations vs. text descriptions
• 🔄 **Faster Resolution**: Developers have all context immediately

**Compared to other bug reporting tools:**
• 🔓 **Open Source**: Audit our code, contribute improvements
• 🔒 **Privacy-First**: Your data stays with you, no third-party servers
• 🎨 **Professional Tools**: Advanced annotation features
• 🔧 **Developer-Focused**: Built by developers, for developers
• 💰 **Free Forever**: No subscriptions, no hidden costs

---

### 📜 LICENSE

MIT License - Free and open source forever.

---

### 🤝 CONTRIBUTING

We welcome contributions! Visit our GitHub repository to:
• Report bugs
• Request features
• Submit pull requests
• Improve documentation

**Repository**: https://github.com/prabhuvikas/Cap-screen

---

### ⚖️ COMPLIANCE

• ✅ Chrome Web Store Program Policies
• ✅ GDPR (General Data Protection Regulation)
• ✅ CCPA (California Consumer Privacy Act)
• ✅ Manifest V3 Standards
• ✅ Content Security Policy
• ✅ No Remote Code Execution
• ✅ Transparent Data Handling

---

### 🎯 ROADMAP

**Coming Soon:**
• 📱 Mobile viewport simulation
• 🌙 Dark theme
• 📝 Issue templates
• 💾 Draft saving
• 📊 Performance monitoring (Core Web Vitals)
• 🔌 Additional integrations (Jira, GitHub Issues, Linear)

---

**Ready to transform your bug reporting workflow?**
**Click "Add to Chrome" now and start reporting better bugs today!**

---

## Category

**Developer Tools**

---

## Language

**English**

---

## Support URL

https://github.com/prabhuvikas/Cap-screen/issues

---

## Privacy Policy URL

[To be added: Host PRIVACY_POLICY.md on GitHub Pages or public website]
Temporary placeholder: https://github.com/prabhuvikas/Cap-screen/blob/main/PRIVACY_POLICY.md

---

## Tags / Keywords

bug reporting, redmine, screenshot, annotation, developer tools, QA testing, issue tracking, network monitoring, console logs, screen capture, video recording, debugging, project management, software development, quality assurance

---

## Promotional Images Required

### 1. Small Promotional Tile (440x280 PNG)
- **Purpose**: Appears in Chrome Web Store search results
- **Design Tips**:
  - Feature extension icon prominently
  - Show "Bug Reporter" text
  - Include tagline: "Capture. Annotate. Report."
  - Use brand colors from icon
  - Keep text readable at small size

### 2. Marquee Promotional Tile (1400x560 PNG) - OPTIONAL but RECOMMENDED
- **Purpose**: Featured placement on Chrome Web Store
- **Design Tips**:
  - Showcase key features with icons
  - Include screenshots of annotation tools
  - Show Redmine integration
  - Professional gradient background
  - Call-to-action: "Streamline Your Bug Reporting"

### 3. Screenshots (1280x800 or 640x400 PNG) - Minimum 1, Recommended 5
**Screenshot Ideas:**
1. **Main Popup**: Capture options (viewport/full page) and video recording
2. **Annotation Tools**: Show drawing, shapes, blackout, text tools in action
3. **Review Modal**: Display the pre-submission review with tabs
4. **Settings Page**: Show Redmine configuration and privacy controls
5. **Redmine Integration**: Show created issue with attachments

**Tips:**
- Use actual extension UI, not mockups
- Annotate screenshots to highlight features
- Add captions via Chrome Web Store (not in image)
- Show real-world use cases
- Make sure text is readable

---

## Pricing

**FREE** - Open Source

---

## Version Release Notes (for v1.0.0)

**Initial Release - Comprehensive Bug Reporting for Redmine**

NEW FEATURES:
• Screenshot capture (viewport and full-page)
• Video recording with overlay controls
• Professional annotation toolkit (pen, shapes, blackout, text)
• Multi-screenshot support with zoom
• Network request monitoring (HAR export)
• Console log capture with stack traces
• Comprehensive technical data collection
• Pre-submission review modal with tabs
• Granular privacy controls
• Direct Redmine API integration
• Automatic attachment handling
• Sensitive data sanitization
• Help documentation

PRIVACY & SECURITY:
• No third-party data collection
• Open source codebase
• GDPR/CCPA compliant
• Local storage only
• HTTPS communication

COMPATIBILITY:
• Manifest V3 compliant
• Chrome 88+
• Works with any Redmine server (v3.0+)

Get started: Install → Configure Redmine settings → Start reporting bugs!

---

## Response to Expected Review Questions

### Q: Why do you need webRequest and <all_urls> permissions?

**A:** Our extension captures network requests (HTTP/HTTPS traffic) to provide developers with debugging context when reporting bugs. This is essential for diagnosing issues like:
• Failed API calls (404, 500 errors)
• CORS issues
• Slow network requests
• Authentication failures

Users have full control via privacy settings to disable network monitoring. All captured data is shown in a pre-submission review modal before sending to the user's Redmine server.

### Q: Why do you need access to all websites?

**A:** Bug reporting needs to work on any webpage where users encounter issues. The extension:
• Only activates when user clicks the icon or uses the keyboard shortcut
• Does not run in the background on all pages
• Only collects data when user explicitly creates a bug report
• Requires user confirmation before sending any data

### Q: What data do you collect?

**A:** We collect ZERO data for ourselves. All data collected goes directly to the user's own Redmine server:
• Screenshots/videos (captured on-demand)
• Page information (URL, browser version, OS)
• Network requests (optional, user-controlled)
• Console logs (optional, user-controlled)
• Storage data (optional, disabled by default)

Users review ALL data in a modal before submission. Our privacy policy is comprehensive and transparent.

### Q: Is your extension open source?

**A:** Yes! Full source code is available at: https://github.com/prabhuvikas/Cap-screen

Users and reviewers can audit our code to verify:
• No tracking or analytics
• No third-party servers
• Transparent data handling
• Security best practices

---

**End of Store Listing Content**

Use this content when filling out the Chrome Web Store Developer Dashboard submission form.
