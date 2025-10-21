// Content script for page information collection

// Collect console logs
const consoleLogs = [];
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info
};

// Override console methods to capture logs
['log', 'warn', 'error', 'info'].forEach(method => {
  console[method] = function(...args) {
    consoleLogs.push({
      type: method,
      message: args.map(arg => {
        try {
          return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
        } catch (e) {
          return String(arg);
        }
      }).join(' '),
      timestamp: new Date().toISOString(),
      url: window.location.href
    });

    // Call original console method
    originalConsole[method].apply(console, args);

    // Send to background script periodically
    if (consoleLogs.length % 10 === 0) {
      chrome.runtime.sendMessage({
        action: 'storeConsoleLogs',
        logs: consoleLogs
      });
    }
  };
});

// Capture unhandled errors
window.addEventListener('error', (event) => {
  consoleLogs.push({
    type: 'error',
    message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    stack: event.error?.stack
  });
});

// Capture unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  consoleLogs.push({
    type: 'error',
    message: `Unhandled Promise Rejection: ${event.reason}`,
    timestamp: new Date().toISOString(),
    url: window.location.href
  });
});

// Function to collect page information
function collectPageInfo() {
  const pageInfo = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      devicePixelRatio: window.devicePixelRatio
    },
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    },
    document: {
      readyState: document.readyState,
      characterSet: document.characterSet,
      referrer: document.referrer,
      lastModified: document.lastModified
    },
    performance: {
      navigation: {
        type: performance.navigation?.type,
        redirectCount: performance.navigation?.redirectCount
      },
      timing: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReadyTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        responseTime: performance.timing.responseEnd - performance.timing.requestStart
      } : null
    }
  };

  // Collect meta tags
  const metaTags = {};
  document.querySelectorAll('meta').forEach(meta => {
    const name = meta.getAttribute('name') || meta.getAttribute('property');
    const content = meta.getAttribute('content');
    if (name && content) {
      metaTags[name] = content;
    }
  });
  pageInfo.metaTags = metaTags;

  return pageInfo;
}

// Function to collect storage data
function collectStorageData() {
  const storageData = {
    localStorage: {},
    sessionStorage: {},
    cookies: document.cookie
  };

  // Collect localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      storageData.localStorage[key] = localStorage.getItem(key);
    }
  } catch (e) {
    storageData.localStorage = { error: 'Unable to access localStorage' };
  }

  // Collect sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      storageData.sessionStorage[key] = sessionStorage.getItem(key);
    }
  } catch (e) {
    storageData.sessionStorage = { error: 'Unable to access sessionStorage' };
  }

  return storageData;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectPageInfo') {
    const pageInfo = collectPageInfo();
    sendResponse({ success: true, data: pageInfo });
  }

  if (request.action === 'collectStorageData') {
    const storageData = collectStorageData();
    sendResponse({ success: true, data: storageData });
  }

  if (request.action === 'getConsoleLogs') {
    // Send latest logs to background
    chrome.runtime.sendMessage({
      action: 'storeConsoleLogs',
      logs: consoleLogs
    });
    sendResponse({ success: true, data: consoleLogs });
  }

  return true;
});

console.log('Bug Reporter Content Script Loaded');
