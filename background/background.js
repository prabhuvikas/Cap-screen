// Background service worker for network monitoring and data collection

let networkRequests = {};
let consoleLogs = {};
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let recordingTabId = null;

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

    try {
      chrome.tabCapture.capture({
        audio: false,
        video: true,
        videoConstraints: {
          mandatory: {
            minWidth: 1280,
            minHeight: 720,
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30
          }
        }
      }, (stream) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Tab capture error:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
          return;
        }

        if (!stream) {
          console.error('[Background] No stream returned');
          sendResponse({ success: false, error: 'No stream returned from tab capture' });
          return;
        }

        console.log('[Background] Got stream, creating MediaRecorder');
        recordingStream = stream;
        recordedChunks = [];

        // Create MediaRecorder
        try {
          mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000
          });

          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            console.log('[Background] Recording stopped, processing video...');
            // Create blob from recorded chunks
            const blob = new Blob(recordedChunks, { type: 'video/webm' });

            // Convert blob to data URL
            const reader = new FileReader();
            reader.onloadend = async () => {
              const videoDataUrl = reader.result;

              console.log('[Background] Video converted to data URL, size:', videoDataUrl.length);

              // Save to session storage
              await chrome.storage.session.set({
                videoRecording: videoDataUrl,
                hasVideoRecording: true
              });

              console.log('[Background] Video saved to session storage');

              // Stop all tracks
              if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
                recordingStream = null;
              }

              // Notify content script that recording stopped
              try {
                await chrome.tabs.sendMessage(recordingTabId, {
                  action: 'recordingStopped'
                });
                console.log('[Background] Notified content script');
              } catch (e) {
                console.error('[Background] Could not notify content script:', e);
              }

              recordingTabId = null;
            };
            reader.readAsDataURL(blob);
          };

          mediaRecorder.start();
          console.log('[Background] MediaRecorder started successfully');
          sendResponse({ success: true });
        } catch (error) {
          console.error('[Background] MediaRecorder error:', error);
          sendResponse({ success: false, error: error.message });
        }
      });
    } catch (error) {
      console.error('[Background] Exception in startTabCapture:', error);
      sendResponse({ success: false, error: error.message });
    }

    return true; // Keep channel open for async response
  }

  if (request.action === 'stopTabCapture') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No active recording' });
    }
    return true;
  }

  return true; // Keep channel open for async response
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

console.log('Bug Reporter Extension Background Service Worker Loaded');
