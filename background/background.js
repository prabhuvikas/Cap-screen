// Background service worker for network monitoring and data collection

let networkRequests = {};
let consoleLogs = {};
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let recordingTabId = null;
let recordingStartTime = null;
let recordingEndTime = null;

// Storage quota management
const MAX_REQUESTS_PER_TAB = 100;
const MAX_REQUEST_AGE_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Clean every 1 minute instead of 5

// Load persisted network requests from storage on startup
async function loadNetworkRequestsFromStorage() {
  try {
    const result = await chrome.storage.session.get('networkRequests');
    if (result.networkRequests) {
      networkRequests = result.networkRequests;
      const tabCount = Object.keys(networkRequests).length;
      const totalRequests = Object.values(networkRequests).reduce((sum, tab) => sum + tab.requests.length, 0);
      console.log(`[Background] Loaded ${totalRequests} network requests from ${tabCount} tabs from storage`);
    }
  } catch (error) {
    console.error('[Background] Error loading network requests from storage:', error);
  }
}

// Save network requests to storage (debounced)
let saveTimeout = null;
async function saveNetworkRequestsToStorage() {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce: save after 1 second of inactivity
  saveTimeout = setTimeout(async () => {
    try {
      await chrome.storage.session.set({ networkRequests });
      const tabCount = Object.keys(networkRequests).length;
      const totalRequests = Object.values(networkRequests).reduce((sum, tab) => sum + tab.requests.length, 0);
      console.log(`[Background] Saved ${totalRequests} network requests from ${tabCount} tabs to storage`);
    } catch (error) {
      console.error('[Background] Error saving network requests to storage:', error);
      // On quota exceeded, try clearing oldest data from all tabs
      if (error.message && error.message.includes('quota')) {
        console.warn('[Background] Storage quota exceeded, attempting aggressive cleanup...');
        for (const tabId in networkRequests) {
          // Keep only last 10 requests per tab instead of 100
          if (networkRequests[tabId].requests.length > 10) {
            networkRequests[tabId].requests = networkRequests[tabId].requests.slice(-10);
          }
        }
        // Retry save with reduced data
        try {
          await chrome.storage.session.set({ networkRequests });
          console.log('[Background] Successfully saved after aggressive cleanup');
        } catch (retryError) {
          console.error('[Background] Failed to save even with aggressive cleanup:', retryError);
        }
      }
    }
  }, 1000);
}

// Initialize on service worker startup
loadNetworkRequestsFromStorage();

// Offscreen document management for recording
async function setupOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen/offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    console.log('[Background] Offscreen document already exists');
    return;
  }

  console.log('[Background] Creating offscreen document');
  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ['USER_MEDIA'],
    justification: 'Recording video from tab capture'
  });
  console.log('[Background] Offscreen document created');
}

async function closeOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen/offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length === 0) {
    console.log('[Background] No offscreen document to close');
    return;
  }

  console.log('[Background] Closing offscreen document');
  await chrome.offscreen.closeDocument();
  console.log('[Background] Offscreen document closed');
}


async function handleStartDisplayCapture() {
  try {
    console.log('[Background] Starting display capture (window/screen)');

    // Setup offscreen document
    await setupOffscreenDocument();

    // Send message to offscreen document to start display recording
    console.log('[Background] Sending startDisplayRecording message to offscreen document');
    const response = await chrome.runtime.sendMessage({
      action: 'startDisplayRecording'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start display recording in offscreen document');
    }

    console.log('[Background] Display recording started in offscreen document');
  } catch (error) {
    console.error('[Background] Error in handleStartDisplayCapture:', error);
    // Clean up offscreen document if there was an error
    try {
      await closeOffscreenDocument();
    } catch (e) {
      console.error('[Background] Error closing offscreen document:', e);
    }
    throw error;
  }
}

async function handleCaptureDisplayScreenshot() {
  try {
    console.log('[Background] Capturing display screenshot');

    // Setup offscreen document
    await setupOffscreenDocument();

    // Send message to offscreen document to capture screenshot
    console.log('[Background] Sending captureDisplayScreenshot message to offscreen document');
    const response = await chrome.runtime.sendMessage({
      action: 'captureDisplayScreenshot'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to capture screenshot in offscreen document');
    }

    const screenshotDataUrl = response.screenshotDataUrl;
    console.log('[Background] Got screenshot data URL, length:', screenshotDataUrl.length);

    // Close offscreen document
    await closeOffscreenDocument();

    return screenshotDataUrl;

  } catch (error) {
    console.error('[Background] Error in handleCaptureDisplayScreenshot:', error);
    // Clean up offscreen document if there was an error
    try {
      await closeOffscreenDocument();
    } catch (e) {
      console.error('[Background] Error closing offscreen document:', e);
    }
    throw error;
  }
}


async function handleRecordingComplete(videoDataUrl, largeVideo = false, videoSizeMB = 0) {
  try {
    if (largeVideo) {
      console.log('[Background] Processing completed recording (large video stored in IndexedDB, size:', videoSizeMB.toFixed(2), 'MB)');
    } else {
      console.log('[Background] Processing completed recording, video data length:', videoDataUrl.length);
    }

    // Restore recording state from storage if service worker was restarted
    if (!recordingStartTime || !recordingTabId) {
      console.log('[Background] Recording state lost, restoring from storage...');
      const state = await chrome.storage.session.get(['recordingStartTime', 'recordingTabId']);
      if (state.recordingStartTime) {
        recordingStartTime = state.recordingStartTime;
        recordingTabId = state.recordingTabId;
        console.log('[Background] Recording state restored:', {
          startTime: new Date(recordingStartTime).toISOString(),
          tabId: recordingTabId
        });
      } else {
        console.warn('[Background] No recording state found in storage, using current time');
        recordingStartTime = Date.now(); // Fallback to current time
      }
    }

    // Set recording end time
    recordingEndTime = Date.now();
    const duration = recordingEndTime - recordingStartTime;
    console.log(`[Background] Recording duration: ${(duration / 1000).toFixed(2)} seconds`);

    // Close offscreen document
    await closeOffscreenDocument();

    // Prepare session storage data
    const sessionData = {
      hasVideoRecording: true,
      tabId: recordingTabId,
      recordingTimeframe: {
        tabId: recordingTabId,
        startTime: recordingStartTime,
        endTime: recordingEndTime,
        duration: duration
      }
    };

    // For small videos, store in session storage; for large videos, flag to load from IndexedDB
    if (largeVideo) {
      sessionData.videoInIndexedDB = true;
      sessionData.videoSizeMB = videoSizeMB;
      console.log('[Background] Large video flagged for IndexedDB retrieval');
    } else {
      sessionData.videoRecording = videoDataUrl;
      console.log('[Background] Small video stored in session storage');
    }

    // Save to session storage
    await chrome.storage.session.set(sessionData);
    console.log('[Background] Recording metadata saved to session storage');
    console.log('[Background] Timeframe:', {
      start: new Date(recordingStartTime).toISOString(),
      end: new Date(recordingEndTime).toISOString(),
      tabId: recordingTabId
    });

    // Notify content script that recording stopped (so it can remove overlay if present)
    if (recordingTabId) {
      try {
        // First check if the tab still exists
        await chrome.tabs.get(recordingTabId);

        // Tab exists, try to send message
        try {
          await chrome.tabs.sendMessage(recordingTabId, {
            action: 'recordingStopped'
          });
          console.log('[Background] Notified content script of recording stop');
        } catch (messageError) {
          // Tab exists but content script might not be loaded or tab navigated
          if (messageError.message && messageError.message.includes('receiving end')) {
            console.log('[Background] Content script not available (tab may have navigated or extension not injected)');
          } else {
            console.warn('[Background] Could not send recordingStopped message:', messageError.message);
          }
        }
      } catch (tabError) {
        // Tab no longer exists - this is normal
        console.log('[Background] Recording tab no longer exists');
      }
    }

    // Open annotation page
    console.log('[Background] Opening annotation page');
    await chrome.tabs.create({
      url: chrome.runtime.getURL('annotate/annotate.html'),
      active: true
    });
    console.log('[Background] Annotation page opened');

    // Reset recording state in memory and storage
    recordingTabId = null;
    recordingStartTime = null;
    recordingEndTime = null;
    await chrome.storage.session.remove(['isRecording', 'recordingStartTime', 'recordingTabId']);
    console.log('[Background] Recording state cleared');
  } catch (error) {
    console.error('[Background] Error in handleRecordingComplete:', error);
    throw error;
  }
}

// Clean up old data periodically - more aggressive approach
setInterval(() => {
  const now = Date.now();
  let cleaned = false;
  let deletedTabs = 0;

  // Clean network requests - both old requests and enforce per-tab limits
  for (const tabId in networkRequests) {
    const requests = networkRequests[tabId].requests;
    const originalCount = requests.length;

    // 1. Remove old requests (older than MAX_REQUEST_AGE_MS)
    networkRequests[tabId].requests = requests.filter(req => {
      const age = now - req.timestamp;
      return age < MAX_REQUEST_AGE_MS;
    });

    // 2. Enforce max requests per tab - keep only the most recent ones
    if (networkRequests[tabId].requests.length > MAX_REQUESTS_PER_TAB) {
      networkRequests[tabId].requests = networkRequests[tabId].requests.slice(-MAX_REQUESTS_PER_TAB);
    }

    // 3. Remove tabs with no requests and old timestamp
    if (networkRequests[tabId].requests.length === 0 &&
        networkRequests[tabId].timestamp < now - 300000) { // 5 minutes idle
      delete networkRequests[tabId];
      deletedTabs++;
      cleaned = true;
    } else if (requests.length !== networkRequests[tabId].requests.length) {
      cleaned = true;
      const removed = originalCount - networkRequests[tabId].requests.length;
      console.log(`[Background] Cleaned ${removed} old requests from tab ${tabId}`);
    }
  }

  // Clean console logs more aggressively
  for (const tabId in consoleLogs) {
    if (consoleLogs[tabId].timestamp < now - 1800000) { // 30 minutes old
      delete consoleLogs[tabId];
      cleaned = true;
    }
  }

  if (cleaned) {
    console.log(`[Background] Cleanup: removed ${deletedTabs} idle tabs`);
    saveNetworkRequestsToStorage().catch(err => {
      // Don't spam console if cleanup causes storage errors
      console.warn('[Background] Cleanup save failed (quota may be exceeded):', err.message);
    });
  }
}, CLEANUP_INTERVAL_MS); // Clean every 1 minute for faster quota recovery

// Listen for network requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!networkRequests[details.tabId]) {
      networkRequests[details.tabId] = {
        requests: [],
        timestamp: Date.now()
      };
      console.log(`[Background] Started tracking network requests for tab ${details.tabId}`);
    }

    // Don't store full request body to save space - only store if it's small
    let requestBody = null;
    if (details.requestBody && details.requestBody.raw) {
      const bodySize = details.requestBody.raw.reduce((sum, part) => sum + (part.bytes ? part.bytes.byteLength : 0), 0);
      // Only keep request body if it's under 1KB to save storage space
      if (bodySize < 1024) {
        requestBody = details.requestBody;
      }
    }

    const request = {
      id: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timestamp: Date.now() // Use client timestamp for more accurate cleanup
    };

    // Only include small request bodies
    if (requestBody) {
      request.requestBody = requestBody;
    }

    networkRequests[details.tabId].requests.push(request);

    // Save to storage (debounced)
    saveNetworkRequestsToStorage();

    // Log periodically to avoid spam
    if (networkRequests[details.tabId].requests.length % 50 === 0) {
      console.log(`[Background] Tab ${details.tabId} now has ${networkRequests[details.tabId].requests.length} network requests`);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// Listen for response headers
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (!networkRequests[details.tabId]) return;

    const requests = networkRequests[details.tabId].requests;
    const request = requests.find(r => r.id === details.requestId);

    if (request) {
      request.statusCode = details.statusCode;
      request.responseHeaders = details.responseHeaders;
      request.fromCache = details.fromCache;
      request.ip = details.ip;

      // Save to storage (debounced)
      saveNetworkRequestsToStorage();
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Listen for failed requests
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (!networkRequests[details.tabId]) return;

    const requests = networkRequests[details.tabId].requests;
    const request = requests.find(r => r.id === details.requestId);

    if (request) {
      request.error = details.error;
      request.failed = true;

      // Save to storage (debounced)
      saveNetworkRequestsToStorage();
    }
  },
  { urls: ["<all_urls>"] }
);

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getNetworkRequests') {
    const tabId = request.tabId;
    const data = networkRequests[tabId] || { requests: [], timestamp: Date.now() };
    console.log(`[Background] getNetworkRequests for tab ${tabId}: ${data.requests.length} requests found`);

    // Log all tabs that have network requests
    const allTabs = Object.keys(networkRequests);
    console.log(`[Background] Currently tracking network requests for ${allTabs.length} tabs:`,
      allTabs.map(tid => `${tid}(${networkRequests[tid].requests.length})`).join(', '));

    sendResponse({ success: true, data: data.requests });
  }

  if (request.action === 'clearNetworkRequests') {
    const tabId = request.tabId;
    if (networkRequests[tabId]) {
      networkRequests[tabId].requests = [];
      // Save to storage after clearing
      saveNetworkRequestsToStorage();
    }
    sendResponse({ success: true });
  }

  if (request.action === 'storeConsoleLogs') {
    const tabId = sender.tab.id;
    if (!consoleLogs[tabId]) {
      consoleLogs[tabId] = {
        logs: [],
        timestamp: Date.now()
      };
    }
    consoleLogs[tabId].logs = request.logs;
    sendResponse({ success: true });
  }

  if (request.action === 'getConsoleLogs') {
    const tabId = request.tabId;
    const data = consoleLogs[tabId] || { logs: [], timestamp: Date.now() };
    sendResponse({ success: true, data: data.logs });
  }

  if (request.action === 'getAllNetworkRequestCounts') {
    // Return summary of all tabs with network request counts
    const summary = {};
    Object.keys(networkRequests).forEach(tabId => {
      summary[tabId] = networkRequests[tabId].requests.length;
    });
    console.log('[Background] getAllNetworkRequestCounts:', summary);
    sendResponse({ success: true, data: summary });
  }

  if (request.action === 'captureScreenshot') {
    // Capture screenshot of the current tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length > 0) {
        const tab = tabs[0];
        try {
          const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 100
          });
          sendResponse({ success: true, screenshot: screenshot, tabId: tab.id });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'openAnnotationPage') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('annotate/annotate.html'),
      active: true
    }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'startDisplayCapture') {
    recordingTabId = request.tabId || null;
    recordingStartTime = Date.now();

    console.log('[Background] Starting display capture for tab', recordingTabId, 'at', new Date(recordingStartTime).toISOString());

    // Persist recording state to storage (in case service worker terminates during recording)
    chrome.storage.session.set({
      isRecording: true,
      recordingStartTime: recordingStartTime,
      recordingTabId: recordingTabId
    }).catch(err => console.error('[Background] Error persisting recording state:', err));

    handleStartDisplayCapture()
      .then(() => {
        console.log('[Background] Display capture started successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Background] Error starting display capture:', error);
        recordingStartTime = null; // Reset on error
        // Clear recording state from storage
        chrome.storage.session.remove(['isRecording', 'recordingStartTime', 'recordingTabId'])
          .catch(err => console.error('[Background] Error clearing recording state:', err));
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  if (request.action === 'captureDisplayScreenshot') {
    console.log('[Background] Capturing display screenshot');

    handleCaptureDisplayScreenshot()
      .then((screenshotDataUrl) => {
        console.log('[Background] Screenshot captured successfully');
        sendResponse({ success: true, screenshotDataUrl });
      })
      .catch((error) => {
        console.error('[Background] Error capturing screenshot:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  if (request.action === 'recordingComplete') {
    if (request.largeVideo) {
      console.log('[Background] Recording complete, large video in IndexedDB (', request.videoSizeMB.toFixed(2), 'MB)');
    } else {
      console.log('[Background] Recording complete, processing video data');
    }
    handleRecordingComplete(request.videoDataUrl, request.largeVideo, request.videoSizeMB)
      .then(() => {
        console.log('[Background] Recording processed successfully');
      })
      .catch((error) => {
        console.error('[Background] Error processing recording:', error);
      });
    return false; // Don't need to send response
  }

  if (request.action === 'recordingError') {
    console.error('[Background] Recording error:', request.error);
    // Clean up offscreen document
    closeOffscreenDocument()
      .then(() => {
        console.log('[Background] Cleaned up after recording error');
      })
      .catch((error) => {
        console.error('[Background] Error cleaning up:', error);
      });
    return false; // Don't need to send response
  }

  return true; // Keep channel open for async response
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

console.log('Bug Reporter Extension Background Service Worker Loaded');
