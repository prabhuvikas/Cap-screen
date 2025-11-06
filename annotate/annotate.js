// Annotate Page JavaScript - Full-screen annotation and bug report submission

let screenshots = []; // Array of {id, data, annotations, timestamp}
let currentScreenshotId = null;
let screenshotDataUrl = null;
let annotator = null;
let settings = {};
let pageInfo = {};
let networkRequests = [];
let consoleLogs = [];
let redmineAPI = null;
let currentTab = null;
let annotationTabId = null; // Store the annotation tab ID

// Sanitize text to remove unicode/emoji characters that cause 500 errors
function sanitizeText(text) {
  if (!text) return text;

  const str = typeof text === 'string' ? text : String(text);

  // Remove 4-byte UTF-8 characters (emojis, surrogate pairs) first
  let sanitized = str.replace(/[\uD800-\uDFFF]/g, '');

  // Replace problematic unicode characters with safe equivalents
  sanitized = sanitized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u2022]/g, '*')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[^\x00-\x7F]/g, '');

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return sanitized;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Annotate] Page loaded, initializing...');

  // Store the current annotation tab ID
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  annotationTabId = tabs[0].id;
  console.log('[Annotate] Annotation tab ID:', annotationTabId);

  // Show loading section initially
  showSection('loadingSection');

  try {
    // Load settings
    await loadSettings();

    // Check if Redmine is configured
    if (!settings.redmineUrl || !settings.apiKey) {
      showError('Please configure your Redmine server settings first.');
      return;
    }

    // Initialize Redmine API
    redmineAPI = new RedmineAPI(settings.redmineUrl, settings.apiKey);

    // Load screenshot data from session storage
    const result = await chrome.storage.session.get(['screenshots', 'screenshotData', 'tabId', 'currentScreenshotId']);

    // Check if we have the new multi-screenshot format or old single screenshot
    if (result.screenshots && result.screenshots.length > 0) {
      // Load existing screenshots array
      screenshots = result.screenshots;
      currentScreenshotId = result.currentScreenshotId || screenshots[0].id;
      currentTab = { id: result.tabId || screenshots[0].tabId };
      console.log('[Annotate] Loaded', screenshots.length, 'screenshot(s) from storage');
    } else if (result.screenshotData) {
      // Convert old single screenshot format to new array format
      const newScreenshot = {
        id: generateId(),
        data: result.screenshotData,
        annotations: null,
        timestamp: Date.now(),
        tabId: result.tabId
      };
      screenshots = [newScreenshot];
      currentScreenshotId = newScreenshot.id;
      currentTab = { id: result.tabId };

      // Save in new format
      await chrome.storage.session.set({
        screenshots: screenshots,
        currentScreenshotId: currentScreenshotId,
        tabId: result.tabId
      });

      console.log('[Annotate] Converted single screenshot to multi-screenshot format');
    } else {
      showError('No screenshot data found. Please capture a screenshot first.');
      return;
    }

    console.log('[Annotate] Screenshot data loaded successfully');

    // Setup event listeners
    setupEventListeners();

    // Initialize annotation with current screenshot
    initializeAnnotation();

    // Update screenshots list UI
    updateScreenshotsList();

  } catch (error) {
    console.error('[Annotate] Initialization error:', error);
    showError(`Error initializing page: ${error.message}`);
  }
});

// Load settings from storage
async function loadSettings() {
  settings = await chrome.storage.sync.get({
    redmineUrl: '',
    apiKey: '',
    defaultProject: '',
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
  // Header actions
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeTab').addEventListener('click', () => window.close());

  // Screenshot management
  document.getElementById('captureAnotherBtn').addEventListener('click', captureAnotherScreenshot);

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
  document.getElementById('backToAnnotate').addEventListener('click', () => showSection('annotateSection'));
  document.getElementById('backToAnnotateBtn').addEventListener('click', () => showSection('annotateSection'));

  // Form
  document.getElementById('project').addEventListener('change', onProjectChange);
  document.getElementById('bugReportForm').addEventListener('submit', submitBugReport);

  // Success/Error
  document.getElementById('closeAfterSuccess').addEventListener('click', () => window.close());
  document.getElementById('closeAfterError').addEventListener('click', () => window.close());

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

// Initialize annotation
function initializeAnnotation() {
  console.log('[Annotate] Initializing annotation canvas...');

  const currentScreenshot = screenshots.find(s => s.id === currentScreenshotId);
  if (!currentScreenshot) {
    console.error('[Annotate] Current screenshot not found');
    return;
  }

  screenshotDataUrl = currentScreenshot.data;

  const canvas = document.getElementById('annotationCanvas');
  annotator = new Annotator(canvas, screenshotDataUrl);

  // Restore annotations if they exist
  if (currentScreenshot.annotations) {
    annotator.restoreState(currentScreenshot.annotations);
  }

  // Show annotation section
  showSection('annotateSection');

  console.log('[Annotate] Annotation initialized successfully');
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
      annotator.addText(50, 50, text);
    }
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Capture another screenshot
async function captureAnotherScreenshot() {
  try {
    console.log('[Annotate] Capturing another screenshot...');

    // Save current annotations before switching
    await saveCurrentAnnotations();

    // Get the tab ID to capture
    const tabId = currentTab.id;

    if (!tabId) {
      alert('Original tab not found. Please capture from the popup.');
      return;
    }

    // Check if the original tab still exists
    let targetTab;
    try {
      targetTab = await chrome.tabs.get(tabId);
    } catch (e) {
      alert('Original tab has been closed. Please open the page again and capture a new screenshot.');
      return;
    }

    console.log('[Annotate] Switching to original tab:', tabId);

    // Switch to the original tab to capture it
    await chrome.tabs.update(tabId, { active: true });

    // Wait a bit for the tab to become visible
    await new Promise(resolve => setTimeout(resolve, 300));

    // Capture the screenshot from the original tab
    const newScreenshotData = await chrome.tabs.captureVisibleTab(targetTab.windowId, {
      format: 'png',
      quality: 100
    });

    // Switch back to the annotation tab
    await chrome.tabs.update(annotationTabId, { active: true });

    if (!newScreenshotData) {
      alert('Failed to capture screenshot');
      return;
    }

    // Create new screenshot object
    const newScreenshot = {
      id: generateId(),
      data: newScreenshotData,
      annotations: null,
      timestamp: Date.now(),
      tabId: tabId
    };

    // Add to screenshots array
    screenshots.push(newScreenshot);
    currentScreenshotId = newScreenshot.id;

    // Save to storage
    await chrome.storage.session.set({
      screenshots: screenshots,
      currentScreenshotId: currentScreenshotId,
      tabId: tabId
    });

    console.log('[Annotate] New screenshot captured, total:', screenshots.length);

    // Reinitialize annotation with new screenshot
    initializeAnnotation();

    // Update screenshots list
    updateScreenshotsList();

  } catch (error) {
    console.error('[Annotate] Error capturing another screenshot:', error);
    alert('Error capturing screenshot: ' + error.message);
  }
}

// Save current annotations
async function saveCurrentAnnotations() {
  if (!annotator || !currentScreenshotId) return;

  const currentScreenshot = screenshots.find(s => s.id === currentScreenshotId);
  if (currentScreenshot) {
    // Get annotator state (we'll need to add a method to Annotator class)
    currentScreenshot.annotations = annotator.getState ? annotator.getState() : null;

    // Save to storage
    await chrome.storage.session.set({
      screenshots: screenshots
    });

    console.log('[Annotate] Saved annotations for screenshot', currentScreenshotId);
  }
}

// Switch to a different screenshot
async function switchScreenshot(screenshotId) {
  if (screenshotId === currentScreenshotId) return;

  try {
    console.log('[Annotate] Switching to screenshot', screenshotId);

    // Save current annotations
    await saveCurrentAnnotations();

    // Update current screenshot
    currentScreenshotId = screenshotId;

    // Save to storage
    await chrome.storage.session.set({
      currentScreenshotId: currentScreenshotId
    });

    // Reinitialize annotation with selected screenshot
    initializeAnnotation();

    // Update UI
    updateScreenshotsList();

  } catch (error) {
    console.error('[Annotate] Error switching screenshot:', error);
  }
}

// Delete a screenshot
async function deleteScreenshot(screenshotId) {
  if (screenshots.length === 1) {
    alert('Cannot delete the last screenshot');
    return;
  }

  if (!confirm('Are you sure you want to delete this screenshot?')) {
    return;
  }

  try {
    console.log('[Annotate] Deleting screenshot', screenshotId);

    // Remove from array
    screenshots = screenshots.filter(s => s.id !== screenshotId);

    // If deleting current screenshot, switch to first one
    if (screenshotId === currentScreenshotId) {
      currentScreenshotId = screenshots[0].id;
      initializeAnnotation();
    }

    // Save to storage
    await chrome.storage.session.set({
      screenshots: screenshots,
      currentScreenshotId: currentScreenshotId
    });

    // Update UI
    updateScreenshotsList();

    console.log('[Annotate] Screenshot deleted, remaining:', screenshots.length);

  } catch (error) {
    console.error('[Annotate] Error deleting screenshot:', error);
  }
}

// Update screenshots list UI
function updateScreenshotsList() {
  const listContainer = document.getElementById('screenshotsList');
  listContainer.innerHTML = '';

  screenshots.forEach((screenshot, index) => {
    const item = document.createElement('div');
    item.className = 'screenshot-item' + (screenshot.id === currentScreenshotId ? ' active' : '');

    const content = document.createElement('div');
    content.className = 'screenshot-item-content';

    const thumbnail = document.createElement('img');
    thumbnail.className = 'screenshot-thumbnail';
    thumbnail.src = screenshot.data;
    thumbnail.alt = `Screenshot ${index + 1}`;

    const info = document.createElement('div');
    info.className = 'screenshot-info';

    const number = document.createElement('span');
    number.className = 'screenshot-number';
    number.textContent = `Screenshot ${index + 1}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'screenshot-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteScreenshot(screenshot.id);
    };

    info.appendChild(number);
    if (screenshots.length > 1) {
      info.appendChild(deleteBtn);
    }

    content.appendChild(thumbnail);
    content.appendChild(info);

    item.appendChild(content);

    item.onclick = () => switchScreenshot(screenshot.id);

    listContainer.appendChild(item);
  });
}

// Continue to report form
async function continueToReport() {
  console.log('[Annotate] Continuing to report section...');

  // Save current annotations before continuing
  await saveCurrentAnnotations();

  // Update preview with first screenshot (we'll show all in review modal)
  if (screenshots.length > 0) {
    const firstScreenshot = screenshots.find(s => s.id === currentScreenshotId);
    if (firstScreenshot && annotator) {
      const previewImg = document.getElementById('previewImage');
      previewImg.src = annotator.getAnnotatedImage();
    }
  }

  showSection('reportSection');

  // Collect technical data
  await collectTechnicalData();

  // Load Redmine data
  await loadRedmineData();
}

// Collect technical data
async function collectTechnicalData() {
  if (!currentTab || !currentTab.id) {
    console.warn('[Annotate] No tab ID available for data collection');
    return;
  }

  try {
    console.log('[Annotate] Collecting technical data...');

    // Ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content/content.js']
      });
    } catch (e) {
      console.log('[Annotate] Content script injection skipped:', e.message);
    }

    // Collect page information
    try {
      const pageInfoResponse = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'collectPageInfo'
      });

      if (pageInfoResponse && pageInfoResponse.success) {
        pageInfo = pageInfoResponse.data;
        console.log('[Annotate] Page info collected:', pageInfo);
      }
    } catch (e) {
      console.warn('[Annotate] Could not collect page info:', e.message);
    }

    // Collect console logs
    if (settings.includeConsoleLogs) {
      try {
        const logsResponse = await chrome.runtime.sendMessage({
          action: 'getConsoleLogs',
          tabId: currentTab.id
        });

        if (logsResponse && logsResponse.success) {
          consoleLogs = logsResponse.data;
          console.log('[Annotate] Console logs collected:', consoleLogs.length);
        }
      } catch (e) {
        console.warn('[Annotate] Could not collect console logs:', e.message);
      }
    }

    // Collect network requests
    if (settings.includeNetworkRequests) {
      try {
        const networkResponse = await chrome.runtime.sendMessage({
          action: 'getNetworkRequests',
          tabId: currentTab.id
        });

        if (networkResponse && networkResponse.success) {
          networkRequests = networkResponse.data;
          console.log('[Annotate] Network requests collected:', networkRequests.length);
        }
      } catch (e) {
        console.warn('[Annotate] Could not collect network requests:', e.message);
      }
    }

    // Collect storage data
    if (settings.includeLocalStorage || settings.includeCookies) {
      try {
        const storageResponse = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'collectStorageData'
        });

        if (storageResponse && storageResponse.success) {
          pageInfo.storage = storageResponse.data;
        }
      } catch (e) {
        console.warn('[Annotate] Could not collect storage data:', e.message);
      }
    }
  } catch (error) {
    console.error('[Annotate] Error collecting technical data:', error);
  }
}

// Load Redmine data
async function loadRedmineData() {
  try {
    console.log('[Annotate] Loading Redmine data...');

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
      if (priority.name.toLowerCase() === 'normal') {
        option.selected = true;
      }
      prioritySelect.appendChild(option);
    });

    // Trigger project change to load project-specific data
    if (settings.defaultProject) {
      await onProjectChange();
    }

    console.log('[Annotate] Redmine data loaded successfully');
  } catch (error) {
    console.error('[Annotate] Error loading Redmine data:', error);
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
    console.error('[Annotate] Error loading project data:', error);
  }
}

// Submit bug report - Show review modal first
async function submitBugReport(e) {
  e.preventDefault();

  try {
    console.log('[Annotate] Preparing bug report submission...');

    // Populate review modal with all data
    await populateReviewModal();

    // Show review modal
    const modal = document.getElementById('reviewModal');
    modal.classList.remove('hidden');
  } catch (error) {
    console.error('[Annotate] Error showing review modal:', error);
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

    // Get form data from review modal
    const formData = {
      project_id: document.getElementById('reviewProjectSelect').value,
      tracker_id: document.getElementById('reviewTrackerSelect').value,
      subject: document.getElementById('reviewSubjectInput').value,
      description: document.getElementById('reviewDescriptionText').value,
      priority_id: document.getElementById('reviewPrioritySelect').value,
      assigned_to_id: document.getElementById('reviewAssigneeSelect').value
    };

    // Validate required fields
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

    // Add all annotated screenshots
    console.log('[Annotate] Adding', screenshots.length, 'screenshot(s) to attachments...');
    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];

      // Create a temporary annotator to get the annotated image
      const tempCanvas = document.createElement('canvas');
      const tempAnnotator = new Annotator(tempCanvas, screenshot.data);

      // Restore annotations if they exist
      if (screenshot.annotations && tempAnnotator.restoreState) {
        tempAnnotator.restoreState(screenshot.annotations);
      }

      const annotatedImage = tempAnnotator.getAnnotatedImage();
      attachments.push({
        data: annotatedImage,
        filename: `screenshot-${i + 1}-${Date.now()}.png`,
        type: 'image/png'
      });

      console.log('[Annotate] Added screenshot', i + 1, 'to attachments');
    }

    // Add technical data if requested
    if (document.getElementById('attachTechnicalData').checked) {
      const technicalData = buildTechnicalData();
      const sanitizedData = sanitizeText(technicalData);

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
      const sanitizedHar = sanitizeText(harData);
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
      const sanitizedLogs = sanitizeText(consoleLogsData);
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

    // Add user-uploaded documents
    const fileInput = document.getElementById('additionalDocuments');
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      console.log('[Annotate] Processing', fileInput.files.length, 'additional documents...');

      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        const fileReader = new FileReader();

        await new Promise((resolve, reject) => {
          fileReader.onloadend = () => {
            attachments.push({
              data: fileReader.result,
              filename: file.name,
              type: file.type || 'application/octet-stream'
            });
            console.log('[Annotate] Added document:', file.name, `(${file.type}, ${file.size} bytes)`);
            resolve();
          };
          fileReader.onerror = () => {
            console.error('[Annotate] Error reading file:', file.name);
            reject(new Error(`Failed to read file: ${file.name}`));
          };
          fileReader.readAsDataURL(file);
        });
      }
    }

    console.log('[Annotate] Creating issue with', attachments.length, 'attachments...');

    // Create issue with attachments
    const issue = await redmineAPI.createIssueWithAttachments(formData, attachments);

    console.log('[Annotate] Issue created successfully:', issue);

    // Close review modal
    closeReviewModal();

    // Clear session storage
    await chrome.storage.session.remove(['screenshotData', 'tabId']);

    // Show success screen
    showSuccessScreen(issue);

  } catch (error) {
    console.error('[Annotate] Error submitting bug report:', error);
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

  // Add basic page info
  description += '\n\n## Page Information\n';
  description += `- URL: ${sanitizeText(pageInfo.url || 'N/A')}\n`;
  description += `- Title: ${sanitizeText(pageInfo.title || 'N/A')}\n`;
  description += `- Timestamp: ${new Date().toISOString()}\n`;

  // Reference attached files
  description += '\n\n## Additional Information\n';
  description += 'Detailed technical information (browser, system, network, performance data) ';
  description += 'is available in the attached technical-data.json file.\n';

  if (settings.includeNetworkRequests && networkRequests.length > 0) {
    description += `- Network requests (${networkRequests.length} captured) are in the attached HAR file.\n`;
  }

  if (settings.includeConsoleLogs && consoleLogs.length > 0) {
    description += `- Console logs (${consoleLogs.length} entries) are in the attached console logs file.\n`;
  }

  // Mention multiple screenshots if applicable
  if (screenshots && screenshots.length > 1) {
    description += `\n### Screenshots\n`;
    description += `${screenshots.length} screenshot(s) attached to this report.\n`;
  }

  // Mention additional user-uploaded documents
  const fileInput = document.getElementById('additionalDocuments');
  if (fileInput && fileInput.files && fileInput.files.length > 0) {
    description += `\n### User-Uploaded Documents\n`;
    description += `${fileInput.files.length} additional document(s) attached:\n`;
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      description += `- ${file.name} (${(file.size / 1024).toFixed(2)} KB)\n`;
    }
  }

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

  return JSON.stringify(data, null, 2);
}

// Build HAR file
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

        if (req.failed || req.error) {
          entry._error = req.error || 'Request failed';
        }

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

// Build console logs file
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

// Populate review modal
async function populateReviewModal() {
  try {
    console.log('[Annotate] Populating review modal...');

    const projectSelect = document.getElementById('project');
    const trackerSelect = document.getElementById('tracker');
    const prioritySelect = document.getElementById('priority');
    const assigneeSelect = document.getElementById('assignee');

    // Form Data Tab - Populate editable fields
    const reviewProjectSelect = document.getElementById('reviewProjectSelect');
    reviewProjectSelect.innerHTML = '';
    Array.from(projectSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewProjectSelect.appendChild(newOption);
    });
    reviewProjectSelect.value = projectSelect.value;

    const reviewTrackerSelect = document.getElementById('reviewTrackerSelect');
    reviewTrackerSelect.innerHTML = '';
    Array.from(trackerSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewTrackerSelect.appendChild(newOption);
    });
    reviewTrackerSelect.value = trackerSelect.value;

    const reviewSubjectInput = document.getElementById('reviewSubjectInput');
    reviewSubjectInput.value = document.getElementById('subject').value || '';

    const reviewPrioritySelect = document.getElementById('reviewPrioritySelect');
    reviewPrioritySelect.innerHTML = '';
    Array.from(prioritySelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewPrioritySelect.appendChild(newOption);
    });
    reviewPrioritySelect.value = prioritySelect.value;

    const reviewAssigneeSelect = document.getElementById('reviewAssigneeSelect');
    reviewAssigneeSelect.innerHTML = '';
    Array.from(assigneeSelect.options).forEach(option => {
      const newOption = option.cloneNode(true);
      reviewAssigneeSelect.appendChild(newOption);
    });
    reviewAssigneeSelect.value = assigneeSelect.value;

    const reviewDescriptionText = document.getElementById('reviewDescriptionText');
    reviewDescriptionText.value = buildDescription();

    // Screenshot Tab - Show all screenshots
    const screenshotTabContent = document.getElementById('screenshotTab').querySelector('.review-section');
    screenshotTabContent.innerHTML = '';

    if (screenshots && screenshots.length > 0) {
      const screenshotInfo = document.createElement('p');
      screenshotInfo.className = 'tab-info';
      screenshotInfo.textContent = `${screenshots.length} screenshot(s) will be attached:`;
      screenshotTabContent.appendChild(screenshotInfo);

      screenshots.forEach((screenshot, index) => {
        // Create temporary annotator to get annotated image
        const tempCanvas = document.createElement('canvas');
        const tempAnnotator = new Annotator(tempCanvas, screenshot.data);

        if (screenshot.annotations && tempAnnotator.restoreState) {
          tempAnnotator.restoreState(screenshot.annotations);
        }

        const img = document.createElement('img');
        img.className = 'review-image';
        img.src = tempAnnotator.getAnnotatedImage();
        img.style.marginBottom = '16px';

        const label = document.createElement('p');
        label.style.cssText = 'font-weight: 600; margin-bottom: 8px; color: #333;';
        label.textContent = `Screenshot ${index + 1}`;

        screenshotTabContent.appendChild(label);
        screenshotTabContent.appendChild(img);
      });
    } else if (annotator) {
      // Fallback to single screenshot
      const img = document.createElement('img');
      img.id = 'reviewScreenshot';
      img.className = 'review-image';
      img.src = annotator.getAnnotatedImage();
      screenshotTabContent.appendChild(img);
    }

    // Page Info Tab
    const pageInfoContainer = document.getElementById('reviewPageInfo');
    pageInfoContainer.innerHTML = '';

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

    console.log('[Annotate] Review modal populated successfully');
  } catch (error) {
    console.error('[Annotate] Error populating review modal:', error);
    throw error;
  }
}

// Switch tabs in review modal
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Close review modal
function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
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

// Show error
function showError(message) {
  showSection('errorSection');
  document.getElementById('errorMessage').textContent = message;
}

// Helper function to truncate URL
function truncateUrl(url, maxLength = 80) {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
