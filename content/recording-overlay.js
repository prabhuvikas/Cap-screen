// Recording Overlay - Shows floating recording indicator and controls

class RecordingOverlay {
  constructor() {
    this.overlay = null;
    this.startTime = null;
    this.timerInterval = null;
    this.isRecording = false;
  }

  showRecordingOverlay() {
    console.log('[Overlay] Showing recording overlay');
    this.startTime = Date.now();
    this.isRecording = true;
    this.showOverlay();
    this.startTimer();
    console.log('[Overlay] Recording overlay shown successfully');
    return { success: true };
  }

  showOverlay() {
    // Remove existing overlay if any
    this.removeOverlay();

    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'bug-reporter-recording-overlay';
    this.overlay.innerHTML = `
      <style>
        #bug-reporter-recording-overlay {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483647;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          gap: 12px;
          backdrop-filter: blur(10px);
        }

        #bug-reporter-recording-overlay .recording-dot {
          width: 12px;
          height: 12px;
          background: #ff4444;
          border-radius: 50%;
          animation: bug-reporter-pulse 1.5s ease-in-out infinite;
        }

        @keyframes bug-reporter-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        #bug-reporter-recording-overlay .recording-text {
          font-weight: 500;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        #bug-reporter-recording-overlay .recording-label {
          font-size: 12px;
          opacity: 0.8;
        }

        #bug-reporter-recording-overlay .recording-time {
          font-size: 16px;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        #bug-reporter-recording-overlay .stop-btn {
          background: #ff4444;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.2s;
        }

        #bug-reporter-recording-overlay .stop-btn:hover {
          background: #cc0000;
        }
      </style>
      <div class="recording-dot"></div>
      <div class="recording-text">
        <div class="recording-label">Recording</div>
        <div class="recording-time" id="recording-timer">00:00</div>
      </div>
      <button class="stop-btn" id="stop-recording-btn">Stop</button>
    `;

    // Add to page
    document.body.appendChild(this.overlay);

    // Add stop button listener
    document.getElementById('stop-recording-btn').addEventListener('click', () => {
      this.stopRecording();
    });
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      const timerEl = document.getElementById('recording-timer');
      if (timerEl) {
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
    }, 1000);
  }

  async stopRecording() {
    if (!this.isRecording) return;

    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Show stopping message
    const timerEl = document.getElementById('recording-timer');
    if (timerEl) {
      timerEl.textContent = 'Stopping...';
    }

    // Tell background to stop recording
    const response = await chrome.runtime.sendMessage({
      action: 'stopTabCapture'
    });

    if (response && response.success) {
      this.isRecording = false;
    }
  }

  async handleRecordingStopped() {
    // Remove overlay
    this.removeOverlay();

    // Take a screenshot automatically
    const response = await chrome.runtime.sendMessage({
      action: 'captureScreenshot'
    });

    if (response && response.success) {
      // Save screenshot and open annotation page
      const screenshotData = response.screenshot;
      const newScreenshot = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        data: screenshotData,
        annotations: null,
        timestamp: Date.now(),
        tabId: response.tabId,
        name: 'Screenshot 1'
      };

      await chrome.storage.session.set({
        screenshots: [newScreenshot],
        currentScreenshotId: newScreenshot.id,
        tabId: response.tabId,
        screenshotData: screenshotData
      });

      // Open annotation page
      await chrome.runtime.sendMessage({
        action: 'openAnnotationPage'
      });
    }
  }

  removeOverlay() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}

// Global instance
let recordingOverlay = new RecordingOverlay();

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showRecordingOverlay') {
    const result = recordingOverlay.showRecordingOverlay();
    sendResponse(result);
    return true;
  } else if (request.action === 'recordingStopped') {
    // Called by background when recording actually stops
    recordingOverlay.handleRecordingStopped();
    sendResponse({ success: true });
    return true;
  }
});
