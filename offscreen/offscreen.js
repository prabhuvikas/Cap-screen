// Offscreen document for handling video recording
// This is needed because service workers don't have access to MediaRecorder

let mediaRecorder = null;
let recordedChunks = [];

console.log('[Offscreen] Offscreen document loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Offscreen] Received message:', request.action);

  if (request.action === 'startRecording') {
    startRecording(request.streamId)
      .then(() => {
        console.log('[Offscreen] Recording started successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] Error starting recording:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

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

  if (request.action === 'stopRecording') {
    stopRecording()
      .then((videoDataUrl) => {
        console.log('[Offscreen] Recording stopped, data URL length:', videoDataUrl.length);
        sendResponse({ success: true, videoDataUrl });
      })
      .catch((error) => {
        console.error('[Offscreen] Error stopping recording:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  return false;
});

async function startRecording(streamId) {
  try {
    console.log('[Offscreen] Getting user media with stream ID:', streamId);

    // Get the media stream using the stream ID from tabCapture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });

    console.log('[Offscreen] Got media stream, creating MediaRecorder');

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

    // Start recording
    mediaRecorder.start();
    console.log('[Offscreen] MediaRecorder started');

  } catch (error) {
    console.error('[Offscreen] Error in startRecording:', error);
    throw error;
  }
}

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

    // Handle user stopping via browser UI
    stream.getVideoTracks()[0].onended = () => {
      console.log('[Offscreen] User stopped recording via browser UI');
      // Notify background that recording was stopped
      chrome.runtime.sendMessage({
        action: 'recordingStoppedByUser'
      });
    };

    // Start recording
    mediaRecorder.start();
    console.log('[Offscreen] MediaRecorder started for display media');

  } catch (error) {
    console.error('[Offscreen] Error in startDisplayRecording:', error);
    throw error;
  }
}

async function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      reject(new Error('No active recording'));
      return;
    }

    console.log('[Offscreen] Stopping MediaRecorder...');

    // Handle the stop event
    mediaRecorder.onstop = async () => {
      console.log('[Offscreen] MediaRecorder stopped, processing chunks...');

      try {
        // Create blob from recorded chunks
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        console.log('[Offscreen] Created blob, size:', blob.size);

        // Convert blob to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const videoDataUrl = reader.result;
          console.log('[Offscreen] Converted to data URL, length:', videoDataUrl.length);

          // Stop all tracks
          const tracks = mediaRecorder.stream.getTracks();
          tracks.forEach(track => {
            console.log('[Offscreen] Stopping track:', track.kind);
            track.stop();
          });

          resolve(videoDataUrl);
        };

        reader.onerror = (error) => {
          console.error('[Offscreen] FileReader error:', error);
          reject(new Error('Failed to convert recording to data URL'));
        };

        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('[Offscreen] Error processing recording:', error);
        reject(error);
      }
    };

    // Stop the media recorder
    mediaRecorder.stop();
  });
}
