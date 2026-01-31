// Screenshot capture functionality
// Provides viewport and full-page capture via the background service worker.

class ScreenshotCapture {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  // Capture visible viewport by asking the background to call captureVisibleTab
  async captureViewport() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'captureVisibleTab'
      });

      if (response && response.success && response.dataUrl) {
        return response.dataUrl;
      }

      throw new Error(response?.error || 'Failed to capture screenshot');
    } catch (error) {
      console.error('[ScreenshotCapture] Error capturing viewport:', error);
      throw error;
    }
  }

  // Capture full page using scroll-and-stitch via the background service worker.
  // The background orchestrates scrolling, captures each viewport segment,
  // then delegates stitching to the offscreen document.
  async captureFullPage() {
    try {
      // Determine the active tab id so the background knows which tab to scroll
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        throw new Error('No active tab found for full-page capture');
      }

      const response = await chrome.runtime.sendMessage({
        action: 'captureFullPageScreenshot',
        tabId: tab.id
      });

      if (response && response.success && response.screenshotDataUrl) {
        return response.screenshotDataUrl;
      }

      throw new Error(response?.error || 'Failed to capture full page screenshot');
    } catch (error) {
      console.error('[ScreenshotCapture] Error capturing full page:', error);
      throw error;
    }
  }

  // Helper: Load image from data URL
  loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // Helper: Sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotCapture;
}
