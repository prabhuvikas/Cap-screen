// Popup JavaScript - Main bug reporter functionality

let currentTab = null;
let screenshotDataUrl = null;
let annotator = null;
let settings = {};
let pageInfo = {};
let networkRequests = [];
let consoleLogs = [];
let redmineAPI = null;

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

    // Wait a moment then move to annotation
    setTimeout(() => {
      initializeAnnotation();
    }, 500);

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    showStatus('captureStatus', `Error: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
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
      // Select "Normal" by default if available
      if (priority.name.toLowerCase() === 'normal') {
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

  // Populate review modal with all data
  await populateReviewModal();

  // Show review modal
  document.getElementById('reviewModal').classList.remove('hidden');
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
      priority_id: document.getElementById('reviewPrioritySelect').value
    };

    // Validate required fields
    if (!formData.project_id || !formData.tracker_id || !formData.subject || !formData.description || !formData.priority_id) {
      throw new Error('Please fill in all required fields (marked with *)');
    }

    // Optional fields
    const assignee = document.getElementById('reviewAssigneeSelect').value;
    if (assignee) formData.assigned_to_id = assignee;

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

    // Add technical data if requested
    if (document.getElementById('attachTechnicalData').checked) {
      const technicalData = buildTechnicalData();
      const blob = new Blob([technicalData], { type: 'application/json' });
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
    description += '\n\n## Steps to Reproduce\n' + steps;
  }

  if (expected) {
    description += '\n\n## Expected Behavior\n' + expected;
  }

  if (actual) {
    description += '\n\n## Actual Behavior\n' + actual;
  }

  // Add page URL
  description += '\n\n## Page Information\n';
  description += `- URL: ${pageInfo.url || currentTab.url}\n`;
  description += `- Title: ${pageInfo.title || currentTab.title}\n`;
  description += `- Timestamp: ${pageInfo.timestamp || new Date().toISOString()}\n`;

  return description;
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

  document.getElementById('bugReportForm').reset();
  showSection('captureSection');
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Show section
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(sectionId).classList.add('active');
}

// Show status message
function showStatus(elementId, message, type) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message ${type}`;
}

// Populate review modal with all data
async function populateReviewModal() {
  // Get form data with labels
  const projectSelect = document.getElementById('project');
  const trackerSelect = document.getElementById('tracker');
  const prioritySelect = document.getElementById('priority');
  const assigneeSelect = document.getElementById('assignee');

  // Form Data Tab - Populate editable fields
  // Clone project options
  const reviewProjectSelect = document.getElementById('reviewProjectSelect');
  reviewProjectSelect.innerHTML = '';
  Array.from(projectSelect.options).forEach(option => {
    const newOption = option.cloneNode(true);
    reviewProjectSelect.appendChild(newOption);
  });
  reviewProjectSelect.value = projectSelect.value;

  // Clone tracker options
  const reviewTrackerSelect = document.getElementById('reviewTrackerSelect');
  reviewTrackerSelect.innerHTML = '';
  Array.from(trackerSelect.options).forEach(option => {
    const newOption = option.cloneNode(true);
    reviewTrackerSelect.appendChild(newOption);
  });
  reviewTrackerSelect.value = trackerSelect.value;

  // Set subject/title
  document.getElementById('reviewSubjectInput').value = document.getElementById('subject').value || '';

  // Clone priority options
  const reviewPrioritySelect = document.getElementById('reviewPrioritySelect');
  reviewPrioritySelect.innerHTML = '';
  Array.from(prioritySelect.options).forEach(option => {
    const newOption = option.cloneNode(true);
    reviewPrioritySelect.appendChild(newOption);
  });
  reviewPrioritySelect.value = prioritySelect.value;

  // Clone assignee options
  const reviewAssigneeSelect = document.getElementById('reviewAssigneeSelect');
  reviewAssigneeSelect.innerHTML = '';
  Array.from(assigneeSelect.options).forEach(option => {
    const newOption = option.cloneNode(true);
    reviewAssigneeSelect.appendChild(newOption);
  });
  reviewAssigneeSelect.value = assigneeSelect.value;

  // Set description
  document.getElementById('reviewDescriptionText').value = buildDescription();

  // Screenshot Tab
  if (annotator) {
    document.getElementById('reviewScreenshot').src = annotator.getAnnotatedImage();
  }

  // Page Info Tab
  document.getElementById('reviewPageInfo').textContent = JSON.stringify(pageInfo, null, 2);

  // Network Tab
  const networkCount = networkRequests.length;
  document.getElementById('networkCount').textContent = networkCount;
  document.getElementById('networkCountText').textContent = networkCount;

  const networkContainer = document.getElementById('reviewNetwork');
  networkContainer.innerHTML = '';

  if (networkCount === 0) {
    networkContainer.innerHTML = '<p style="color: #666; font-size: 12px;">No network requests captured</p>';
  } else {
    networkRequests.slice(0, 50).forEach(req => {
      const item = document.createElement('div');
      item.className = 'data-item';

      const statusClass = req.failed ? 'error' : (req.statusCode >= 200 && req.statusCode < 300) ? 'success' : '';

      item.innerHTML = `
        <div class="data-item-header">
          <div>
            <span class="data-item-method">${req.method || 'GET'}</span>
            <span class="data-item-url">${truncateUrl(req.url)}</span>
          </div>
          <span class="data-item-status ${statusClass}">
            ${req.failed ? 'Failed' : (req.statusCode || 'Pending')}
          </span>
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
    consoleLogs.slice(0, 50).forEach(log => {
      const item = document.createElement('div');
      item.className = `console-item ${log.type}`;

      item.innerHTML = `
        <div class="console-timestamp">${log.timestamp || ''}</div>
        <div class="console-message">${log.message || ''}</div>
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
