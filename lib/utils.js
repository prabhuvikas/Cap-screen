// Utility functions

// Format date/time
function formatDateTime(date = new Date()) {
  return date.toISOString();
}

// Format date for display
function formatDateDisplay(date = new Date()) {
  return date.toLocaleString();
}

// Get browser information
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  const matches = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/(\d+\.\d+)/);

  return {
    userAgent: userAgent,
    browser: matches ? matches[1] : 'Unknown',
    version: matches ? matches[2] : 'Unknown',
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
}

// Get viewport information
function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    devicePixelRatio: window.devicePixelRatio,
    orientation: window.screen.orientation?.type || 'unknown'
  };
}

// Sanitize sensitive data
function sanitizeData(data, redactPatterns = []) {
  const defaultPatterns = [
    /api[_-]?key/i,
    /auth[_-]?token/i,
    /password/i,
    /secret/i,
    /bearer\s+/i,
    /jwt/i
  ];

  const patterns = [...defaultPatterns, ...redactPatterns];
  const sanitized = JSON.parse(JSON.stringify(data));

  function redact(obj) {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key in obj) {
      const shouldRedact = patterns.some(pattern => pattern.test(key));

      if (shouldRedact) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    }
  }

  redact(sanitized);
  return sanitized;
}

// Deep clone object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Truncate string
function truncate(str, maxLength = 100) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Download data as file
function downloadFile(data, filename, mimeType = 'text/plain') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

// Show notification
function showNotification(title, message, type = 'info') {
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../assets/icons/icon128.png',
      title: title,
      message: message
    });
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

// Recent submissions history (stored in chrome.storage.local)
const RECENT_SUBMISSIONS_KEY = 'recentSubmissions';
const MAX_RECENT_SUBMISSIONS = 10;

async function saveRecentSubmission(entry) {
  try {
    const result = await chrome.storage.local.get(RECENT_SUBMISSIONS_KEY);
    const submissions = result[RECENT_SUBMISSIONS_KEY] || [];
    submissions.unshift(entry);
    if (submissions.length > MAX_RECENT_SUBMISSIONS) {
      submissions.length = MAX_RECENT_SUBMISSIONS;
    }
    await chrome.storage.local.set({ [RECENT_SUBMISSIONS_KEY]: submissions });
  } catch (error) {
    console.error('[Utils] Error saving recent submission:', error);
  }
}

async function getRecentSubmissions() {
  try {
    const result = await chrome.storage.local.get(RECENT_SUBMISSIONS_KEY);
    return result[RECENT_SUBMISSIONS_KEY] || [];
  } catch (error) {
    console.error('[Utils] Error loading recent submissions:', error);
    return [];
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatDateTime,
    formatDateDisplay,
    getBrowserInfo,
    getViewportInfo,
    sanitizeData,
    deepClone,
    truncate,
    formatFileSize,
    downloadFile,
    copyToClipboard,
    showNotification,
    debounce,
    throttle,
    generateId,
    isValidUrl,
    saveRecentSubmission,
    getRecentSubmissions,
    RECENT_SUBMISSIONS_KEY,
    MAX_RECENT_SUBMISSIONS
  };
}
