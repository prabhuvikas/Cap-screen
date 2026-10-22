// Content script for page information collection

// Prevent multiple injections
if (window.bugReporterContentScriptLoaded) {
  console.log('Bug Reporter Content Script already loaded');
} else {
  window.bugReporterContentScriptLoaded = true;

// Console logs are recorded by content/console-capture.js in the page's own
// (MAIN) world; patching console here would only see this extension's logging.
// Ask it for its buffer via a DOM event; both events dispatch synchronously.
function readPageConsoleLogs() {
  let logs = [];
  const onLogs = (event) => {
    try {
      const parsed = JSON.parse(event.detail);
      if (Array.isArray(parsed)) logs = parsed;
    } catch (e) {
      // Not from the capture script; ignore
    }
  };
  document.addEventListener('cred-issue-reporter:console-logs', onLogs);
  document.dispatchEvent(new CustomEvent('cred-issue-reporter:get-console-logs'));
  document.removeEventListener('cred-issue-reporter:console-logs', onLogs);
  return logs.map(({ seq, ...log }) => log);
}

// Helper function to detect browser name
function getBrowserName(userAgent) {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge';
  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) return 'Google Chrome';
  if (userAgent.includes('Firefox/')) return 'Mozilla Firefox';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari';
  if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) return 'Opera';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';
  return 'Unknown';
}

// Helper function to extract browser version
function getBrowserVersion(userAgent) {
  let match;
  if (userAgent.includes('Edg/')) {
    match = userAgent.match(/Edg\/(\d+\.\d+)/);
  } else if (userAgent.includes('Chrome/')) {
    match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  } else if (userAgent.includes('Firefox/')) {
    match = userAgent.match(/Firefox\/(\d+\.\d+)/);
  } else if (userAgent.includes('Safari/')) {
    match = userAgent.match(/Version\/(\d+\.\d+)/);
  } else if (userAgent.includes('OPR/')) {
    match = userAgent.match(/OPR\/(\d+\.\d+)/);
  }
  return match ? match[1] : 'Unknown';
}

// Helper function to get detailed OS information
function getOSInfo(userAgent, platform) {
  let osName = 'Unknown';
  let osVersion = 'Unknown';

  // Windows
  if (userAgent.includes('Windows NT 10.0')) {
    osName = 'Windows';
    osVersion = '10/11';
  } else if (userAgent.includes('Windows NT 6.3')) {
    osName = 'Windows';
    osVersion = '8.1';
  } else if (userAgent.includes('Windows NT 6.2')) {
    osName = 'Windows';
    osVersion = '8';
  } else if (userAgent.includes('Windows NT 6.1')) {
    osName = 'Windows';
    osVersion = '7';
  } else if (userAgent.includes('Windows')) {
    osName = 'Windows';
    const match = userAgent.match(/Windows NT (\d+\.\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  }
  // macOS
  else if (userAgent.includes('Mac OS X')) {
    osName = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  // Linux
  else if (userAgent.includes('Linux') || platform.includes('Linux')) {
    osName = 'Linux';
    if (userAgent.includes('Ubuntu')) osVersion = 'Ubuntu';
    else if (userAgent.includes('Fedora')) osVersion = 'Fedora';
    else if (userAgent.includes('Debian')) osVersion = 'Debian';
    else osVersion = 'Unknown Distribution';
  }
  // Android
  else if (userAgent.includes('Android')) {
    osName = 'Android';
    const match = userAgent.match(/Android (\d+(\.\d+)?)/);
    osVersion = match ? match[1] : 'Unknown';
  }
  // iOS
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    osName = userAgent.includes('iPhone') ? 'iOS' : 'iPadOS';
    const match = userAgent.match(/OS (\d+[._]\d+([._]\d+)?)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  // Chrome OS
  else if (userAgent.includes('CrOS')) {
    osName = 'Chrome OS';
    const match = userAgent.match(/CrOS \w+ (\d+\.\d+\.\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  }

  return {
    name: osName,
    version: osVersion,
    platform: platform,
    architecture: platform.includes('64') ? '64-bit' : platform.includes('32') ? '32-bit' : 'Unknown'
  };
}

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
      onLine: navigator.onLine,
      // Detailed browser info
      name: getBrowserName(navigator.userAgent),
      version: getBrowserVersion(navigator.userAgent),
      vendor: navigator.vendor,
      appName: navigator.appName,
      appVersion: navigator.appVersion
    },
    system: {
      // OS Information
      os: getOSInfo(navigator.userAgent, navigator.platform),
      // CPU Information
      cpuCores: navigator.hardwareConcurrency || 'Unknown',
      // RAM Information (available in some browsers)
      deviceMemory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Unknown',
      // Max touch points
      maxTouchPoints: navigator.maxTouchPoints || 0
    },
    network: {
      // Network Information API (if available)
      connectionType: navigator.connection?.type || navigator.connection?.effectiveType || 'Unknown',
      effectiveType: navigator.connection?.effectiveType || 'Unknown',
      downlink: navigator.connection?.downlink ? `${navigator.connection.downlink} Mbps` : 'Unknown',
      rtt: navigator.connection?.rtt ? `${navigator.connection.rtt} ms` : 'Unknown',
      saveData: navigator.connection?.saveData || false
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

// Listen for messages from popup and background
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
    sendResponse({ success: true, data: readPageConsoleLogs() });
  }

  if (request.action === 'recordingStopped') {
    // Recording has stopped - remove recording overlay if present
    console.log('[Content] Recording stopped notification received');
    // Remove any recording indicator/overlay that may have been added
    const overlay = document.getElementById('cap-screen-recording-overlay');
    if (overlay) {
      overlay.remove();
      console.log('[Content] Removed recording overlay');
    }
    sendResponse({ success: true });
  }

  return true;
});

console.log('Bug Reporter Content Script Loaded');

} // End of if block to prevent multiple injections
