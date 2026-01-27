// Offscreen document for handling video recording
// This is needed because service workers don't have access to MediaRecorder

let mediaRecorder = null;
let recordedChunks = [];
let displayStream = null;

console.log('[Offscreen] Offscreen document loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', request.action);

  if (request.action === 'startDisplayRecording') {
    // Legacy: start recording immediately (prepare + begin in one step)
    prepareDisplayRecording()
      .then(() => {
        mediaRecorder.start(10000);
        console.log('[Offscreen] Display recording started successfully (legacy path)');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] Error starting display recording:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'prepareDisplayRecording') {
    prepareDisplayRecording()
      .then(() => {
        console.log('[Offscreen] Display recording prepared successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] Error preparing display recording:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'beginRecording') {
    try {
      if (!mediaRecorder || mediaRecorder.state !== 'inactive') {
        throw new Error('MediaRecorder not ready or already recording');
      }
      mediaRecorder.start(10000);
      console.log('[Offscreen] MediaRecorder started for display media with 10s timeslice');
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Offscreen] Error beginning recording:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (request.action === 'stitchScreenshots') {
    stitchScreenshots(request)
      .then((screenshotDataUrl) => {
        console.log('[Offscreen] Stitching complete, data length:', screenshotDataUrl.length);
        sendResponse({ success: true, screenshotDataUrl });
      })
      .catch((error) => {
        console.error('[Offscreen] Error stitching screenshots:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'captureDisplayScreenshot') {
    captureDisplayScreenshot()
      .then((screenshotDataUrl) => {
        console.log('[Offscreen] Screenshot captured successfully');
        sendResponse({ success: true, screenshotDataUrl });
      })
      .catch((error) => {
        console.error('[Offscreen] Error capturing screenshot:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  return false;
});

// Phase 1: Acquire display media stream and create MediaRecorder, but don't start recording.
// This allows the background to show a countdown before beginning capture.
async function prepareDisplayRecording() {
  try {
    console.log('[Offscreen] Getting display media stream');

    // Get display media stream - this will show a picker dialog
    // User can choose: tab, window, or entire screen
    displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor', // Prefer entire screen/window
        cursor: 'always', // Always show cursor in recording
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      },
      preferCurrentTab: false // Don't force current tab selection
    });

    console.log('[Offscreen] Got display media stream, creating MediaRecorder');

    // Reset recorded chunks
    recordedChunks = [];

    // Create MediaRecorder with the stream
    mediaRecorder = new MediaRecorder(displayStream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });

    // Handle data available event
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log('[Offscreen] Data chunk received, size:', event.data.size);
        recordedChunks.push(event.data);
      }
    };

    // Handle recording stop (works for both programmatic and browser UI stop)
    mediaRecorder.onstop = async () => {
      console.log('[Offscreen] MediaRecorder stopped, processing video...');

      try {
        // Create blob from recorded chunks
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        console.log('[Offscreen] Created blob, size:', blob.size, 'bytes (', (blob.size / 1024 / 1024).toFixed(2), 'MB)');

        // Convert blob to data URL
        const videoDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to convert recording to data URL'));
          reader.readAsDataURL(blob);
        });

        console.log('[Offscreen] Converted to data URL, length:', videoDataUrl.length, 'chars (', (videoDataUrl.length / 1024 / 1024).toFixed(2), 'MB)');

        // Stop all tracks
        if (displayStream) {
          displayStream.getTracks().forEach(track => {
            console.log('[Offscreen] Stopping track:', track.kind);
            track.stop();
          });
          displayStream = null;
        }

        // For large videos (>5MB), use IndexedDB instead of chrome.runtime.sendMessage
        // chrome.runtime.sendMessage has size limits (~4MB) and chrome.storage.session has quota limits (~10MB)
        const videoSizeMB = videoDataUrl.length / 1024 / 1024;

        if (videoSizeMB > 5) {
          console.log('[Offscreen] Large video detected (', videoSizeMB.toFixed(2), 'MB), using IndexedDB storage');

          // Save to IndexedDB
          await videoStorage.saveVideo(videoDataUrl, {
            size: blob.size,
            duration: blob.duration || 0,
            type: 'video/webm'
          });

          // Notify background that recording is complete (without video data)
          chrome.runtime.sendMessage({
            action: 'recordingComplete',
            largeVideo: true,
            videoSizeMB: videoSizeMB
          });
        } else {
          console.log('[Offscreen] Small video (', videoSizeMB.toFixed(2), 'MB), sending via message');

          // For small videos, send directly via message (faster)
          chrome.runtime.sendMessage({
            action: 'recordingComplete',
            videoDataUrl: videoDataUrl
          });
        }

      } catch (error) {
        console.error('[Offscreen] Error processing recording:', error);
        // Notify background of error
        chrome.runtime.sendMessage({
          action: 'recordingError',
          error: error.message
        });
      }
    };

    // Handle user stopping via browser UI (clicking "Stop sharing")
    displayStream.getVideoTracks()[0].onended = () => {
      console.log('[Offscreen] User stopped recording via browser UI');
      // The MediaRecorder.onstop will handle the rest
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };

    // NOTE: Recording is NOT started here. The background will send a
    // 'beginRecording' message after the countdown completes.
    console.log('[Offscreen] MediaRecorder prepared and ready (not yet recording)');

  } catch (error) {
    console.error('[Offscreen] Error in prepareDisplayRecording:', error);
    throw error;
  }
}

async function captureDisplayScreenshot() {
  try {
    console.log('[Offscreen] Getting display media for screenshot');

    // Get display media stream - browser will show picker
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        cursor: 'always',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false, // No audio needed for screenshots
      preferCurrentTab: false
    });

    console.log('[Offscreen] Got display media stream, capturing frame');

    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;

    // Wait for video to be ready
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

    // Wait a bit for the first frame to render
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create canvas and capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    console.log('[Offscreen] Frame captured, size:', canvas.width, 'x', canvas.height);

    // Stop all tracks immediately
    stream.getTracks().forEach(track => {
      console.log('[Offscreen] Stopping track:', track.kind);
      track.stop();
    });

    // Convert to data URL
    const screenshotDataUrl = canvas.toDataURL('image/png', 1.0);
    console.log('[Offscreen] Converted to data URL, length:', screenshotDataUrl.length);

    return screenshotDataUrl;

  } catch (error) {
    console.error('[Offscreen] Error in captureDisplayScreenshot:', error);
    throw error;
  }
}

// Stitch multiple viewport captures into a single full-page image
async function stitchScreenshots({
  captures,
  fullWidth,
  fullHeight,
  viewportWidth,
  viewportHeight,
  devicePixelRatio,
  scaleFactor,
}) {
  try {
    const dpr = devicePixelRatio || 1;
    const scale = scaleFactor || 1;

    const canvasWidth = Math.round(fullWidth * dpr * scale);
    const canvasHeight = Math.round(fullHeight * dpr * scale);

    console.log(`[Offscreen] Stitching ${captures.length} captures into ${canvasWidth}x${canvasHeight} canvas (dpr=${dpr}, scale=${scale})`);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // White background (in case of gaps)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Load and draw each captured viewport
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      const img = await loadImage(capture.dataUrl);

      // The captured image is at native device resolution (viewportWidth*dpr x viewportHeight*dpr).
      // Draw at the position corresponding to the actual scroll offset, scaled by dpr and scaleFactor.
      const dx = Math.round(capture.x * dpr * scale);
      const dy = Math.round(capture.y * dpr * scale);
      const dw = Math.round(img.naturalWidth * scale);
      const dh = Math.round(img.naturalHeight * scale);

      ctx.drawImage(img, dx, dy, dw, dh);
      console.log(`[Offscreen] Drew segment ${i + 1}/${captures.length} at (${dx},${dy}) size ${dw}x${dh}`);
    }

    // Use JPEG for very large images to reduce data URL size, PNG otherwise
    const pixelCount = canvasWidth * canvasHeight;
    let dataUrl;
    if (pixelCount > 25_000_000) {
      console.log('[Offscreen] Large image, using JPEG encoding');
      dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    } else {
      dataUrl = canvas.toDataURL('image/png');
    }

    console.log('[Offscreen] Stitched data URL length:', dataUrl.length);
    return dataUrl;
  } catch (error) {
    console.error('[Offscreen] Error in stitchScreenshots:', error);
    throw error;
  }
}

// Helper: load an image from a data URL
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for stitching'));
    img.src = dataUrl;
  });
}

