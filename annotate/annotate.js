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
let accumulatedFiles = []; // Store accumulated files for additional documents
let videoDataUrl = null; // Store video recording if available
let selectedTabIds = []; // Track selected tabs for multi-tab capture
let allTabs = []; // Store all tabs
let recordingTimeframe = null; // Store recording timeframe {tabId, startTime, endTime, duration}

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

    // Load screenshot data and video recording from session storage
    const result = await chrome.storage.session.get(['screenshots', 'screenshotData', 'tabId', 'currentScreenshotId', 'videoRecording', 'hasVideoRecording', 'recordingTimeframe']);

    // Check if we have the new multi-screenshot format or old single screenshot
    if (result.screenshots && result.screenshots.length > 0) {
      // Load existing screenshots array
      screenshots = result.screenshots;
      // Ensure all screenshots have a name field
      screenshots.forEach((screenshot, index) => {
        if (!screenshot.name) {
          screenshot.name = `Screenshot ${index + 1}`;
        }
      });
      currentScreenshotId = result.currentScreenshotId || screenshots[0].id;
      currentTab = { id: result.tabId || screenshots[0].tabId };
      console.log('[Annotate] Loaded', screenshots.length, 'media item(s) from storage');
    } else if (result.screenshotData) {
      // Convert old single screenshot format to new array format
      const newScreenshot = {
        id: generateId(),
        data: result.screenshotData,
        annotations: null,
        timestamp: Date.now(),
        tabId: result.tabId,
        name: 'Screenshot 1'
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
    } else if (!result.hasVideoRecording) {
      // No screenshots and no video - error
      showError('No media found. Please capture a screenshot or record a video first.');
      return;
    } else {
      // No screenshots, but we have a video - that's okay, we'll add it below
      screenshots = [];
      currentTab = { id: result.tabId };
      console.log('[Annotate] No screenshots found, but video recording is available');
    }

    console.log('[Annotate] Media data loaded successfully');

    // Load video recording if available
    if (result.hasVideoRecording && result.videoRecording) {
      videoDataUrl = result.videoRecording;
      console.log('[Annotate] Video recording loaded successfully');

      // Load recording timeframe for this video
      let videoTimeframe = null;
      if (result.recordingTimeframe) {
        videoTimeframe = result.recordingTimeframe;
        console.log('[Annotate] Recording timeframe loaded:', {
          tabId: videoTimeframe.tabId,
          start: new Date(videoTimeframe.startTime).toISOString(),
          end: new Date(videoTimeframe.endTime).toISOString(),
          duration: `${(videoTimeframe.duration / 1000).toFixed(2)}s`
        });
      }

      // Clear from session storage after loading
      await chrome.storage.session.remove(['videoRecording', 'hasVideoRecording', 'recordingTimeframe']);

      // Count existing videos to number this one
      const existingVideos = screenshots.filter(s => s.type === 'video');
      const videoNumber = existingVideos.length + 1;

      // Add video to media items WITH its recording timeframe
      const videoItem = {
        id: 'video-' + Date.now().toString(36),
        type: 'video',
        data: videoDataUrl,
        timestamp: Date.now(),
        name: `Video Recording ${videoNumber}`,
        recordingTimeframe: videoTimeframe // Attach timeframe to this specific video
      };
      screenshots.push(videoItem);
      currentScreenshotId = videoItem.id;

      console.log(`[Annotate] Added video ${videoNumber} with timeframe attached`);

      // Save updated media list
      await chrome.storage.session.set({
        screenshots: screenshots,
        currentScreenshotId: currentScreenshotId
      });
    }

    // Setup event listeners
    setupEventListeners();

    // Initialize annotation with current media item (screenshot or video)
    initializeAnnotation();

    // Update media list UI
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
  // Header actions
  document.getElementById('helpBtn').addEventListener('click', openHelp);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeTab').addEventListener('click', closeTabWithConfirmation);

  // Screenshot and video management
  document.getElementById('captureAnotherBtn').addEventListener('click', captureAnotherScreenshot);
  document.getElementById('recordVideoBtn').addEventListener('click', recordVideo);

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

  document.getElementById('lineWidth').addEventListener('change', (e) => {
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

  // Zoom controls
  document.getElementById('zoomInBtn').addEventListener('click', () => {
    if (annotator) {
      const newZoom = annotator.zoomIn();
      updateZoomDisplay(newZoom);
    }
  });

  document.getElementById('zoomOutBtn').addEventListener('click', () => {
    if (annotator) {
      const newZoom = annotator.zoomOut();
      updateZoomDisplay(newZoom);
    }
  });

  document.getElementById('zoomResetBtn').addEventListener('click', () => {
    if (annotator) {
      const newZoom = annotator.zoomReset();
      updateZoomDisplay(newZoom);
    }
  });

  // Crop controls
  document.getElementById('applyCrop').addEventListener('click', async () => {
    if (annotator) {
      const success = await annotator.applyCrop();
      if (success) {
        // Update the current screenshot data with cropped image
        const currentScreenshot = screenshots.find(s => s.id === currentScreenshotId);
        if (currentScreenshot) {
          currentScreenshot.data = annotator.imageDataUrl;
          await chrome.storage.session.set({ screenshots: screenshots });
        }
      }
    }
  });

  document.getElementById('cancelCrop').addEventListener('click', () => {
    if (annotator) {
      annotator.cancelCrop();
    }
  });

  // Keyboard shortcuts for zoom
  document.addEventListener('keydown', (e) => {
    if (!annotator) return;

    // Ctrl/Cmd + Plus/Equals for zoom in
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      const newZoom = annotator.zoomIn();
      updateZoomDisplay(newZoom);
    }
    // Ctrl/Cmd + Minus for zoom out
    else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
      e.preventDefault();
      const newZoom = annotator.zoomOut();
      updateZoomDisplay(newZoom);
    }
    // Ctrl/Cmd + 0 for reset zoom
    else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      const newZoom = annotator.zoomReset();
      updateZoomDisplay(newZoom);
    }
  });

  // Navigation
  document.getElementById('continueToReport').addEventListener('click', continueToReport);
  document.getElementById('backToAnnotate').addEventListener('click', () => showSection('annotateSection'));

  // Form
  document.getElementById('project').addEventListener('change', onProjectChange);
  document.getElementById('bugReportForm').addEventListener('submit', submitBugReport);

  // Additional Documents
  document.getElementById('additionalDocuments').addEventListener('change', updateSelectedFilesList);

  // Multi-tab capture
  document.getElementById('captureFromOtherTabs').addEventListener('change', toggleTabSelector);

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
async function initializeAnnotation() {
  console.log('[Annotate] Initializing annotation...');

  const currentItem = screenshots.find(s => s.id === currentScreenshotId);
  if (!currentItem) {
    console.error('[Annotate] Current media item not found');
    return;
  }

  // Check if current item is a video
  if (currentItem.type === 'video') {
    console.log('[Annotate] Current item is a video, showing video player');
    showVideoPlayer(currentItem.data);
  } else {
    // It's a screenshot, show annotation canvas
    console.log('[Annotate] Current item is a screenshot, showing annotation canvas');
    showAnnotationCanvas(currentItem);
  }

  // Show annotation section
  showSection('annotateSection');

  console.log('[Annotate] Annotation initialized successfully');
}

// Show video player
function showVideoPlayer(videoData) {
  // Hide canvas and annotation toolbar
  document.getElementById('annotationCanvas').style.display = 'none';
  document.querySelector('.annotation-toolbar-bottom').style.display = 'none';

  // Get or create video player container
  let videoContainer = document.getElementById('videoPlayerContainer');
  if (!videoContainer) {
    videoContainer = document.createElement('div');
    videoContainer.id = 'videoPlayerContainer';
    videoContainer.className = 'video-player-container';
    document.querySelector('.canvas-container').appendChild(videoContainer);
  }

  // Show video player
  videoContainer.style.display = 'block';
  videoContainer.innerHTML = `
    <video controls style="width: 100%; height: 100%; object-fit: contain;">
      <source src="${videoData}" type="video/webm">
      Your browser does not support the video tag.
    </video>
  `;
}

// Show annotation canvas
async function showAnnotationCanvas(screenshot) {
  // Hide video player
  const videoContainer = document.getElementById('videoPlayerContainer');
  if (videoContainer) {
    videoContainer.style.display = 'none';
  }

  // Show canvas and annotation toolbar
  document.getElementById('annotationCanvas').style.display = 'block';
  document.querySelector('.annotation-toolbar-bottom').style.display = 'flex';

  screenshotDataUrl = screenshot.data;

  const canvas = document.getElementById('annotationCanvas');
  annotator = new Annotator(canvas, screenshotDataUrl);

  // Wait for annotator to be initialized
  await annotator.initPromise;
  console.log('[Annotate] Annotator initialized');

  // Restore annotations if they exist
  if (screenshot.annotations) {
    console.log('[Annotate] Restoring annotations for screenshot:', currentScreenshotId);
    await annotator.restoreState(screenshot.annotations);
  }

  // Update zoom display
  updateZoomDisplay(annotator.getZoomLevel());
}

// Initialize annotation silently (without showing the section)
// Used when we want to skip annotation but still need annotator for rendering
async function initializeAnnotationSilent() {
  console.log('[Annotate] Initializing annotation canvas silently...');

  const currentScreenshot = screenshots.find(s => s.id === currentScreenshotId);
  if (!currentScreenshot) {
    console.error('[Annotate] Current screenshot not found');
    return;
  }

  screenshotDataUrl = currentScreenshot.data;

  const canvas = document.getElementById('annotationCanvas');
  annotator = new Annotator(canvas, screenshotDataUrl);

  // Wait for annotator to be initialized
  await annotator.initPromise;
  console.log('[Annotate] Annotator initialized silently');

  // No need to restore annotations or show section
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

  // Update canvas cursor based on tool
  const canvas = document.getElementById('annotationCanvas');
  canvas.classList.remove('move-cursor', 'grab-cursor', 'grabbing-cursor', 'text-cursor', 'pan-cursor', 'crop-cursor');

  // Clear any inline cursor styles that might override CSS
  canvas.style.cursor = '';

  if (tool === 'move') {
    canvas.classList.add('grab-cursor');
  } else if (tool === 'text') {
    canvas.classList.add('text-cursor');
  } else if (tool === 'pan') {
    canvas.classList.add('pan-cursor');
  } else if (tool === 'crop') {
    canvas.classList.add('crop-cursor');
  }
  // All other tools (pen, rectangle, circle, arrow, blackout) will use the default crosshair cursor
}

// Update zoom display
function updateZoomDisplay(zoomLevel) {
  const display = document.getElementById('zoomLevel');
  if (display) {
    display.textContent = Math.round(zoomLevel * 100) + '%';
  }
}

// Show crop controls
window.showCropControls = function() {
  const cropControls = document.getElementById('cropControls');
  const cropDivider = document.getElementById('cropDivider');
  if (cropControls) {
    cropControls.style.display = 'flex';
  }
  if (cropDivider) {
    cropDivider.style.display = 'block';
  }
}

// Hide crop controls
window.hideCropControls = function() {
  const cropControls = document.getElementById('cropControls');
  const cropDivider = document.getElementById('cropDivider');
  if (cropControls) {
    cropControls.style.display = 'none';
  }
  if (cropDivider) {
    cropDivider.style.display = 'none';
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Record video
async function recordVideo() {
  try {
    console.log('[Annotate] Starting video recording...');

    // Save current annotations before recording
    await saveCurrentAnnotations();

    console.log('[Annotate] Starting display capture (browser will show picker)');

    // Start display capture - browser will show picker
    const response = await chrome.runtime.sendMessage({
      action: 'startDisplayCapture',
      tabId: currentTab?.id || null
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start recording');
    }

    console.log('[Annotate] Recording started successfully');

    // Show user feedback
    alert('Recording started! Use the browser\'s "Stop Sharing" button when done. The annotation page will reopen automatically.');

    // Close this annotation tab - it will reopen when recording stops
    window.close();

    // Note: The annotation page will reopen automatically when recording stops
    // because the background script opens it in handleRecordingComplete()

  } catch (error) {
    console.error('[Annotate] Error starting video recording:', error);
    alert('Error starting video recording: ' + error.message);
  }
}

// Capture another screenshot
async function captureAnotherScreenshot() {
  try {
    console.log('[Annotate] Capturing another screenshot...');

    // Save current annotations before capturing
    await saveCurrentAnnotations();

    console.log('[Annotate] Starting display screenshot capture (browser will show picker)');

    // Use display capture - browser will show picker
    const response = await chrome.runtime.sendMessage({
      action: 'captureDisplayScreenshot'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to capture screenshot');
    }

    const newScreenshotData = response.screenshotDataUrl;

    if (!newScreenshotData) {
      throw new Error('Failed to capture screenshot');
    }

    console.log('[Annotate] Screenshot captured successfully');

    // Create new screenshot object
    const newScreenshot = {
      id: generateId(),
      data: newScreenshotData,
      annotations: null,
      timestamp: Date.now(),
      tabId: currentTab?.id || null,
      name: `Screenshot ${screenshots.length + 1}`
    };

    // Add to screenshots array
    screenshots.push(newScreenshot);
    currentScreenshotId = newScreenshot.id;

    // Save to storage
    await chrome.storage.session.set({
      screenshots: screenshots,
      currentScreenshotId: currentScreenshotId,
      tabId: currentTab?.id || null
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

// Delete a screenshot or video
async function deleteScreenshot(screenshotId) {
  if (screenshots.length === 1) {
    alert('Cannot delete the last media item');
    return;
  }

  const item = screenshots.find(s => s.id === screenshotId);
  const itemType = item && item.type === 'video' ? 'video' : 'screenshot';

  if (!confirm(`Are you sure you want to delete this ${itemType}?`)) {
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

// Rename screenshot
async function renameScreenshot(screenshotId, newName) {
  const screenshot = screenshots.find(s => s.id === screenshotId);
  if (screenshot) {
    screenshot.name = newName || `Screenshot ${screenshots.indexOf(screenshot) + 1}`;

    // Save to storage
    await chrome.storage.session.set({
      screenshots: screenshots
    });

    console.log('[Annotate] Renamed screenshot to:', screenshot.name);
  }
}

// Update screenshots list UI
function updateScreenshotsList() {
  const listContainer = document.getElementById('screenshotsList');
  listContainer.innerHTML = '';

  screenshots.forEach((item, index) => {
    const itemElement = document.createElement('div');
    itemElement.className = 'screenshot-item' + (item.id === currentScreenshotId ? ' active' : '');

    const content = document.createElement('div');
    content.className = 'screenshot-item-content';

    // Create thumbnail based on type
    if (item.type === 'video') {
      // Video thumbnail - show video icon
      const videoThumbnail = document.createElement('div');
      videoThumbnail.className = 'screenshot-thumbnail video-thumbnail';
      videoThumbnail.innerHTML = '<span style="font-size: 48px;">🎥</span>';
      content.appendChild(videoThumbnail);
    } else {
      // Screenshot thumbnail
      const thumbnail = document.createElement('img');
      thumbnail.className = 'screenshot-thumbnail';
      thumbnail.src = item.data;
      thumbnail.alt = item.name || `Screenshot ${index + 1}`;
      content.appendChild(thumbnail);
    }

    const info = document.createElement('div');
    info.className = 'screenshot-info';

    // Editable name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'screenshot-name-input';
    nameInput.value = item.name || (item.type === 'video' ? `Video ${index + 1}` : `Screenshot ${index + 1}`);
    nameInput.onclick = (e) => {
      e.stopPropagation();
    };
    nameInput.onblur = (e) => {
      renameScreenshot(item.id, e.target.value);
    };
    nameInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
      e.stopPropagation();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'screenshot-delete';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteScreenshot(item.id);
    };

    info.appendChild(nameInput);
    if (screenshots.length > 1) {
      info.appendChild(deleteBtn);
    }

    content.appendChild(info);

    itemElement.appendChild(content);

    itemElement.onclick = () => switchScreenshot(item.id);

    listContainer.appendChild(itemElement);
  });
}

// Update screenshot previews in report section
async function updateScreenshotPreviews() {
  const previewContainer = document.getElementById('screenshotPreviewContainer');
  if (!previewContainer) return;

  previewContainer.innerHTML = '';

  console.log('[Annotate] Updating media previews, total:', screenshots.length);

  for (let i = 0; i < screenshots.length; i++) {
    const item = screenshots[i];

    // Create preview item container
    const previewItem = document.createElement('div');
    previewItem.className = 'screenshot-preview-item';

    // Add label with custom name
    const label = document.createElement('div');
    label.className = 'screenshot-preview-label';
    label.textContent = item.name || (item.type === 'video' ? `Video ${i + 1}` : `Screenshot ${i + 1}`);
    previewItem.appendChild(label);

    if (item.type === 'video') {
      // Create and add video element
      const video = document.createElement('video');
      video.src = item.data;
      video.controls = true;
      video.style.maxWidth = '100%';
      video.alt = `Video ${i + 1}`;
      previewItem.appendChild(video);
    } else {
      // Create temporary annotator to get annotated image
      const tempCanvas = document.createElement('canvas');
      const tempAnnotator = new Annotator(tempCanvas, item.data);

      // Wait for initialization
      await tempAnnotator.initPromise;

      // Restore annotations if they exist
      if (item.annotations && tempAnnotator.restoreState) {
        await tempAnnotator.restoreState(item.annotations);
      }

      // Create and add image
      const img = document.createElement('img');
      img.src = tempAnnotator.getAnnotatedImage();
      img.alt = `Screenshot ${i + 1}`;
      previewItem.appendChild(img);
    }

    previewContainer.appendChild(previewItem);
  }

  console.log('[Annotate] Media previews updated');
}

// Continue to report form
async function continueToReport() {
  console.log('[Annotate] Continuing to report section...');

  // Save current annotations before continuing
  await saveCurrentAnnotations();

  // Update preview with all screenshots
  await updateScreenshotPreviews();

  showSection('reportSection');

  // Collect technical data
  await collectTechnicalData();

  // Load Redmine data
  await loadRedmineData();
}

// Toggle tab selector visibility
async function toggleTabSelector() {
  const checkbox = document.getElementById('captureFromOtherTabs');
  const container = document.getElementById('tabSelectorContainer');

  if (checkbox.checked) {
    container.classList.remove('hidden');
    await loadAllTabs();
  } else {
    container.classList.add('hidden');
    selectedTabIds = [];
  }
}

// Load and display all tabs
async function loadAllTabs() {
  const statusEl = document.getElementById('tabSelectorStatus');
  const tabListEl = document.getElementById('tabList');

  try {
    statusEl.textContent = 'Loading tabs...';
    statusEl.className = 'status-message info';

    // Get all tabs
    allTabs = await chrome.tabs.query({});

    // Get network request counts for all tabs
    const networkCounts = await chrome.runtime.sendMessage({
      action: 'getAllNetworkRequestCounts'
    });
    const requestCounts = networkCounts?.data || {};

    // Clear the list
    tabListEl.innerHTML = '';

    // Add each tab as a checkbox item
    allTabs.forEach(tab => {
      const tabItem = document.createElement('div');
      tabItem.className = 'tab-item';
      if (tab.id === currentTab.id) {
        tabItem.classList.add('tab-item-current');
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `tab-${tab.id}`;
      checkbox.value = tab.id;
      // Auto-select current tab
      if (tab.id === currentTab.id) {
        checkbox.checked = true;
        selectedTabIds.push(tab.id);
      }
      checkbox.addEventListener('change', handleTabSelection);

      const label = document.createElement('label');
      label.htmlFor = `tab-${tab.id}`;
      label.style.cssText = 'cursor: pointer; display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;';

      const info = document.createElement('div');
      info.className = 'tab-item-info';

      const title = document.createElement('span');
      title.className = 'tab-item-title';
      title.textContent = tab.title || 'Untitled';

      const url = document.createElement('span');
      url.className = 'tab-item-url';
      url.textContent = tab.url || '';

      info.appendChild(title);
      info.appendChild(url);
      label.appendChild(info);

      // Add current tab badge
      if (tab.id === currentTab.id) {
        const badge = document.createElement('span');
        badge.className = 'tab-item-badge';
        badge.textContent = 'Current';
        label.appendChild(badge);
      }

      // Add network request count badge
      const requestCount = requestCounts[tab.id] || 0;
      const countBadge = document.createElement('span');
      countBadge.className = 'tab-item-badge';
      if (requestCount > 0) {
        countBadge.textContent = `${requestCount} requests`;
        countBadge.style.backgroundColor = '#4CAF50';
        countBadge.style.color = '#ffffff';
      } else {
        countBadge.textContent = 'No data';
        countBadge.style.backgroundColor = '#999';
        countBadge.style.color = '#ffffff';
        countBadge.title = 'This tab has no network requests captured. Try refreshing the tab.';
      }
      label.appendChild(countBadge);

      tabItem.appendChild(checkbox);
      tabItem.appendChild(label);

      tabListEl.appendChild(tabItem);
    });

    const tabsWithData = Object.keys(requestCounts).length;
    statusEl.textContent = `${allTabs.length} tabs available, ${tabsWithData} with network data. Selected: ${selectedTabIds.length}`;
    statusEl.className = 'status-message success';

  } catch (error) {
    console.error('[Annotate] Error loading tabs:', error);
    statusEl.textContent = `Error loading tabs: ${error.message}`;
    statusEl.className = 'status-message error';
  }
}

// Handle tab selection
function handleTabSelection(e) {
  const tabId = parseInt(e.target.value);
  const statusEl = document.getElementById('tabSelectorStatus');

  if (e.target.checked) {
    if (!selectedTabIds.includes(tabId)) {
      selectedTabIds.push(tabId);
    }
  } else {
    selectedTabIds = selectedTabIds.filter(id => id !== tabId);
  }

  statusEl.textContent = `Selected: ${selectedTabIds.length} tab(s)`;
  statusEl.className = 'status-message info';
}

// Collect technical data
async function collectTechnicalData() {
  try {
    // Check if multi-tab capture is enabled
    const captureFromOtherTabsCheckbox = document.getElementById('captureFromOtherTabs');
    const shouldCaptureMultipleTabs = captureFromOtherTabsCheckbox && captureFromOtherTabsCheckbox.checked;

    if (shouldCaptureMultipleTabs && selectedTabIds.length > 0) {
      // Collect from multiple tabs
      await collectTechnicalDataFromMultipleTabs();
    } else {
      // Collect from current tab only (original behavior)
      if (!currentTab || !currentTab.id) {
        console.warn('[Annotate] No tab ID available for data collection');
        return;
      }
      await collectTechnicalDataFromSingleTab(currentTab.id);
    }
  } catch (error) {
    console.error('[Annotate] Error collecting technical data:', error);
  }
}

// Collect technical data from a single tab
async function collectTechnicalDataFromSingleTab(tabId) {
  try {
    console.log('[Annotate] Collecting technical data from single tab...');

    // Ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/content.js']
      });
    } catch (e) {
      console.log('[Annotate] Content script injection skipped:', e.message);
    }

    // Collect page information
    try {
      const pageInfoResponse = await chrome.tabs.sendMessage(tabId, {
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
        const logsResponse = await chrome.tabs.sendMessage(tabId, {
          action: 'getConsoleLogs'
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
          tabId: tabId
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
        const storageResponse = await chrome.tabs.sendMessage(tabId, {
          action: 'collectStorageData'
        });

        if (storageResponse && storageResponse.success) {
          pageInfo.storage = storageResponse.data;
        }
      } catch (e) {
        console.warn('[Annotate] Could not collect storage data:', e.message);
      }
    }

    // Note: We collect ALL network requests and console logs here
    // Filtering by video recording timeframe happens later when building attachments
  } catch (error) {
    console.error(`[Annotate] Error collecting technical data from tab ${tabId}:`, error);
  }
}

// Collect technical data from multiple tabs
async function collectTechnicalDataFromMultipleTabs() {
  try {
    console.log('[Multi-Tab] Collecting data from', selectedTabIds.length, 'tabs');

    // Reset aggregate data structures
    networkRequests = [];
    consoleLogs = [];
    const pageInfoArray = [];

    // Process each selected tab
    for (const tabId of selectedTabIds) {
      try {
        // Get tab details
        const tab = allTabs.find(t => t.id === tabId);
        const tabTitle = tab ? tab.title : 'Unknown';
        const tabUrl = tab ? tab.url : 'Unknown';

        console.log(`[Multi-Tab] Processing tab ${tabId}: ${tabTitle}`);

        // Skip chrome:// and other internal URLs
        if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
          console.log(`[Multi-Tab] Skipping internal URL: ${tabUrl}`);
          continue;
        }

        // Inject content script into this tab
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content/content.js']
          });
          console.log(`[Multi-Tab] Content script injected into tab ${tabId}`);
        } catch (e) {
          console.log(`[Multi-Tab] Content script injection skipped for tab ${tabId}:`, e.message);
        }

        // Give content script a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Collect page information
        try {
          const pageInfoResponse = await chrome.tabs.sendMessage(tabId, {
            action: 'collectPageInfo'
          });

          if (pageInfoResponse && pageInfoResponse.success) {
            const tabPageInfo = pageInfoResponse.data;
            tabPageInfo._tabId = tabId;
            tabPageInfo._tabTitle = tabTitle;
            pageInfoArray.push(tabPageInfo);
          }
        } catch (e) {
          console.log(`[Multi-Tab] Could not collect page info from tab ${tabId}:`, e.message);
        }

        // Collect console logs from this tab
        if (settings.includeConsoleLogs) {
          try {
            const logsResponse = await chrome.tabs.sendMessage(tabId, {
              action: 'getConsoleLogs'
            });

            if (logsResponse && logsResponse.success && logsResponse.data.length > 0) {
              // Add tab information to each log entry
              const tabLogs = logsResponse.data.map(log => ({
                ...log,
                _tabId: tabId,
                _tabTitle: tabTitle,
                _tabUrl: tabUrl
              }));
              consoleLogs.push(...tabLogs);
              console.log(`[Multi-Tab] ✓ Collected ${tabLogs.length} console logs from tab ${tabId}: ${tabTitle}`);
            }
          } catch (e) {
            console.log(`[Multi-Tab] Could not collect console logs from tab ${tabId}:`, e.message);
          }
        }

        // Collect network requests from this tab
        if (settings.includeNetworkRequests) {
          try {
            const networkResponse = await chrome.runtime.sendMessage({
              action: 'getNetworkRequests',
              tabId: tabId
            });

            if (networkResponse && networkResponse.success) {
              if (networkResponse.data.length > 0) {
                // Add tab information to each network request
                const tabRequests = networkResponse.data.map(req => ({
                  ...req,
                  _tabId: tabId,
                  _tabTitle: tabTitle,
                  _tabUrl: tabUrl
                }));
                networkRequests.push(...tabRequests);
                console.log(`[Multi-Tab] ✓ Collected ${tabRequests.length} network requests from tab ${tabId}: ${tabTitle}`);
              } else {
                console.warn(`[Multi-Tab] ⚠ No network requests found for tab ${tabId}: ${tabTitle}`);
                console.warn(`[Multi-Tab]   This tab may be idle or hasn't made requests since extension started.`);
                console.warn(`[Multi-Tab]   Tip: Refresh the tab to capture new network activity.`);
              }
            }
          } catch (e) {
            console.error(`[Multi-Tab] ✗ Could not collect network requests from tab ${tabId}:`, e.message);
          }
        }

      } catch (error) {
        console.error(`[Multi-Tab] Error processing tab ${tabId}:`, error);
      }
    }

    // Store aggregated page info (use current tab's info as primary, but include all)
    pageInfo = pageInfoArray.find(p => p._tabId === currentTab.id) || pageInfoArray[0] || {};
    pageInfo._allTabs = pageInfoArray;

    console.log(`[Multi-Tab] Collection complete. Network: ${networkRequests.length}, Console: ${consoleLogs.length}, Pages: ${pageInfoArray.length}`);

  } catch (error) {
    console.error('[Multi-Tab] Error collecting data from multiple tabs:', error);
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

    // Add all media items (screenshots and videos)
    console.log('[Annotate] Adding', screenshots.length, 'media item(s) to attachments...');
    for (let i = 0; i < screenshots.length; i++) {
      const item = screenshots[i];

      if (item.type === 'video') {
        // Add video
        const sanitizedName = (item.name || `Video ${i + 1}`)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();

        attachments.push({
          data: item.data,
          filename: `${sanitizedName}-${Date.now()}.webm`,
          type: 'video/webm'
        });

        console.log('[Annotate] Added video', item.name || (i + 1), 'to attachments');
      } else {
        // Add screenshot with annotations
        // Create a temporary annotator to get the annotated image
        const tempCanvas = document.createElement('canvas');
        const tempAnnotator = new Annotator(tempCanvas, item.data);

        // Wait for initialization
        await tempAnnotator.initPromise;

        // Restore annotations if they exist
        if (item.annotations && tempAnnotator.restoreState) {
          await tempAnnotator.restoreState(item.annotations);
        }

        const annotatedImage = tempAnnotator.getAnnotatedImage();

        // Use custom name for filename (sanitize for filesystem)
        const sanitizedName = (item.name || `Screenshot ${i + 1}`)
          .replace(/[^a-z0-9]/gi, '-')
          .toLowerCase();

        attachments.push({
          data: annotatedImage,
          filename: `${sanitizedName}-${Date.now()}.png`,
          type: 'image/png'
        });

        console.log('[Annotate] Added screenshot', item.name || (i + 1), 'to attachments');
      }
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

    // Add HAR files - separate file per video recording if videos have timeframes
    if (settings.includeNetworkRequests && networkRequests.length > 0) {
      // Check if we have videos with recording timeframes
      const videosWithTimeframes = screenshots.filter(s => s.type === 'video' && s.recordingTimeframe);

      if (videosWithTimeframes.length > 0) {
        console.log(`[Annotate] Creating separate HAR files for ${videosWithTimeframes.length} video recording(s)`);

        // Create separate HAR file for each video recording
        for (const video of videosWithTimeframes) {
          const timeframe = video.recordingTimeframe;

          // Filter network requests to this video's timeframe
          const filteredRequests = networkRequests.filter(req => {
            return req.timestamp >= timeframe.startTime &&
                   req.timestamp <= timeframe.endTime;
          });

          if (filteredRequests.length > 0) {
            const videoName = video.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const harData = buildHARFile(filteredRequests);
            const sanitizedHar = sanitizeText(harData);
            const harBlob = new Blob([sanitizedHar], { type: 'application/json' });
            const harReader = new FileReader();

            await new Promise((resolve) => {
              harReader.onloadend = () => {
                attachments.push({
                  data: harReader.result,
                  filename: `network-requests-${videoName}-${Date.now()}.har`,
                  type: 'application/json'
                });
                console.log(`[Annotate] Added HAR file for ${video.name}: ${filteredRequests.length} requests`);
                resolve();
              };
              harReader.readAsDataURL(harBlob);
            });
          } else {
            console.log(`[Annotate] No network requests found in timeframe for ${video.name}`);
          }
        }
      } else {
        // No video timeframes - use original logic for multi-tab or single-tab capture
        const isMultiTabCapture = networkRequests.some(req => req._tabId);

        if (isMultiTabCapture) {
        // Group requests by tab
        const requestsByTab = {};
        networkRequests.forEach(req => {
          const tabId = req._tabId || 'unknown';
          if (!requestsByTab[tabId]) {
            requestsByTab[tabId] = [];
          }
          requestsByTab[tabId].push(req);
        });

        // Create separate HAR file for each tab
        for (const [tabId, requests] of Object.entries(requestsByTab)) {
          const tabTitle = requests[0]._tabTitle || 'Unknown Tab';
          const sanitizedTabName = tabTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);

          const harData = buildHARFile(requests);
          const sanitizedHar = sanitizeText(harData);
          const harBlob = new Blob([sanitizedHar], { type: 'application/json' });
          const harReader = new FileReader();

          await new Promise((resolve) => {
            harReader.onloadend = () => {
              attachments.push({
                data: harReader.result,
                filename: `network-requests-${sanitizedTabName}-${Date.now()}.har`,
                type: 'application/json'
              });
              console.log(`[Annotate] Added HAR file for tab: ${tabTitle} (${requests.length} requests)`);
              resolve();
            };
            harReader.readAsDataURL(harBlob);
          });
        }
      } else {
        // Single HAR file for single tab capture
        const harData = buildHARFile(networkRequests);
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
      }
    }

    // Add console logs files - separate file per video recording if videos have timeframes
    if (settings.includeConsoleLogs && consoleLogs.length > 0) {
      // Check if we have videos with recording timeframes
      const videosWithTimeframes = screenshots.filter(s => s.type === 'video' && s.recordingTimeframe);

      if (videosWithTimeframes.length > 0) {
        console.log(`[Annotate] Creating separate console log files for ${videosWithTimeframes.length} video recording(s)`);

        // Create separate console log file for each video recording
        for (const video of videosWithTimeframes) {
          const timeframe = video.recordingTimeframe;

          // Filter console logs to this video's timeframe
          const filteredLogs = consoleLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= timeframe.startTime &&
                   logTime <= timeframe.endTime;
          });

          if (filteredLogs.length > 0) {
            const videoName = video.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const consoleLogsData = buildConsoleLogsFile(filteredLogs);
            const sanitizedLogs = sanitizeText(consoleLogsData);
            const logsBlob = new Blob([sanitizedLogs], { type: 'text/plain' });
            const logsReader = new FileReader();

            await new Promise((resolve) => {
              logsReader.onloadend = () => {
                attachments.push({
                  data: logsReader.result,
                  filename: `console-logs-${videoName}-${Date.now()}.txt`,
                  type: 'text/plain'
                });
                console.log(`[Annotate] Added console logs file for ${video.name}: ${filteredLogs.length} logs`);
                resolve();
              };
              logsReader.readAsDataURL(logsBlob);
            });
          } else {
            console.log(`[Annotate] No console logs found in timeframe for ${video.name}`);
          }
        }
      } else {
        // No video timeframes - use original logic for multi-tab or single-tab capture
        const isMultiTabCapture = consoleLogs.some(log => log._tabId);

        if (isMultiTabCapture) {
        // Group logs by tab
        const logsByTab = {};
        consoleLogs.forEach(log => {
          const tabId = log._tabId || 'unknown';
          if (!logsByTab[tabId]) {
            logsByTab[tabId] = [];
          }
          logsByTab[tabId].push(log);
        });

        // Create separate console logs file for each tab
        for (const [tabId, logs] of Object.entries(logsByTab)) {
          const tabTitle = logs[0]._tabTitle || 'Unknown Tab';
          const sanitizedTabName = tabTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);

          const consoleLogsData = buildConsoleLogsFile(logs);
          const sanitizedLogs = sanitizeText(consoleLogsData);
          const logsBlob = new Blob([sanitizedLogs], { type: 'text/plain' });
          const logsReader = new FileReader();

          await new Promise((resolve) => {
            logsReader.onloadend = () => {
              attachments.push({
                data: logsReader.result,
                filename: `console-logs-${sanitizedTabName}-${Date.now()}.txt`,
                type: 'text/plain'
              });
              console.log(`[Annotate] Added console logs file for tab: ${tabTitle} (${logs.length} logs)`);
              resolve();
            };
            logsReader.readAsDataURL(logsBlob);
          });
        }
      } else {
        // Single console logs file for single tab capture
        const consoleLogsData = buildConsoleLogsFile(consoleLogs);
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
      }
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

  if (videoDataUrl) {
    description += '- Video recording of the issue is attached.\n';
  }

  // Check if multi-tab capture was used
  const isMultiTabCapture = networkRequests.some(req => req._tabId) || consoleLogs.some(log => log._tabId);
  if (isMultiTabCapture) {
    const uniqueTabIds = new Set([
      ...networkRequests.filter(req => req._tabId).map(req => req._tabId),
      ...consoleLogs.filter(log => log._tabId).map(log => log._tabId)
    ]);
    description += `\n**Note:** Data captured from ${uniqueTabIds.size} tab(s).\n`;
  }

  if (settings.includeNetworkRequests && networkRequests.length > 0) {
    description += `- Network requests (${networkRequests.length} captured) are in the attached HAR file.\n`;
  }

  if (settings.includeConsoleLogs && consoleLogs.length > 0) {
    description += `- Console logs (${consoleLogs.length} entries) are in the attached console logs file.\n`;
  }

  // Mention media attachments
  if (screenshots && screenshots.length > 0) {
    const screenshotCount = screenshots.filter(s => s.type !== 'video').length;
    const videoCount = screenshots.filter(s => s.type === 'video').length;

    if (screenshotCount > 0 || videoCount > 0) {
      description += `\n### Media Attachments\n`;
      if (screenshotCount > 0) {
        description += `- ${screenshotCount} screenshot(s) attached\n`;
      }
      if (videoCount > 0) {
        description += `- ${videoCount} video recording(s) attached\n`;
      }
    }
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
function buildHARFile(requests = null) {
  // Use provided requests or fall back to global networkRequests
  const requestsToProcess = requests || networkRequests;

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
      entries: requestsToProcess.map(req => {
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

        // Add tab information if available (multi-tab capture)
        if (req._tabId) {
          entry._tabId = req._tabId;
        }
        if (req._tabTitle) {
          entry._tabTitle = req._tabTitle;
        }
        if (req._tabUrl) {
          entry._tabUrl = req._tabUrl;
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
function buildConsoleLogsFile(logs = null) {
  // Use provided logs or fall back to global consoleLogs
  const logsToProcess = logs || consoleLogs;

  if (!logsToProcess || logsToProcess.length === 0) {
    return 'No console logs captured.';
  }

  let logsContent = '='.repeat(80) + '\n';
  logsContent += 'CONSOLE LOGS\n';
  logsContent += `Captured: ${new Date().toISOString()}\n`;
  logsContent += `Total Logs: ${logsToProcess.length}\n`;
  logsContent += '='.repeat(80) + '\n\n';

  logsToProcess.forEach((log, index) => {
    logsContent += `[${index + 1}] ${log.timestamp || 'Unknown time'}\n`;
    logsContent += `Type: ${(log.type || 'log').toUpperCase()}\n`;

    // Add tab information if available (multi-tab capture)
    if (log._tabTitle) {
      logsContent += `Tab: ${log._tabTitle}\n`;
    }
    if (log._tabUrl) {
      logsContent += `Tab URL: ${log._tabUrl}\n`;
    }

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

    // Media Tab - Show all media items (screenshots and videos)
    const mediaTabContent = document.getElementById('mediaTab').querySelector('.review-section');
    mediaTabContent.innerHTML = '';

    if (screenshots && screenshots.length > 0) {
      const mediaInfo = document.createElement('p');
      mediaInfo.className = 'tab-info';
      const screenshotCount = screenshots.filter(s => s.type !== 'video').length;
      const videoCount = screenshots.filter(s => s.type === 'video').length;

      let infoText = [];
      if (screenshotCount > 0) infoText.push(`${screenshotCount} screenshot(s)`);
      if (videoCount > 0) infoText.push(`${videoCount} video(s)`);
      mediaInfo.textContent = `${infoText.join(' and ')} will be attached:`;
      mediaTabContent.appendChild(mediaInfo);

      for (let index = 0; index < screenshots.length; index++) {
        const item = screenshots[index];

        const label = document.createElement('p');
        label.style.cssText = 'font-weight: 600; margin-bottom: 8px; margin-top: 16px; color: #333;';
        label.textContent = item.name || (item.type === 'video' ? `Video ${index + 1}` : `Screenshot ${index + 1}`);
        mediaTabContent.appendChild(label);

        if (item.type === 'video') {
          // Show video
          const video = document.createElement('video');
          video.className = 'review-image';
          video.src = item.data;
          video.controls = true;
          video.style.marginBottom = '16px';
          mediaTabContent.appendChild(video);
        } else {
          // Show screenshot
          // Create temporary annotator to get annotated image
          const tempCanvas = document.createElement('canvas');
          const tempAnnotator = new Annotator(tempCanvas, item.data);

          // Wait for initialization
          await tempAnnotator.initPromise;

          if (item.annotations && tempAnnotator.restoreState) {
            await tempAnnotator.restoreState(item.annotations);
          }

          const img = document.createElement('img');
          img.className = 'review-image';
          img.src = tempAnnotator.getAnnotatedImage();
          img.style.marginBottom = '16px';
          mediaTabContent.appendChild(img);
        }
      }
    } else if (annotator) {
      // Fallback to single screenshot
      const img = document.createElement('img');
      img.id = 'reviewScreenshot';
      img.className = 'review-image';
      img.src = annotator.getAnnotatedImage();
      mediaTabContent.appendChild(img);
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
          <pre class="code-block" style="margin-top: 8px;">${JSON.stringify(pageInfo, (key, value) => {
            // Skip _allTabs to avoid circular reference
            if (key === '_allTabs') return undefined;
            return value;
          }, 2)}</pre>
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

    // Show recording timeframe indicator if we have videos with timeframes and network requests
    const videosWithTimeframes = screenshots.filter(s => s.type === 'video' && s.recordingTimeframe);
    if (videosWithTimeframes.length > 0 && networkCount > 0) {
      // Filter videos to only those with network requests in their timeframe
      const videosWithRequests = videosWithTimeframes.filter(video => {
        const timeframe = video.recordingTimeframe;
        return networkRequests.some(req => {
          return req.timestamp >= timeframe.startTime &&
                 req.timestamp <= timeframe.endTime;
        });
      });

      if (videosWithRequests.length > 0) {
        const timeframeInfo = document.createElement('div');
        timeframeInfo.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;';

        let infoHtml = '<p style="color: #e65100; font-weight: 600; margin: 0 0 8px 0;">⏱️ Video Recording Timeframes</p>';
        infoHtml += '<p style="color: #e65100; font-size: 12px; margin: 0;">Separate HAR files will be created for each video recording:</p>';
        infoHtml += '<ul style="margin: 8px 0 0 20px; padding: 0;">';

        videosWithRequests.forEach(video => {
          const timeframe = video.recordingTimeframe;
          const duration = (timeframe.duration / 1000).toFixed(2);
          const videoName = video.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

          // Count requests in this video's timeframe
          const requestsInTimeframe = networkRequests.filter(req => {
            return req.timestamp >= timeframe.startTime &&
                   req.timestamp <= timeframe.endTime;
          }).length;

          infoHtml += `
            <li style="color: #e65100; font-size: 11px; margin: 4px 0;">
              <strong>network-requests-${videoName}-*.har</strong> (${requestsInTimeframe} requests from ${duration}s recording)
            </li>
          `;
        });

        infoHtml += '</ul>';
        timeframeInfo.innerHTML = infoHtml;
        networkContainer.appendChild(timeframeInfo);
      }
    }

    if (networkCount === 0) {
      const noDataMsg = document.createElement('p');
      noDataMsg.style.cssText = 'color: #666; font-size: 12px;';
      noDataMsg.textContent = videosWithTimeframes.length > 0
        ? 'No network requests captured during any recording timeframe'
        : 'No network requests captured';
      networkContainer.appendChild(noDataMsg);
    } else {
      // Check if this is multi-tab capture
      const isMultiTabCapture = networkRequests.some(req => req._tabId);

      if (isMultiTabCapture) {
        // Group requests by tab to show which HAR files will be created
        const requestsByTab = {};
        networkRequests.forEach(req => {
          const tabId = req._tabId || 'unknown';
          if (!requestsByTab[tabId]) {
            requestsByTab[tabId] = [];
          }
          requestsByTab[tabId].push(req);
        });

        // Show attachment info for each tab
        const attachmentInfo = document.createElement('div');
        attachmentInfo.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 4px;';

        let filesHtml = '<p style="color: #2e7d32; font-weight: 600; margin-bottom: 8px;">📎 Separate HAR files will be created:</p><ul style="margin: 0; padding-left: 20px;">';

        for (const [tabId, requests] of Object.entries(requestsByTab)) {
          const tabTitle = requests[0]._tabTitle || 'Unknown Tab';
          const sanitizedTabName = tabTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
          const filename = `network-requests-${sanitizedTabName}-*.har`;
          filesHtml += `<li style="color: #2e7d32; margin: 4px 0;"><strong>${filename}</strong> (${requests.length} requests from "${tabTitle}")</li>`;
        }

        filesHtml += '</ul>';
        attachmentInfo.innerHTML = filesHtml;
        networkContainer.appendChild(attachmentInfo);
      }

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
              ${req._tabTitle ? `<span class="data-item-badge" style="background-color: #e3f2fd; color: #1976d2; margin-left: 4px;">📑 ${truncateUrl(req._tabTitle, 30)}</span>` : ''}
            </div>
            <span class="data-item-status ${statusClass}">
              ${statusIcon} ${req.failed ? 'Failed' : (req.statusCode || 'Pending')}
            </span>
          </div>
          <div class="data-item-url" title="${req.url}">${truncateUrl(req.url, 100)}</div>
          <div class="data-item-details">
            ${req._tabUrl ? `<span>🌐 Tab: ${truncateUrl(req._tabUrl, 50)}</span>` : ''}
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

    // Show recording timeframe indicator if we have videos with timeframes and console logs
    if (videosWithTimeframes.length > 0 && consoleCount > 0) {
      // Filter videos to only those with console logs in their timeframe
      const videosWithLogs = videosWithTimeframes.filter(video => {
        const timeframe = video.recordingTimeframe;
        return consoleLogs.some(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime >= timeframe.startTime && logTime <= timeframe.endTime;
        });
      });

      if (videosWithLogs.length > 0) {
        const timeframeInfo = document.createElement('div');
        timeframeInfo.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;';

        let infoHtml = '<p style="color: #e65100; font-weight: 600; margin: 0 0 8px 0;">⏱️ Video Recording Timeframes</p>';
        infoHtml += '<p style="color: #e65100; font-size: 12px; margin: 0;">Separate console log files will be created for each video recording:</p>';
        infoHtml += '<ul style="margin: 8px 0 0 20px; padding: 0;">';

        videosWithLogs.forEach(video => {
          const timeframe = video.recordingTimeframe;
          const duration = (timeframe.duration / 1000).toFixed(2);
          const videoName = video.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();

          // Count logs in this video's timeframe
          const logsInTimeframe = consoleLogs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return logTime >= timeframe.startTime && logTime <= timeframe.endTime;
          }).length;

          infoHtml += `
            <li style="color: #e65100; font-size: 11px; margin: 4px 0;">
              <strong>console-logs-${videoName}-*.txt</strong> (${logsInTimeframe} logs from ${duration}s recording)
            </li>
          `;
        });

        infoHtml += '</ul>';
        timeframeInfo.innerHTML = infoHtml;
        consoleContainer.appendChild(timeframeInfo);
      }
    }

    if (consoleCount === 0) {
      const noDataMsg = document.createElement('p');
      noDataMsg.style.cssText = 'color: #666; font-size: 12px;';
      noDataMsg.textContent = videosWithTimeframes.length > 0
        ? 'No console logs captured during any recording timeframe'
        : 'No console logs captured';
      consoleContainer.appendChild(noDataMsg);
    } else {
      // Check if this is multi-tab capture
      const isMultiTabCapture = consoleLogs.some(log => log._tabId);

      if (isMultiTabCapture) {
        // Group logs by tab to show which console log files will be created
        const logsByTab = {};
        consoleLogs.forEach(log => {
          const tabId = log._tabId || 'unknown';
          if (!logsByTab[tabId]) {
            logsByTab[tabId] = [];
          }
          logsByTab[tabId].push(log);
        });

        // Show attachment info for each tab
        const attachmentInfo = document.createElement('div');
        attachmentInfo.style.cssText = 'margin-bottom: 16px; padding: 12px; background: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px;';

        let filesHtml = '<p style="color: #1565c0; font-weight: 600; margin-bottom: 8px;">📎 Separate console log files will be created:</p><ul style="margin: 0; padding-left: 20px;">';

        for (const [tabId, logs] of Object.entries(logsByTab)) {
          const tabTitle = logs[0]._tabTitle || 'Unknown Tab';
          const sanitizedTabName = tabTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
          const filename = `console-logs-${sanitizedTabName}-*.txt`;
          filesHtml += `<li style="color: #1565c0; margin: 4px 0;"><strong>${filename}</strong> (${logs.length} logs from "${tabTitle}")</li>`;
        }

        filesHtml += '</ul>';
        attachmentInfo.innerHTML = filesHtml;
        consoleContainer.appendChild(attachmentInfo);
      }

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
          <div class="console-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
            <span class="data-item-badge">#${index + 1}</span>
            <span style="color: ${typeColor}; font-weight: bold;">${typeIcon} ${log.type.toUpperCase()}</span>
            <span class="console-timestamp" style="color: #999; font-size: 11px;">${timestamp}</span>
            ${log._tabTitle ? `<span class="data-item-badge" style="background-color: #e3f2fd; color: #1976d2;">📑 ${truncateUrl(log._tabTitle, 25)}</span>` : ''}
          </div>
          <div class="console-message" style="margin-left: 24px; word-break: break-word;">${escapeHtml(log.message || '')}</div>
          ${log._tabUrl ? `<div class="console-url" style="margin-left: 24px; font-size: 11px; color: #666; margin-top: 4px;">🌐 Tab: ${truncateUrl(log._tabUrl, 60)}</div>` : ''}
          ${log.url && !log._tabUrl ? `<div class="console-url" style="margin-left: 24px; font-size: 11px; color: #666; margin-top: 4px;">📍 ${log.url}</div>` : ''}
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

    // Additional Documents Tab
    const fileInput = document.getElementById('additionalDocuments');
    const documentsCount = fileInput && fileInput.files ? fileInput.files.length : 0;
    document.getElementById('documentsCount').textContent = documentsCount;
    document.getElementById('documentsCountText').textContent = documentsCount;

    const documentsContainer = document.getElementById('reviewDocuments');
    documentsContainer.innerHTML = '';

    if (documentsCount === 0) {
      documentsContainer.innerHTML = '<p style="color: #666; font-size: 12px;">No additional documents attached</p>';
    } else {
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        const item = document.createElement('div');
        item.className = 'document-item';

        const header = document.createElement('div');
        header.className = 'document-item-header';

        const icon = document.createElement('span');
        icon.className = 'document-icon';
        icon.textContent = getFileIcon(file.type, file.name);

        const name = document.createElement('span');
        name.className = 'document-name';
        name.textContent = file.name;

        header.appendChild(icon);
        header.appendChild(name);

        const details = document.createElement('div');
        details.className = 'document-details';

        const type = document.createElement('div');
        type.className = 'document-type';
        type.innerHTML = `<span>📋</span><span>${file.type || 'Unknown type'}</span>`;

        const size = document.createElement('div');
        size.className = 'document-size';
        size.innerHTML = `<span>💾</span><span>${formatFileSize(file.size)}</span>`;

        details.appendChild(type);
        details.appendChild(size);

        item.appendChild(header);
        item.appendChild(details);

        documentsContainer.appendChild(item);
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

// Update selected files list display
function updateSelectedFilesList() {
  const fileInput = document.getElementById('additionalDocuments');
  const filesList = document.getElementById('selectedFilesList');

  if (!fileInput || !filesList) return;

  // Accumulate new files with existing ones
  if (fileInput.files.length > 0) {
    const newFiles = Array.from(fileInput.files);

    // Check for duplicates and add only new files
    for (const newFile of newFiles) {
      const isDuplicate = accumulatedFiles.some(
        existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size
      );

      if (!isDuplicate) {
        accumulatedFiles.push(newFile);
      }
    }

    // Update the file input with all accumulated files
    const dt = new DataTransfer();
    for (const file of accumulatedFiles) {
      dt.items.add(file);
    }
    fileInput.files = dt.files;
  }

  // Render the file list
  filesList.innerHTML = '';

  if (accumulatedFiles.length === 0) return;

  for (let i = 0; i < accumulatedFiles.length; i++) {
    const file = accumulatedFiles[i];

    const item = document.createElement('div');
    item.className = 'selected-file-item';

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(file.type, file.name);

    const details = document.createElement('div');
    details.className = 'file-details';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;
    name.title = file.name;

    const size = document.createElement('div');
    size.className = 'file-size';
    size.textContent = formatFileSize(file.size);

    details.appendChild(name);
    details.appendChild(size);

    fileInfo.appendChild(icon);
    fileInfo.appendChild(details);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.type = 'button';
    removeBtn.onclick = () => removeFile(i);

    item.appendChild(fileInfo);
    item.appendChild(removeBtn);

    filesList.appendChild(item);
  }
}

// Remove file from the list
function removeFile(index) {
  const fileInput = document.getElementById('additionalDocuments');
  if (!fileInput) return;

  // Remove from accumulated files array
  accumulatedFiles.splice(index, 1);

  // Update file input with remaining files
  const dt = new DataTransfer();
  for (const file of accumulatedFiles) {
    dt.items.add(file);
  }

  fileInput.files = dt.files;

  // Re-render the list
  const filesList = document.getElementById('selectedFilesList');
  if (!filesList) return;

  filesList.innerHTML = '';

  if (accumulatedFiles.length === 0) return;

  for (let i = 0; i < accumulatedFiles.length; i++) {
    const file = accumulatedFiles[i];

    const item = document.createElement('div');
    item.className = 'selected-file-item';

    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';

    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = getFileIcon(file.type, file.name);

    const details = document.createElement('div');
    details.className = 'file-details';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;
    name.title = file.name;

    const size = document.createElement('div');
    size.className = 'file-size';
    size.textContent = formatFileSize(file.size);

    details.appendChild(name);
    details.appendChild(size);

    fileInfo.appendChild(icon);
    fileInfo.appendChild(details);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'file-remove-btn';
    removeBtn.textContent = 'Remove';
    removeBtn.type = 'button';
    removeBtn.onclick = () => removeFile(i);

    item.appendChild(fileInfo);
    item.appendChild(removeBtn);

    filesList.appendChild(item);
  }
}

// Get file icon based on file type
function getFileIcon(type, filename) {
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎥';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📄';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return '📦';
  if (type.includes('word') || filename.endsWith('.doc') || filename.endsWith('.docx')) return '📝';
  if (type.includes('excel') || filename.endsWith('.xls') || filename.endsWith('.xlsx')) return '📊';
  if (type.includes('powerpoint') || filename.endsWith('.ppt') || filename.endsWith('.pptx')) return '📽️';
  if (type.includes('text') || filename.endsWith('.txt')) return '📃';
  if (type.includes('json') || filename.endsWith('.json')) return '📋';
  if (type.includes('xml') || filename.endsWith('.xml')) return '📋';
  if (filename.endsWith('.log')) return '📜';
  return '📎';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Close review modal
function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

// Open settings
function openSettings() {
  // Always open settings in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('options/options.html')
  });
}

// Open help guide in new window
function openHelp() {
  const helpUrl = chrome.runtime.getURL('annotate/help.html');
  window.open(helpUrl, 'CapScreenHelp', 'width=1000,height=800,scrollbars=yes,resizable=yes');
}

// Close tab with confirmation
function closeTabWithConfirmation() {
  const confirmClose = confirm('Are you sure you want to close? Any unsaved changes will be lost.');
  if (confirmClose) {
    window.close();
  }
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
