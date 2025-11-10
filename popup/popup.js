// Popup JavaScript - Main bug reporter functionality

let currentTab = null;
let screenshotDataUrl = null;
let annotator = null;
let settings = {};
let pageInfo = {};
let networkRequests = [];
let consoleLogs = [];
let redmineAPI = null;
let mediaRecorder = null;
let recordedChunks = [];
let videoDataUrl = null;
let isRecording = false;

// Sanitize text to remove unicode/emoji characters that cause 500 errors
// Redmine with standard UTF-8 (not utf8mb4) cannot handle 4-byte UTF-8 characters
function sanitizeText(text) {
  if (!text) return text;

  const str = typeof text === 'string' ? text : String(text);

  // Remove 4-byte UTF-8 characters (emojis, surrogate pairs) first
  // Standard UTF-8 in MySQL only supports up to 3 bytes
  let sanitized = str.replace(/[\uD800-\uDFFF]/g, ''); // Remove surrogate pairs

  // Replace problematic unicode characters with safe equivalents
  sanitized = sanitized
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
    .replace(/[\u2013\u2014]/g, '-') // Em/en dashes
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[\u2022]/g, '*') // Bullet point
    .replace(/[\u00A0]/g, ' ') // Non-breaking space
    .replace(/[^\x00-\x7F]/g, ''); // Remove ALL remaining non-ASCII

  // Normalize line endings: convert CRLF (\r\n) to LF (\n) for consistency
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return sanitized;
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  // Load settings
  await loadSettings();

  // Setup settings button listeners (must be set up before early return)
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('openSettings').addEventListener('click', openSettings);

  // Check if Redmine is configured
  if (!settings.redmineUrl || !settings.apiKey) {
    showSection('noConfigSection');
    return;
  }

  // Initialize Redmine API
  redmineAPI = new RedmineAPI(settings.redmineUrl, settings.apiKey);

  // Setup event listeners
  setupEventListeners();

  // Show initial section
  showSection('captureSection');
});

// Load settings from storage
async function loadSettings() {
  settings = await chrome.storage.sync.get({
    redmineUrl: '',
    apiKey: '',
    defaultProject: '',
    defaultPriority: '',
    defaultAssignee: '',
    includeNetworkRequests: true,
    includeConsoleLogs: true,
    includeLocalStorage: false,
    includeCookies: false,
    sanitizeSensitiveData: true,
    screenshotQuality: 'medium',
    autoFullPageScreenshot: false
  });
}

// Setup event listeners
function setupEventListeners() {
  // Screenshot capture
  document.getElementById('captureViewport').addEventListener('click', () => captureScreenshot('viewport'));
  document.getElementById('captureFullPage').addEventListener('click', () => captureScreenshot('fullpage'));

  // Video recording
  document.getElementById('startRecording').addEventListener('click', startVideoRecording);
  document.getElementById('startWindowRecording').addEventListener('click', startWindowRecording);

  // Annotation tools
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tool = e.currentTarget.dataset.tool;
      selectTool(tool, e.currentTarget);
    });
  });

  document.getElementById('colorPicker').addEventListener('change', (e) => {
    if (annotator) annotator.setColor(e.target.value);
  });

  document.getElementById('lineWidth').addEventListener('input', (e) => {
    document.getElementById('lineWidthValue').textContent = e.target.value;
    if (annotator) annotator.setLineWidth(parseInt(e.target.value));
  });

  document.getElementById('undoBtn').addEventListener('click', () => {
    if (annotator) annotator.undo();
  });

  document.getElementById('redoBtn').addEventListener('click', () => {
    if (annotator) annotator.redo();
  });

  document.getElementById('clearAnnotations').addEventListener('click', () => {
    if (annotator && confirm('Clear all annotations?')) {
      annotator.clear();
    }
  });

  // Navigation
  document.getElementById('continueToReport').addEventListener('click', continueToReport);
  document.getElementById('retakeScreenshot').addEventListener('click', () => showSection('captureSection'));
  document.getElementById('backToAnnotate').addEventListener('click', () => showSection('annotateSection'));

  // Form
  document.getElementById('project').addEventListener('change', onProjectChange);
  document.getElementById('bugReportForm').addEventListener('submit', submitBugReport);

  // Success
  document.getElementById('createAnother').addEventListener('click', resetForm);
  document.getElementById('closePopup').addEventListener('click', () => window.close());

  // Review Modal
  document.getElementById('closeReviewModal').addEventListener('click', closeReviewModal);
  document.getElementById('modalOverlay').addEventListener('click', closeReviewModal);
  document.getElementById('cancelSubmit').addEventListener('click', closeReviewModal);
  document.getElementById('confirmSubmit').addEventListener('click', actuallySubmitBugReport);

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab));
  });
}

// Capture screenshot
async function captureScreenshot(type) {
  const button = type === 'viewport' ? document.getElementById('captureViewport') : document.getElementById('captureFullPage');
  const statusEl = document.getElementById('captureStatus');

  try {
    button.disabled = true;
    showStatus('captureStatus', 'Capturing screenshot...', 'info');

    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content/content.js']
      });
    } catch (e) {
      // Content script might already be injected
      console.log('Content script injection skipped:', e.message);
    }

    // Capture the screenshot
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });

    if (!screenshotDataUrl) {
      throw new Error('Failed to capture screenshot');
    }

    showStatus('captureStatus', 'Screenshot captured successfully!', 'success');

    // Save screenshot to session storage (use new multi-screenshot format)
    const newScreenshot = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2),
      data: screenshotDataUrl,
      annotations: null,
      timestamp: Date.now(),
      tabId: currentTab.id,
      name: 'Screenshot 1'
    };

    await chrome.storage.session.set({
      screenshots: [newScreenshot],
      currentScreenshotId: newScreenshot.id,
      tabId: currentTab.id,
      // Keep old format for backward compatibility
      screenshotData: screenshotDataUrl
    });

    // Open annotation page in new tab
    const annotateTab = await chrome.tabs.create({
      url: chrome.runtime.getURL('annotate/annotate.html'),
      active: true
    });

    console.log('[Popup] Opened annotation tab:', annotateTab.id);

    // Close popup after opening new tab
    setTimeout(() => {
      window.close();
    }, 300);

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    showStatus('captureStatus', `Error: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

// Start video recording
async function startVideoRecording() {
  const startBtn = document.getElementById('startRecording');
  const statusEl = document.getElementById('recordingStatus');

  try {
    startBtn.disabled = true;
    showStatus('recordingStatus', 'Starting video recording...', 'info');
    console.log('[Popup] Starting video recording for tab:', currentTab.id);

    // Inject the recording overlay script
    try {
      console.log('[Popup] Injecting recording overlay script...');
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content/recording-overlay.js']
      });
      console.log('[Popup] Recording overlay script injected');
    } catch (e) {
      console.log('[Popup] Recording overlay script already injected or error:', e.message);
    }

    // Start tab capture in background
    console.log('[Popup] Sending startTabCapture message to background...');
    const response = await chrome.runtime.sendMessage({
      action: 'startTabCapture',
      tabId: currentTab.id
    });

    console.log('[Popup] Response from background:', response);

    if (!response) {
      throw new Error('No response from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to start recording');
    }

    // Tell content script to show the overlay UI
    try {
      console.log('[Popup] Showing recording overlay...');
      await chrome.tabs.sendMessage(currentTab.id, {
        action: 'showRecordingOverlay'
      });
      console.log('[Popup] Recording overlay shown');
    } catch (e) {
      console.error('[Popup] Failed to show overlay:', e);
      throw new Error('Failed to show recording overlay. The page may not support this feature.');
    }

    // Close the popup - recording will continue in the background
    console.log('[Popup] Closing popup...');
    window.close();

  } catch (error) {
    console.error('[Popup] Error starting video recording:', error);
    showStatus('recordingStatus', `Error: ${error.message}`, 'error');
    startBtn.disabled = false;
  }
}

// Start window/screen recording
async function startWindowRecording() {
  const startBtn = document.getElementById('startWindowRecording');
  const statusEl = document.getElementById('recordingStatus');

  try {
    startBtn.disabled = true;
    showStatus('recordingStatus', 'Starting window/screen recording...', 'info');
    console.log('[Popup] Starting window/screen recording');

    // Start display capture in background
    console.log('[Popup] Sending startDisplayCapture message to background...');
    const response = await chrome.runtime.sendMessage({
      action: 'startDisplayCapture',
      tabId: currentTab.id
    });

    console.log('[Popup] Response from background:', response);

    if (!response) {
      throw new Error('No response from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to start recording');
    }

    showStatus('recordingStatus', 'Recording started! Use browser controls or Esc to stop.', 'success');

    // Close the popup after a short delay
    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('[Popup] Error starting window/screen recording:', error);
    showStatus('recordingStatus', `Error: ${error.message}`, 'error');
    startBtn.disabled = false;
  }
}

// Stop video recording (not used anymore - handled by overlay)
async function stopVideoRecording() {
  // This function is kept for compatibility but recording is now stopped via overlay
  console.log('Stop recording called from popup (should use overlay instead)');
}

// Initialize annotation
function initializeAnnotation() {
  showSection('annotateSection');

  const canvas = document.getElementById('annotationCanvas');
  annotator = new Annotator(canvas, screenshotDataUrl);
}

// Select annotation tool
function selectTool(tool, buttonElement) {
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  if (buttonElement) {
    buttonElement.classList.add('active');
  }

  if (annotator) {
    annotator.setTool(tool);
  }

  // If text tool, prompt for text
  if (tool === 'text') {
    const text = prompt('Enter text:');
    if (text && annotator) {
      const canvas = document.getElementById('annotationCanvas');
      const rect = canvas.getBoundingClientRect();
      annotator.addText(50, 50, text);
    }
  }
}

// Continue to report form
async function continueToReport() {
  showSection('reportSection');

  // Collect technical data
  await collectTechnicalData();

  // Load Redmine data
  await loadRedmineData();
}

// Collect technical data
async function collectTechnicalData() {
  try {
    // Ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content/content.js']
      });
    } catch (e) {
      // Content script might already be injected
      console.log('Content script injection skipped:', e.message);
    }

    // Collect page information
    const pageInfoResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'collectPageInfo'
    });

    if (pageInfoResponse && pageInfoResponse.success) {
      pageInfo = pageInfoResponse.data;
    }

    // Collect console logs
    if (settings.includeConsoleLogs) {
      const logsResponse = await chrome.runtime.sendMessage({
        action: 'getConsoleLogs',
        tabId: currentTab.id
      });

      if (logsResponse && logsResponse.success) {
        consoleLogs = logsResponse.data;
      }
    }

    // Collect network requests
    if (settings.includeNetworkRequests) {
      const networkResponse = await chrome.runtime.sendMessage({
        action: 'getNetworkRequests',
        tabId: currentTab.id
      });

      if (networkResponse && networkResponse.success) {
        networkRequests = networkResponse.data;
      }
    }

    // Collect storage data
    if (settings.includeLocalStorage || settings.includeCookies) {
      const storageResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'collectStorageData'
      });

      if (storageResponse && storageResponse.success) {
        pageInfo.storage = storageResponse.data;
      }
    }
  } catch (error) {
    console.error('Error collecting technical data:', error);
  }
}

// Load Redmine data
async function loadRedmineData() {
  try {
    // Load projects
    const projects = await redmineAPI.getProjects();
    const projectSelect = document.getElementById('project');
    projectSelect.innerHTML = '<option value="">-- Select Project --</option>';

    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      if (project.id == settings.defaultProject || project.identifier == settings.defaultProject) {
        option.selected = true;
      }
      projectSelect.appendChild(option);
    });

    // Load trackers
    const trackers = await redmineAPI.getTrackers();
    const trackerSelect = document.getElementById('tracker');
    trackerSelect.innerHTML = '<option value="">-- Select Tracker --</option>';

    trackers.forEach(tracker => {
      const option = document.createElement('option');
      option.value = tracker.id;
      option.textContent = tracker.name;
      // Select "Bug" by default if available
      if (tracker.name.toLowerCase() === 'bug') {
        option.selected = true;
      }
      trackerSelect.appendChild(option);
    });

    // Load priorities
    const priorities = await redmineAPI.getPriorities();
    const prioritySelect = document.getElementById('priority');
    prioritySelect.innerHTML = '<option value="">-- Select Priority --</option>';

    priorities.forEach(priority => {
      const option = document.createElement('option');
      option.value = priority.id;
      option.textContent = priority.name;
      // Select default priority from settings, or "Normal" if no default set
      if (settings.defaultPriority && priority.id == settings.defaultPriority) {
        option.selected = true;
      } else if (!settings.defaultPriority && priority.name.toLowerCase() === 'normal') {
        option.selected = true;
      }
      prioritySelect.appendChild(option);
    });

    // Trigger project change to load project-specific data
    if (settings.defaultProject) {
      await onProjectChange();
    }

  } catch (error) {
    console.error('Error loading Redmine data:', error);
    showStatus('submitStatus', 'Error loading Redmine data. Please check your settings.', 'error');
  }
}

// Handle project change
async function onProjectChange() {
  const projectId = document.getElementById('project').value;

  if (!projectId) return;

  try {
    // Load project members
    const members = await redmineAPI.getProjectMembers(projectId);
    const assigneeSelect = document.getElementById('assignee');
    assigneeSelect.innerHTML = '<option value="">-- Unassigned --</option>';

    members.forEach(member => {
      if (member.user) {
        const option = document.createElement('option');
        option.value = member.user.id;
        option.textContent = member.user.name;
        // Select default assignee from settings if available
        if (settings.defaultAssignee && member.user.id == settings.defaultAssignee) {
          option.selected = true;
        }
        assigneeSelect.appendChild(option);
      }
    });

    // Load categories
    const categories = await redmineAPI.getIssueCategories(projectId);
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">-- No Category --</option>';

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });

    // Load versions
    const versions = await redmineAPI.getVersions(projectId);
    const versionSelect = document.getElementById('version');
    versionSelect.innerHTML = '<option value="">-- No Version --</option>';

    versions.forEach(version => {
      const option = document.createElement('option');
      option.value = version.id;
      option.textContent = version.name;
      versionSelect.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading project data:', error);
  }
}

// Submit bug report - Show review modal first
async function submitBugReport(e) {
  e.preventDefault();

  try {
    console.log('submitBugReport called');

    // Populate review modal with all data
    await populateReviewModal();

    console.log('Modal populated, showing modal');

    // Show review modal
    const modal = document.getElementById('reviewModal');
    if (modal) {
      modal.classList.remove('hidden');
      console.log('Modal shown, hidden class removed');
    } else {
      console.error('Review modal element not found!');
    }
  } catch (error) {
    console.error('Error in submitBugReport:', error);
    alert('Error showing review modal: ' + error.message);
  }
}

// Actually submit bug report after review confirmation
async function actuallySubmitBugReport() {
  const submitBtn = document.getElementById('confirmSubmit');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  try {
    submitBtn.disabled = true;
    btnText.textContent = 'Submitting...';
    spinner.classList.remove('hidden');

    // Get form data from review modal (user may have edited these)
    const formData = {
      project_id: document.getElementById('reviewProjectSelect').value,
      tracker_id: document.getElementById('reviewTrackerSelect').value,
      subject: document.getElementById('reviewSubjectInput').value,
      description: document.getElementById('reviewDescriptionText').value,
      priority_id: document.getElementById('reviewPrioritySelect').value,
      assigned_to_id: document.getElementById('reviewAssigneeSelect').value
    };

    // Validate required fields (including mandatory assignee)
    if (!formData.project_id || !formData.tracker_id || !formData.subject || !formData.description || !formData.priority_id || !formData.assigned_to_id) {
      throw new Error('Please fill in all required fields (marked with *)');
    }

    // Optional fields

    const category = document.getElementById('category').value;
    if (category) formData.category_id = category;

    const version = document.getElementById('version').value;
    if (version) formData.fixed_version_id = version;

    // Prepare attachments
    const attachments = [];

    // Add annotated screenshot
    if (annotator) {
      const annotatedImage = annotator.getAnnotatedImage();
      attachments.push({
        data: annotatedImage,
        filename: `screenshot-${Date.now()}.png`,
        type: 'image/png'
      });
    }

    // Add recorded video if available
    if (videoDataUrl) {
      attachments.push({
        data: videoDataUrl,
        filename: `recording-${Date.now()}.webm`,
        type: 'video/webm'
      });
    }

    // Add technical data if requested
    if (document.getElementById('attachTechnicalData').checked) {
      const technicalData = buildTechnicalData();
      console.log('[Bug Reporter] Technical data before sanitization:', technicalData.substring(0, 200));

      const sanitizedData = sanitizeText(technicalData); // Remove unicode/emojis

      // Debug: Check if sanitization worked
      const hasNonASCII = /[^\x00-\x7F]/.test(sanitizedData);
      if (hasNonASCII) {
        console.warn('[Bug Reporter] WARNING: Technical data still contains non-ASCII characters after sanitization!');
        // Find and log the first non-ASCII character
        for (let i = 0; i < sanitizedData.length; i++) {
          if (sanitizedData.charCodeAt(i) > 127) {
            console.warn(`[Bug Reporter] First non-ASCII at position ${i}: '${sanitizedData[i]}' (code: ${sanitizedData.charCodeAt(i)})`);
            console.warn(`[Bug Reporter] Context: ...${sanitizedData.substring(Math.max(0, i-50), i+50)}...`);
            break;
          }
        }
      } else {
        console.log('[Bug Reporter] Technical data is clean (all ASCII)');
      }

      const blob = new Blob([sanitizedData], { type: 'application/json' });
      const reader = new FileReader();

      await new Promise((resolve) => {
        reader.onloadend = () => {
          attachments.push({
            data: reader.result,
            filename: `technical-data-${Date.now()}.json`,
            type: 'application/json'
          });
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    }

    // Add HAR file if network requests are available
    if (settings.includeNetworkRequests && networkRequests.length > 0) {
      const harData = buildHARFile();
      const sanitizedHar = sanitizeText(harData); // Remove unicode/emojis
      const harBlob = new Blob([sanitizedHar], { type: 'application/json' });
      const harReader = new FileReader();

      await new Promise((resolve) => {
        harReader.onloadend = () => {
          attachments.push({
            data: harReader.result,
            filename: `network-requests-${Date.now()}.har`,
            type: 'application/json'
          });
          resolve();
        };
        harReader.readAsDataURL(harBlob);
      });
    }

    // Add console logs file if available
    if (settings.includeConsoleLogs && consoleLogs.length > 0) {
      const consoleLogsData = buildConsoleLogsFile();
      const sanitizedLogs = sanitizeText(consoleLogsData); // Remove unicode/emojis
      const logsBlob = new Blob([sanitizedLogs], { type: 'text/plain' });
      const logsReader = new FileReader();

      await new Promise((resolve) => {
        logsReader.onloadend = () => {
          attachments.push({
            data: logsReader.result,
            filename: `console-logs-${Date.now()}.txt`,
            type: 'text/plain'
          });
          resolve();
        };
        logsReader.readAsDataURL(logsBlob);
      });
    }

    // Create issue with attachments
    const issue = await redmineAPI.createIssueWithAttachments(formData, attachments);

    // Close review modal
    closeReviewModal();

    // Show success screen
    showSuccessScreen(issue);

  } catch (error) {
    console.error('Error submitting bug report:', error);
    alert(`Error submitting bug report: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Confirm & Submit';
    spinner.classList.add('hidden');
  }
}

// Build description
function buildDescription() {
  let description = document.getElementById('description').value;

  const steps = document.getElementById('stepsToReproduce').value;
  const expected = document.getElementById('expectedBehavior').value;
  const actual = document.getElementById('actualBehavior').value;

  if (steps) {
    description += '\n\n## Steps to Reproduce\n' + sanitizeText(steps);
  }

  if (expected) {
    description += '\n\n## Expected Behavior\n' + sanitizeText(expected);
  }

  if (actual) {
    description += '\n\n## Actual Behavior\n' + sanitizeText(actual);
  }

  // Add basic page info (sanitized to prevent unicode issues)
  description += '\n\n## Page Information\n';
  description += `- URL: ${sanitizeText(pageInfo.url || currentTab.url)}\n`;
  description += `- Title: ${sanitizeText(pageInfo.title || currentTab.title)}\n`;
  description += `- Timestamp: ${new Date().toISOString()}\n`;

  // Reference attached files instead of embedding all details
  description += '\n\n## Additional Information\n';
  description += 'Detailed technical information (browser, system, network, performance data) ';
  description += 'is available in the attached technical-data.json file.\n';

  if (videoDataUrl) {
    description += '- Video recording of the issue is attached.\n';
  }

  if (settings.includeNetworkRequests && networkRequests.length > 0) {
    description += `- Network requests (${networkRequests.length} captured) are in the attached HAR file.\n`;
  }

  if (settings.includeConsoleLogs && consoleLogs.length > 0) {
    description += `- Console logs (${consoleLogs.length} entries) are in the attached console logs file.\n`;
  }

  // Sanitize the entire description to remove any remaining unicode
  return sanitizeText(description);
}

// Build technical data JSON
function buildTechnicalData() {
  const data = {
    pageInfo: pageInfo,
    timestamp: new Date().toISOString()
  };

  if (settings.includeConsoleLogs && consoleLogs.length > 0) {
    data.consoleLogs = consoleLogs;
  }

  if (settings.includeNetworkRequests && networkRequests.length > 0) {
    data.networkRequests = networkRequests.map(req => ({
      url: req.url,
      method: req.method,
      type: req.type,
      statusCode: req.statusCode,
      failed: req.failed,
      error: req.error
    }));
  }

  // Sanitize if needed
  if (settings.sanitizeSensitiveData) {
    return JSON.stringify(data, null, 2);
  }

  return JSON.stringify(data, null, 2);
}

// Build HAR (HTTP Archive) file from network requests
function buildHARFile() {
  const harLog = {
    log: {
      version: '1.2',
      creator: {
        name: 'Cap-screen Bug Reporter',
        version: '1.0'
      },
      browser: {
        name: pageInfo.browser?.name || 'Unknown',
        version: pageInfo.browser?.version || 'Unknown'
      },
      pages: [
        {
          startedDateTime: pageInfo.timestamp || new Date().toISOString(),
          id: 'page_1',
          title: pageInfo.title || 'Unknown',
          pageTimings: {
            onContentLoad: pageInfo.performance?.timing?.domReadyTime || -1,
            onLoad: pageInfo.performance?.timing?.loadTime || -1
          }
        }
      ],
      entries: networkRequests.map(req => {
        const entry = {
          pageref: 'page_1',
          startedDateTime: new Date(req.timestamp).toISOString(),
          time: 0,
          request: {
            method: req.method || 'GET',
            url: req.url || '',
            httpVersion: 'HTTP/1.1',
            headers: [],
            queryString: [],
            cookies: [],
            headersSize: -1,
            bodySize: -1
          },
          response: {
            status: req.statusCode || 0,
            statusText: getStatusText(req.statusCode),
            httpVersion: 'HTTP/1.1',
            headers: (req.responseHeaders || []).map(h => ({
              name: h.name,
              value: h.value
            })),
            cookies: [],
            content: {
              size: -1,
              mimeType: getContentType(req.responseHeaders) || req.type || 'text/plain'
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: -1
          },
          cache: {
            beforeRequest: null,
            afterRequest: req.fromCache ? { expires: '', lastAccess: '', eTag: '', hitCount: 1 } : null
          },
          timings: {
            blocked: -1,
            dns: -1,
            connect: -1,
            send: 0,
            wait: 0,
            receive: 0,
            ssl: -1
          },
          serverIPAddress: req.ip || '',
          connection: ''
        };

        // Add error information if request failed
        if (req.failed || req.error) {
          entry._error = req.error || 'Request failed';
        }

        // Add resource type
        if (req.type) {
          entry._resourceType = req.type;
        }

        return entry;
      })
    }
  };

  return JSON.stringify(harLog, null, 2);
}

// Helper function to get HTTP status text
function getStatusText(statusCode) {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };
  return statusTexts[statusCode] || '';
}

// Helper function to get content type from response headers
function getContentType(headers) {
  if (!headers) return null;
  const contentTypeHeader = headers.find(h => h.name.toLowerCase() === 'content-type');
  return contentTypeHeader ? contentTypeHeader.value : null;
}

// Build console logs file content
function buildConsoleLogsFile() {
  if (!consoleLogs || consoleLogs.length === 0) {
    return 'No console logs captured.';
  }

  let logsContent = '='.repeat(80) + '\n';
  logsContent += 'CONSOLE LOGS\n';
  logsContent += `Captured: ${new Date().toISOString()}\n`;
  logsContent += `Total Logs: ${consoleLogs.length}\n`;
  logsContent += '='.repeat(80) + '\n\n';

  consoleLogs.forEach((log, index) => {
    logsContent += `[${index + 1}] ${log.timestamp || 'Unknown time'}\n`;
    logsContent += `Type: ${(log.type || 'log').toUpperCase()}\n`;
    logsContent += `URL: ${log.url || 'N/A'}\n`;
    logsContent += `Message: ${log.message || ''}\n`;

    if (log.stack) {
      logsContent += `Stack Trace:\n${log.stack}\n`;
    }

    logsContent += '-'.repeat(80) + '\n\n';
  });

  return logsContent;
}

// Show success screen
function showSuccessScreen(issue) {
  showSection('successSection');

  const issueLink = document.getElementById('issueLink');
  const issueUrl = `${settings.redmineUrl}/issues/${issue.id}`;

  issueLink.innerHTML = `
    <strong>Issue #${issue.id}</strong><br>
    <a href="${issueUrl}" target="_blank">${issueUrl}</a>
  `;
}

// Reset form for new report
function resetForm() {
  screenshotDataUrl = null;
  annotator = null;
  pageInfo = {};
  networkRequests = [];
  consoleLogs = [];
  videoDataUrl = null;
  recordedChunks = [];
  isRecording = false;

  // Reset recording UI
  document.getElementById('startRecording').style.display = 'inline-block';
  document.getElementById('stopRecording').style.display = 'none';
  document.getElementById('recordingStatus').textContent = '';

  document.getElementById('bugReportForm').reset();
  showSection('captureSection');
}

// Open settings
function openSettings() {
  // Always open settings in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('options/options.html')
  });
}

// Show section
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
    section.classList.add('hidden');
  });
  const targetSection = document.getElementById(sectionId);
  targetSection.classList.add('active');
  targetSection.classList.remove('hidden');
}

// Show status message
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message ${type}`;
}

// Populate review modal with all data
async function populateReviewModal() {
  try {
    console.log('populateReviewModal started');

    // Get form data with labels
    const projectSelect = document.getElementById('project');
    const trackerSelect = document.getElementById('tracker');
    const prioritySelect = document.getElementById('priority');
    const assigneeSelect = document.getElementById('assignee');

    console.log('Form elements found:', {
      project: !!projectSelect,
      tracker: !!trackerSelect,
      priority: !!prioritySelect,
      assignee: !!assigneeSelect
    });

    // Form Data Tab - Populate editable fields
    // Clone project options
    const reviewProjectSelect = document.getElementById('reviewProjectSelect');
    if (!reviewProjectSelect) {
      throw new Error('reviewProjectSelect not found in DOM');
    }
    reviewProjectSelect.innerHTML = '';
    Array.from(projectSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewProjectSelect.appendChild(newOption);
    });
    reviewProjectSelect.value = projectSelect.value;

    // Clone tracker options
    const reviewTrackerSelect = document.getElementById('reviewTrackerSelect');
    if (!reviewTrackerSelect) {
      throw new Error('reviewTrackerSelect not found in DOM');
    }
    reviewTrackerSelect.innerHTML = '';
    Array.from(trackerSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewTrackerSelect.appendChild(newOption);
    });
    reviewTrackerSelect.value = trackerSelect.value;

    // Set subject/title
    const reviewSubjectInput = document.getElementById('reviewSubjectInput');
    if (!reviewSubjectInput) {
      throw new Error('reviewSubjectInput not found in DOM');
    }
    reviewSubjectInput.value = document.getElementById('subject').value || '';

    // Clone priority options
    const reviewPrioritySelect = document.getElementById('reviewPrioritySelect');
    if (!reviewPrioritySelect) {
      throw new Error('reviewPrioritySelect not found in DOM');
    }
    reviewPrioritySelect.innerHTML = '';
    Array.from(prioritySelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewPrioritySelect.appendChild(newOption);
    });
    reviewPrioritySelect.value = prioritySelect.value;

    // Clone assignee options
    const reviewAssigneeSelect = document.getElementById('reviewAssigneeSelect');
    if (!reviewAssigneeSelect) {
      throw new Error('reviewAssigneeSelect not found in DOM');
    }
    reviewAssigneeSelect.innerHTML = '';
    Array.from(assigneeSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewAssigneeSelect.appendChild(newOption);
    });
    reviewAssigneeSelect.value = assigneeSelect.value;

    // Set description
    const reviewDescriptionText = document.getElementById('reviewDescriptionText');
    if (!reviewDescriptionText) {
      throw new Error('reviewDescriptionText not found in DOM');
    }
    reviewDescriptionText.value = buildDescription();

    console.log('All editable fields populated successfully');

    // Media Tab - Show screenshot and/or video
    const mediaTabContent = document.getElementById('mediaTab').querySelector('.review-section');
    mediaTabContent.innerHTML = '';

    let hasMedia = false;
    const mediaInfo = document.createElement('p');
    mediaInfo.className = 'tab-info';
    let infoText = [];

    // Add screenshot if available
    if (annotator) {
      hasMedia = true;
      infoText.push('1 screenshot');

      const label = document.createElement('p');
      label.style.cssText = 'font-weight: 600; margin-bottom: 8px; margin-top: 16px; color: #333;';
      label.textContent = 'Screenshot';

      const img = document.createElement('img');
      img.className = 'review-image';
      img.src = annotator.getAnnotatedImage();
      img.style.marginBottom = '16px';

      mediaTabContent.appendChild(label);
      mediaTabContent.appendChild(img);
    }

    // Add video if available
    if (videoDataUrl) {
      hasMedia = true;
      infoText.push('1 video');

      const label = document.createElement('p');
      label.style.cssText = 'font-weight: 600; margin-bottom: 8px; margin-top: 16px; color: #333;';
      label.textContent = 'Video Recording';

      const video = document.createElement('video');
      video.className = 'review-image';
      video.src = videoDataUrl;
      video.controls = true;
      video.style.marginBottom = '16px';

      mediaTabContent.appendChild(label);
      mediaTabContent.appendChild(video);
    }

    // Add info text at the beginning
    if (hasMedia) {
      mediaInfo.textContent = `${infoText.join(' and ')} will be attached:`;
      mediaTabContent.insertBefore(mediaInfo, mediaTabContent.firstChild);
    }

    // Page Info Tab - Format for better readability
    const pageInfoContainer = document.getElementById('reviewPageInfo');
    pageInfoContainer.innerHTML = ''; // Clear to add formatted content

    // Create structured display instead of raw JSON
    const pageInfoHtml = `
      <div class="info-section">
        <h4>📄 Page Details</h4>
        <div class="info-item"><strong>URL:</strong> ${pageInfo.url || 'N/A'}</div>
        <div class="info-item"><strong>Title:</strong> ${pageInfo.title || 'N/A'}</div>
        <div class="info-item"><strong>Timestamp:</strong> ${pageInfo.timestamp || 'N/A'}</div>
      </div>

      ${pageInfo.browser ? `
      <div class="info-section">
        <h4>🌐 Browser Information</h4>
        <div class="info-item"><strong>Name:</strong> ${pageInfo.browser.name || 'Unknown'}</div>
        <div class="info-item"><strong>Version:</strong> ${pageInfo.browser.version || 'Unknown'}</div>
        <div class="info-item"><strong>Vendor:</strong> ${pageInfo.browser.vendor || 'Unknown'}</div>
        <div class="info-item"><strong>Language:</strong> ${pageInfo.browser.language || 'Unknown'}</div>
        <div class="info-item"><strong>Platform:</strong> ${pageInfo.browser.platform || 'Unknown'}</div>
        <div class="info-item"><strong>Online Status:</strong> ${pageInfo.browser.onLine ? '✅ Online' : '❌ Offline'}</div>
      </div>
      ` : ''}

      ${pageInfo.system ? `
      <div class="info-section">
        <h4>💻 System Information</h4>
        ${pageInfo.system.os ? `
        <div class="info-item"><strong>OS Name:</strong> ${pageInfo.system.os.name || 'Unknown'}</div>
        <div class="info-item"><strong>OS Version:</strong> ${pageInfo.system.os.version || 'Unknown'}</div>
        <div class="info-item"><strong>Architecture:</strong> ${pageInfo.system.os.architecture || 'Unknown'}</div>
        ` : ''}
        <div class="info-item"><strong>CPU Cores:</strong> ${pageInfo.system.cpuCores || 'Unknown'}</div>
        <div class="info-item"><strong>Memory (RAM):</strong> ${pageInfo.system.deviceMemory || 'Unknown'}</div>
        <div class="info-item"><strong>Touch Points:</strong> ${pageInfo.system.maxTouchPoints || 0}</div>
      </div>
      ` : ''}

      ${pageInfo.screen ? `
      <div class="info-section">
        <h4>🖥️ Screen Information</h4>
        <div class="info-item"><strong>Resolution:</strong> ${pageInfo.screen.width} × ${pageInfo.screen.height}</div>
        <div class="info-item"><strong>Available:</strong> ${pageInfo.screen.availWidth} × ${pageInfo.screen.availHeight}</div>
        <div class="info-item"><strong>Device Pixel Ratio:</strong> ${pageInfo.screen.devicePixelRatio || 1}</div>
      </div>
      ` : ''}

      ${pageInfo.viewport ? `
      <div class="info-section">
        <h4>📐 Viewport Information</h4>
        <div class="info-item"><strong>Size:</strong> ${pageInfo.viewport.width} × ${pageInfo.viewport.height}</div>
        <div class="info-item"><strong>Scroll Position:</strong> X: ${pageInfo.viewport.scrollX}, Y: ${pageInfo.viewport.scrollY}</div>
      </div>
      ` : ''}

      ${pageInfo.network ? `
      <div class="info-section">
        <h4>🌐 Network Information</h4>
        <div class="info-item"><strong>Connection Type:</strong> ${pageInfo.network.connectionType || 'Unknown'}</div>
        <div class="info-item"><strong>Effective Type:</strong> ${pageInfo.network.effectiveType || 'Unknown'}</div>
        <div class="info-item"><strong>Download Speed:</strong> ${pageInfo.network.downlink || 'Unknown'}</div>
        <div class="info-item"><strong>Latency (RTT):</strong> ${pageInfo.network.rtt || 'Unknown'}</div>
        <div class="info-item"><strong>Data Saver:</strong> ${pageInfo.network.saveData ? '✅ Enabled' : '❌ Disabled'}</div>
      </div>
      ` : ''}

      ${pageInfo.performance ? `
      <div class="info-section">
        <h4>⚡ Performance Metrics</h4>
        ${pageInfo.performance.timing ? `
        <div class="info-item"><strong>Page Load Time:</strong> ${pageInfo.performance.timing.loadTime || 'N/A'} ms</div>
        <div class="info-item"><strong>DOM Ready Time:</strong> ${pageInfo.performance.timing.domReadyTime || 'N/A'} ms</div>
        <div class="info-item"><strong>Response Time:</strong> ${pageInfo.performance.timing.responseTime || 'N/A'} ms</div>
        ` : ''}
      </div>
      ` : ''}

      <div class="info-section">
        <h4>📋 Raw JSON Data</h4>
        <details>
          <summary style="cursor: pointer; color: #2196F3; margin-bottom: 8px;">Click to view raw JSON</summary>
          <pre class="code-block" style="margin-top: 8px;">${JSON.stringify(pageInfo, null, 2)}</pre>
        </details>
      </div>
    `;

    pageInfoContainer.innerHTML = pageInfoHtml;

    // Network Tab
    const networkCount = networkRequests.length;
    document.getElementById('networkCount').textContent = networkCount;
    document.getElementById('networkCountText').textContent = networkCount;

    const networkContainer = document.getElementById('reviewNetwork');
    networkContainer.innerHTML = '';

    if (networkCount === 0) {
      networkContainer.innerHTML = '<p style="color: #666; font-size: 12px;">No network requests captured</p>';
    } else {
      networkRequests.slice(0, 50).forEach((req, index) => {
        const item = document.createElement('div');
        item.className = 'data-item network-item';

        const statusClass = req.failed ? 'error' : (req.statusCode >= 200 && req.statusCode < 300) ? 'success' : 'warning';
        const statusIcon = req.failed ? '❌' : (req.statusCode >= 200 && req.statusCode < 300) ? '✅' : '⚠️';

        item.innerHTML = `
          <div class="data-item-header">
            <div style="flex: 1;">
              <span class="data-item-badge">#${index + 1}</span>
              <span class="data-item-method">${req.method || 'GET'}</span>
              <span class="data-item-type">${req.type || 'other'}</span>
            </div>
            <span class="data-item-status ${statusClass}">
              ${statusIcon} ${req.failed ? 'Failed' : (req.statusCode || 'Pending')}
            </span>
          </div>
          <div class="data-item-url" title="${req.url}">${truncateUrl(req.url, 100)}</div>
          <div class="data-item-details">
            ${req.ip ? `<span>📍 IP: ${req.ip}</span>` : ''}
            ${req.fromCache ? '<span>💾 Cached</span>' : ''}
            ${req.error ? `<span style="color: #f44336;">❌ Error: ${req.error}</span>` : ''}
          </div>
        `;

        networkContainer.appendChild(item);
      });

      if (networkCount > 50) {
        const more = document.createElement('p');
        more.style.cssText = 'color: #666; font-size: 11px; margin-top: 8px;';
        more.textContent = `... and ${networkCount - 50} more requests`;
        networkContainer.appendChild(more);
      }
    }

    // Console Tab
    const consoleCount = consoleLogs.length;
    document.getElementById('consoleCount').textContent = consoleCount;
    document.getElementById('consoleCountText').textContent = consoleCount;

    const consoleContainer = document.getElementById('reviewConsole');
    consoleContainer.innerHTML = '';

    if (consoleCount === 0) {
      consoleContainer.innerHTML = '<p style="color: #666; font-size: 12px;">No console logs captured</p>';
    } else {
      consoleLogs.slice(0, 50).forEach((log, index) => {
        const item = document.createElement('div');
        item.className = `console-item ${log.type}`;

        // Get icon and color for log type
        let typeIcon = '📝';
        let typeColor = '#666';
        if (log.type === 'error') {
          typeIcon = '❌';
          typeColor = '#f44336';
        } else if (log.type === 'warn') {
          typeIcon = '⚠️';
          typeColor = '#ff9800';
        } else if (log.type === 'info') {
          typeIcon = 'ℹ️';
          typeColor = '#2196F3';
        } else if (log.type === 'log') {
          typeIcon = '📋';
          typeColor = '#4CAF50';
        }

        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A';

        item.innerHTML = `
          <div class="console-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span class="data-item-badge">#${index + 1}</span>
            <span style="color: ${typeColor}; font-weight: bold;">${typeIcon} ${log.type.toUpperCase()}</span>
            <span class="console-timestamp" style="color: #999; font-size: 11px;">${timestamp}</span>
          </div>
          <div class="console-message" style="margin-left: 24px; word-break: break-word;">${escapeHtml(log.message || '')}</div>
          ${log.url ? `<div class="console-url" style="margin-left: 24px; font-size: 11px; color: #666; margin-top: 4px;">📍 ${log.url}</div>` : ''}
          ${log.stack ? `
            <details style="margin-left: 24px; margin-top: 8px;">
              <summary style="cursor: pointer; color: #2196F3; font-size: 11px;">View Stack Trace</summary>
              <pre style="margin-top: 4px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 10px; overflow-x: auto;">${escapeHtml(log.stack)}</pre>
            </details>
          ` : ''}
        `;

        consoleContainer.appendChild(item);
      });

      if (consoleCount > 50) {
        const more = document.createElement('p');
        more.style.cssText = 'color: #666; font-size: 11px; margin-top: 8px;';
        more.textContent = `... and ${consoleCount - 50} more log entries`;
        consoleContainer.appendChild(more);
      }
    }

    console.log('populateReviewModal completed successfully');
  } catch (error) {
    console.error('Error in populateReviewModal:', error);
    throw error;
  }
}

// Switch tabs in review modal
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Close review modal
function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

// Helper function to truncate URL
function truncateUrl(url, maxLength = 80) {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
