// Offscreen document for handling video recording
// This is needed because service workers don't have access to MediaRecorder

let mediaRecorder = null;
let recordedChunks = [];

console.log('[Offscreen] Offscreen document loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', request.action);

  if (request.action === 'startDisplayRecording') {
    startDisplayRecording()
      .then(() => {
        console.log('[Offscreen] Display recording started successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] Error starting display recording:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  return false;
});

async function startDisplayRecording() {
  try {
    console.log('[Offscreen] Getting display media stream');

    // Get display media stream - this will show a picker dialog
    // User can choose: tab, window, or entire screen
    const stream = await navigator.mediaDevices.getDisplayMedia({
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
    mediaRecorder = new MediaRecorder(stream, {
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
        console.log('[Offscreen] Created blob, size:', blob.size);

        // Convert blob to data URL
        const videoDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Failed to convert recording to data URL'));
          reader.readAsDataURL(blob);
        });

        console.log('[Offscreen] Converted to data URL, length:', videoDataUrl.length);

        // Stop all tracks
        stream.getTracks().forEach(track => {
          console.log('[Offscreen] Stopping track:', track.kind);
          track.stop();
        });

        // Notify background that recording is complete with video data
        chrome.runtime.sendMessage({
          action: 'recordingComplete',
          videoDataUrl: videoDataUrl
        });

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
    stream.getVideoTracks()[0].onended = () => {
      console.log('[Offscreen] User stopped recording via browser UI');
      // The MediaRecorder.onstop will handle the rest
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    };

    // Start recording
    mediaRecorder.start();
    console.log('[Offscreen] MediaRecorder started for display media');

  } catch (error) {
    console.error('[Offscreen] Error in startDisplayRecording:', error);
    throw error;
  }
}

