// Background service worker for network monitoring and data collection

let networkRequests = {};
let consoleLogs = {};
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let recordingTabId = null;
let recordingStartTime = null;
let recordingEndTime = null;

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
        await chrome.tabs.sendMessage(recordingTabId, {
          action: 'recordingStopped'
        });
        console.log('[Background] Notified content script');
      } catch (e) {
        console.error('[Background] Could not notify content script:', e);
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

// Clean up old data periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = false;

  for (const tabId in networkRequests) {
    if (networkRequests[tabId].timestamp < now - 3600000) { // 1 hour old
      delete networkRequests[tabId];
      cleaned = true;
    }
  }
  for (const tabId in consoleLogs) {
    if (consoleLogs[tabId].timestamp < now - 3600000) {
      delete consoleLogs[tabId];
    }
  }

  // Save to storage if we cleaned anything
  if (cleaned) {
    console.log('[Background] Cleaned old network request data');
    saveNetworkRequestsToStorage();
  }
}, 300000); // Clean every 5 minutes

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

    const request = {
      id: details.requestId,
      url: details.url,
      method: details.method,
      type: details.type,
      timestamp: details.timeStamp,
      requestBody: details.requestBody
    };

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
