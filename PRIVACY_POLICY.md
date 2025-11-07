# Privacy Policy for Cred Issue Reporter Extension

**Last Updated:** November 7, 2025
**Effective Date:** November 7, 2025
**Version:** 1.0.0

## Introduction

Cred Issue Reporter ("the Extension", "we", "our") is a Chrome extension designed to help developers and QA teams capture, annotate, and report bugs directly to their Redmine project management system. We are committed to protecting your privacy and being transparent about our data practices.

**Key Privacy Principles:**
- ✅ **No Third-Party Data Collection** - We don't collect, store, or transmit any data to our servers
- ✅ **User Control** - You decide what data is included in bug reports
- ✅ **Transparency** - Pre-submission review shows exactly what will be sent
- ✅ **Local Storage Only** - Settings stored securely on your device
- ✅ **Direct Communication** - Data goes only to YOUR Redmine server

---

## 1. Data Collection and Usage

### 1.1 What Data We Collect

The Extension collects the following types of data **ONLY when you actively create a bug report**:

#### A. Screenshot Data
- **What:** Visual capture of the current browser tab
- **When:** Only when you click "Capture Screenshot"
- **Storage:** Temporarily in browser memory, then sent to your Redmine server
- **Retention:** Cleared after report submission or 1 hour of inactivity

#### B. Page Information
- Current webpage URL
- Page title
- Browser name and version
- Operating system information
- Screen resolution and viewport size
- Timestamp of capture

#### C. Network Activity (Optional - Can be disabled)
- HTTP/HTTPS request URLs
- Request methods (GET, POST, etc.)
- Response status codes
- Request/response headers
- Failed request information
- **Note:** Network monitoring captures traffic from the webpage you're reporting on

#### D. Console Logs (Optional - Can be disabled)
- JavaScript console output (log, warn, error, info)
- Error messages and stack traces
- Timestamps of log entries
- **Note:** Console logs may inadvertently contain sensitive information from the webpage

#### E. Browser Storage (Optional - Disabled by default)
- LocalStorage contents
- SessionStorage contents
- Cookies
- **Note:** Only collected if you explicitly enable these options in settings

#### F. Redmine Credentials
- Redmine server URL
- Redmine API key
- Default project preferences
- **Storage:** Encrypted in Chrome's secure storage (chrome.storage.sync)

### 1.2 How We Use This Data

**Direct Use Only:**
All collected data is used exclusively for creating bug reports in YOUR Redmine server. Specifically:

1. **Screenshot + Annotations** → Attached to Redmine issue as image file
2. **Page Information** → Included in issue description for context
3. **Network Requests** → Exported as HAR file, attached to issue
4. **Console Logs** → Exported as text file, attached to issue
5. **Browser Storage** → Included in technical data JSON file (if enabled)
6. **Redmine Credentials** → Used to authenticate API requests to your server

**We DO NOT:**
- ❌ Send any data to our servers or third parties
- ❌ Use data for analytics, tracking, or advertising
- ❌ Share data with anyone except your designated Redmine server
- ❌ Store data permanently (temporary memory only, cleared within 1 hour)

---

## 2. Data Storage and Retention

### 2.1 Local Storage

**Settings Data:**
- **Location:** Chrome's encrypted sync storage (chrome.storage.sync)
- **Contents:** Redmine URL, API key, default project, privacy preferences
- **Retention:** Until you uninstall the extension or clear it manually
- **Sync:** Settings may sync across your Chrome browsers (via Chrome Sync)

**Temporary Data:**
- **Location:** Browser memory (RAM)
- **Contents:** Network requests, console logs captured during current session
- **Retention:** Maximum 1 hour, or until browser/tab is closed
- **Cleanup:** Automatic cleanup every 5 minutes removes data older than 1 hour

**Session Storage:**
- **Location:** Chrome's session storage (chrome.storage.session)
- **Contents:** Screenshots and video recordings awaiting submission
- **Retention:** Until report is submitted or browser is closed
- **Cleanup:** Automatically cleared after submission

### 2.2 No Server-Side Storage

**Important:** We do NOT operate any servers or databases. All data handling occurs:
1. Locally in your browser
2. In transit to your Redmine server (encrypted via HTTPS)
3. On your Redmine server (per your organization's policies)

---

## 3. Data Sharing and Transmission

### 3.1 Data Recipients

**Only One Recipient:** Your Redmine Server
- Data is transmitted ONLY to the Redmine server URL you configure
- Transmission uses secure HTTPS protocol
- Authentication via your personal API key
- No intermediate servers or proxies

### 3.2 Third-Party Services

**We Do NOT use:**
- ❌ Analytics services (Google Analytics, etc.)
- ❌ Crash reporting services
- ❌ Advertising networks
- ❌ Social media integration
- ❌ Any external APIs except your Redmine server

### 3.3 Data Security

**Security Measures:**
- ✅ HTTPS/TLS encryption for all Redmine API communication
- ✅ API keys stored in Chrome's secure storage
- ✅ Input sanitization to prevent injection attacks
- ✅ XSS protection (HTML escaping)
- ✅ Content Security Policy enforcement
- ✅ No remote code execution

---

## 4. User Control and Transparency

### 4.1 Privacy Settings

You have complete control over data collection:

**Configurable Options:**
- ☑ Include Network Requests (default: ON)
- ☑ Include Console Logs (default: ON)
- ☐ Include LocalStorage Data (default: OFF)
- ☐ Include Cookies (default: OFF)
- ☑ Sanitize Sensitive Data (default: ON - recommended)

**To Configure:**
1. Click extension icon
2. Click settings icon (⚙️)
3. Adjust privacy preferences
4. Click "Save Settings"

### 4.2 Pre-Submission Review

**Transparency Guarantee:**
Before ANY data is sent to Redmine, you will see a review modal with tabs showing:

1. **Issue Details** - Your bug report text
2. **Media** - Screenshots/videos being attached
3. **Page Info** - Browser and system information
4. **Network** - All captured network requests
5. **Console** - All captured console logs

**You must explicitly click "Confirm & Submit" to proceed.**
You can cancel at any time without sending data.

### 4.3 Data Deletion

**Manual Deletion:**
- Settings: Right-click extension icon → "Options" → "Reset Settings"
- Chrome Storage: Right-click extension icon → "Remove extension" (deletes all data)

**Automatic Deletion:**
- Temporary data (network logs, console logs): Deleted after 1 hour
- Session data (screenshots): Deleted after submission or browser close

---

## 5. Permissions Explained

The Extension requests the following Chrome permissions:

| Permission | Purpose | Justification |
|------------|---------|---------------|
| `activeTab` | Access current tab | Required to capture screenshots and page info |
| `storage` | Local data storage | Store Redmine credentials and preferences securely |
| `tabs` | Tab management | Capture screenshots, create annotation tabs |
| `webRequest` | Monitor network | Capture HTTP requests for debugging context |
| `debugger` | Advanced monitoring | *Currently under review - may be removed if unused* |
| `scripting` | Inject content scripts | Collect page information and console logs |
| `tabCapture` | Record video | Enable video recording of tab content |
| `offscreen` | Offscreen documents | Required for video recording functionality |
| `<all_urls>` | Access all websites | Monitor network requests on any page where you report bugs |

**Minimal Permissions Policy:**
We request only the permissions necessary for core functionality. If we find that `debugger` permission is not required, it will be removed in the next update.

---

## 6. Children's Privacy

The Extension is intended for professional use by software developers and QA testers. It is not designed for or directed at children under 13. We do not knowingly collect information from children.

---

## 7. Data Breach Notification

**In case of a security breach:**

While we do not store user data on our servers, if we discover a vulnerability in the Extension that could have exposed user data, we will:

1. Issue an immediate security update
2. Publish a security advisory on our GitHub repository
3. Notify users via Chrome Web Store update notes
4. Recommend users rotate Redmine API keys as a precaution

**Report vulnerabilities to:** https://github.com/prabhuvikas/Cap-screen/issues

---

## 8. Changes to Privacy Policy

We may update this Privacy Policy to reflect changes in:
- Extension functionality
- Legal requirements
- User feedback and best practices

**How we notify you:**
- Update "Last Updated" date at the top
- Post notice in extension update notes
- Maintain version history on GitHub

**Continued use of the Extension after changes constitutes acceptance of the updated policy.**

---

## 9. Your Rights (GDPR/CCPA Compliance)

If you are located in the European Union or California, you have the following rights:

### 9.1 Right to Access
**You can:** View all data the Extension has collected via the pre-submission review modal.

### 9.2 Right to Deletion
**You can:** Uninstall the extension to delete all locally stored data.

### 9.3 Right to Data Portability
**You can:** Export technical data as JSON files before submission.

### 9.4 Right to Object
**You can:** Disable specific data collection features in privacy settings.

### 9.5 Right to Rectification
**You can:** Edit all data in the review modal before submission.

**Note:** Since we don't store data on our servers, these rights are inherently built into the Extension's design. You have complete control over your data at all times.

---

## 10. Cookies and Tracking

**We DO NOT use:**
- ❌ Cookies for tracking
- ❌ Browser fingerprinting
- ❌ User analytics or telemetry
- ❌ Advertising identifiers

**The Extension may collect cookies FROM WEBPAGES** (if you enable "Include Cookies" in settings) solely for the purpose of including them in bug reports to your Redmine server.

---

## 11. International Data Transfers

**No Transfers by Us:**
We do not transfer data internationally. Data flows only between:
1. Your browser (wherever you are located)
2. Your Redmine server (wherever it is hosted)

**Your Responsibility:**
If your Redmine server is hosted in a different country, you are responsible for ensuring compliance with data transfer regulations (GDPR, etc.).

---

## 12. Contact Information

**Extension Developer:**
- **GitHub Repository:** https://github.com/prabhuvikas/Cap-screen
- **Issue Tracker:** https://github.com/prabhuvikas/Cap-screen/issues
- **Email:** *[You should add your support email here]*

**For Privacy Concerns:**
- Open an issue on GitHub with label `privacy`
- Email: *[Add your privacy contact email]*

**Response Time:**
We aim to respond to privacy inquiries within 7 business days.

---

## 13. Legal Basis for Processing (GDPR)

For users in the European Union, our legal basis for processing personal data is:

**Consent (Article 6(1)(a) GDPR):**
- You provide explicit consent by installing the Extension
- You provide consent for each data type via privacy settings
- You confirm consent by clicking "Confirm & Submit" in the review modal

**You may withdraw consent at any time by:**
- Disabling data collection features in settings
- Uninstalling the Extension

---

## 14. Redmine Server Privacy

**Important Notice:**
Once data is submitted to your Redmine server, it is subject to your organization's privacy policies, not this policy. Please ensure:

1. Your organization has appropriate data protection measures
2. Your Redmine server uses HTTPS encryption
3. Access to Redmine issues is properly restricted
4. Your organization complies with applicable privacy laws

**We are not responsible for how your Redmine server handles the submitted data.**

---

## 15. Open Source Transparency

**Our Commitment:**
The Extension is open source. You can:
- ✅ Review all source code on GitHub
- ✅ Verify that we don't collect data for ourselves
- ✅ Audit security and privacy practices
- ✅ Contribute improvements via pull requests

**Repository:** https://github.com/prabhuvikas/Cap-screen

---

## 16. Compliance Summary

| Regulation | Status | Notes |
|------------|--------|-------|
| **GDPR** | ✅ Compliant | User control, transparency, data minimization |
| **CCPA** | ✅ Compliant | No data sales, opt-out controls available |
| **Chrome Web Store Policies** | ✅ Compliant | Transparent disclosure, justified permissions |
| **Data Minimization** | ✅ Implemented | Collect only what's needed for bug reports |
| **Security** | ✅ Implemented | Encryption, sanitization, secure storage |

---

## 17. Acknowledgment

By installing and using Cred Issue Reporter, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

**If you do not agree with this policy, please do not install or use the Extension.**

---

## 18. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-07 | Initial privacy policy |

---

**Questions or Concerns?**
We take privacy seriously. If you have any questions about this policy or our practices, please contact us via GitHub Issues.

---

## Additional Resources

- [Chrome Web Store Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA Official Information](https://oag.ca.gov/privacy/ccpa)
- [Redmine Privacy Best Practices](https://www.redmine.org/projects/redmine/wiki/Security_Advisories)

---

**End of Privacy Policy**

*This privacy policy is provided in good faith to ensure transparency and user trust. We are committed to protecting your privacy and handling data responsibly.*
