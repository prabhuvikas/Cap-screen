// Screenshot capture functionality

class ScreenshotCapture {
  constructor() {
    this.canvas = null;
    this.ctx = null;
  }

  // Capture visible viewport
  async captureViewport() {
    try {
      // Request screenshot from Chrome API
      const response = await chrome.runtime.sendMessage({
        action: 'captureVisibleTab'
      });

      if (response && response.dataUrl) {
        return response.dataUrl;
      }

      throw new Error('Failed to capture screenshot');
    } catch (error) {
      console.error('Error capturing viewport:', error);
      throw error;
    }
  }

  // Capture full page with scrolling
  async captureFullPage() {
    try {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollWidth = document.documentElement.scrollWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Create canvas for full page
      const canvas = document.createElement('canvas');
      canvas.width = scrollWidth;
      canvas.height = scrollHeight;
      const ctx = canvas.getContext('2d');

      // Save original scroll position
      const originalScrollX = window.scrollX;
      const originalScrollY = window.scrollY;

      // Calculate number of screenshots needed
      const numVertical = Math.ceil(scrollHeight / viewportHeight);
      const numHorizontal = Math.ceil(scrollWidth / viewportWidth);

      // Capture screenshots in a grid
      for (let y = 0; y < numVertical; y++) {
        for (let x = 0; x < numHorizontal; x++) {
          const scrollX = x * viewportWidth;
          const scrollY = y * viewportHeight;

          // Scroll to position
          window.scrollTo(scrollX, scrollY);

          // Wait for scroll to complete
          await this.sleep(100);

          // Capture screenshot
          const response = await chrome.runtime.sendMessage({
            action: 'captureVisibleTab'
          });

          if (response && response.dataUrl) {
            // Load image
            const img = await this.loadImage(response.dataUrl);

            // Draw on canvas
            ctx.drawImage(img, scrollX, scrollY);
          }
        }
      }

      // Restore original scroll position
      window.scrollTo(originalScrollX, originalScrollY);

      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing full page:', error);
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

  // Alternative full page capture using html2canvas-like approach
  async captureFullPageAlternative() {
    try {
      // This is a simplified version - in production you'd use html2canvas library
      const canvas = document.createElement('canvas');
      const body = document.body;
      const html = document.documentElement;

      const height = Math.max(
        body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight
      );
      const width = Math.max(
        body.scrollWidth, body.offsetWidth,
        html.clientWidth, html.scrollWidth, html.offsetWidth
      );

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      // This is a placeholder - in production, use html2canvas library
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.font = '16px Arial';
      ctx.fillText('Full page screenshot requires html2canvas library', 20, 50);
      ctx.fillText('Currently showing viewport capture only', 20, 80);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error in alternative capture:', error);
      throw error;
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotCapture;
}
