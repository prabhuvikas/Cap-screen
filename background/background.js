// Background service worker for network monitoring and data collection

let networkRequests = {};
let consoleLogs = {};
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let recordingTabId = null;

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

async function handleStartTabCapture(tabId) {
  try {
    console.log('[Background] Getting media stream ID for tab:', tabId);

    // Get the stream ID from tabCapture API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    console.log('[Background] Got stream ID:', streamId);

    // Setup offscreen document
    await setupOffscreenDocument();

    // Send the stream ID to the offscreen document to start recording
    console.log('[Background] Sending startRecording message to offscreen document');
    const response = await chrome.runtime.sendMessage({
      action: 'startRecording',
      streamId: streamId
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to start recording in offscreen document');
    }

    console.log('[Background] Recording started in offscreen document');
  } catch (error) {
    console.error('[Background] Error in handleStartTabCapture:', error);
    // Clean up offscreen document if there was an error
    try {
      await closeOffscreenDocument();
    } catch (e) {
      console.error('[Background] Error closing offscreen document:', e);
    }
    throw error;
  }
}

async function handleStopTabCapture() {
  try {
    console.log('[Background] Stopping recording in offscreen document');

    // Send stop message to offscreen document
    const response = await chrome.runtime.sendMessage({
      action: 'stopRecording'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to stop recording in offscreen document');
    }

    const videoDataUrl = response.videoDataUrl;
    console.log('[Background] Got video data URL, length:', videoDataUrl.length);

    // Close offscreen document
    await closeOffscreenDocument();

    // Save video to session storage (no screenshot)
    await chrome.storage.session.set({
      videoRecording: videoDataUrl,
      hasVideoRecording: true,
      tabId: recordingTabId
    });
    console.log('[Background] Video saved to session storage');

    // Notify content script that recording stopped (so it can remove overlay)
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

    recordingTabId = null;
    console.log('[Background] Recording stopped successfully');
  } catch (error) {
    console.error('[Background] Error in handleStopTabCapture:', error);
    // Try to clean up offscreen document
    try {
      await closeOffscreenDocument();
    } catch (e) {
      console.error('[Background] Error closing offscreen document:', e);
    }
    throw error;
  }
}

// Clean up old data periodically
setInterval(() => {
  const now = Date.now();
  for (const tabId in networkRequests) {
    if (networkRequests[tabId].timestamp < now - 3600000) { // 1 hour old
      delete networkRequests[tabId];
    }
  }
  for (const tabId in consoleLogs) {
    if (consoleLogs[tabId].timestamp < now - 3600000) {
      delete consoleLogs[tabId];
    }
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
    }
  },
  { urls: ["<all_urls>"] }
);

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getNetworkRequests') {
    const tabId = request.tabId;
    const data = networkRequests[tabId] || { requests: [], timestamp: Date.now() };
    sendResponse({ success: true, data: data.requests });
  }

  if (request.action === 'clearNetworkRequests') {
    const tabId = request.tabId;
    if (networkRequests[tabId]) {
      networkRequests[tabId].requests = [];
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

  if (request.action === 'startTabCapture') {
    const tabId = request.tabId;
    recordingTabId = tabId;

    console.log('[Background] Starting tab capture for tab:', tabId);

    handleStartTabCapture(tabId)
      .then(() => {
        console.log('[Background] Tab capture started successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Background] Error starting tab capture:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep channel open for async response
  }

  if (request.action === 'stopTabCapture') {
    handleStopTabCapture()
      .then(() => {
        console.log('[Background] Tab capture stopped successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Background] Error stopping tab capture:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  return true; // Keep channel open for async response
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

console.log('Bug Reporter Extension Background Service Worker Loaded');
