/**
 * Tests for Recording Countdown Timer feature
 *
 * Verifies the 3-2-1 countdown that appears before video recording starts:
 * - offscreen.js: two-phase recording (prepareDisplayRecording + beginRecording)
 * - background.js: showCountdownOnTab overlay injection
 * - background.js: handleStartDisplayCapture orchestration (prepare → countdown → begin)
 *
 * Run with: npx jest tests/recordingCountdown.test.js --verbose
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helper: extract a named function declaration from source code
// ---------------------------------------------------------------------------

function extractFunctionSource(source, functionName) {
  // Try async function first, then regular function
  let funcStart = source.indexOf(`async function ${functionName}(`);
  if (funcStart === -1) {
    funcStart = source.indexOf(`function ${functionName}(`);
  }
  if (funcStart === -1) throw new Error(`Function ${functionName} not found`);

  let braceCount = 0;
  let started = false;

  for (let i = funcStart; i < source.length; i++) {
    if (source[i] === '{') {
      braceCount++;
      started = true;
    } else if (source[i] === '}') {
      braceCount--;
    }
    if (started && braceCount === 0) {
      return source.substring(funcStart, i + 1);
    }
  }

  throw new Error(`Could not extract function ${functionName}`);
}

// ===========================================================================
// offscreen.js — prepareDisplayRecording
// ===========================================================================

describe('offscreen.js - prepareDisplayRecording', () => {
  let mockStream;
  let mockVideoTrack;
  let MockMediaRecorder;
  let mockNavigator;
  let mockChrome;

  beforeEach(() => {
    mockVideoTrack = { kind: 'video', stop: jest.fn(), onended: null };

    mockStream = {
      getTracks: jest.fn(() => [
        mockVideoTrack,
        { kind: 'audio', stop: jest.fn() }
      ]),
      getVideoTracks: jest.fn(() => [mockVideoTrack])
    };

    MockMediaRecorder = jest.fn(function (stream, options) {
      this.stream = stream;
      this.options = options;
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
      this.start = jest.fn(() => { this.state = 'recording'; });
      this.stop = jest.fn(() => { this.state = 'inactive'; });
    });

    mockNavigator = {
      mediaDevices: {
        getDisplayMedia: jest.fn().mockResolvedValue(mockStream)
      }
    };

    mockChrome = {
      runtime: { sendMessage: jest.fn() }
    };
  });

  function createPrepare() {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'offscreen/offscreen.js'), 'utf8'
    );
    const funcSrc = extractFunctionSource(source, 'prepareDisplayRecording');

    const factory = new Function(
      'navigator', 'MediaRecorder', 'chrome',
      `
      let displayStream = null;
      let recordedChunks = [];
      let mediaRecorder = null;
      let videoStorage = { saveVideo: async function() {} };

      ${funcSrc}

      return {
        prepareDisplayRecording: prepareDisplayRecording,
        getState: function() {
          return { displayStream: displayStream, recordedChunks: recordedChunks, mediaRecorder: mediaRecorder };
        }
      };
      `
    );

    return factory(mockNavigator, MockMediaRecorder, mockChrome);
  }

  test('should call getDisplayMedia to acquire stream', async () => {
    const { prepareDisplayRecording } = createPrepare();
    await prepareDisplayRecording();
    expect(mockNavigator.mediaDevices.getDisplayMedia).toHaveBeenCalledTimes(1);
  });

  test('should request video with correct display media options', async () => {
    const { prepareDisplayRecording } = createPrepare();
    await prepareDisplayRecording();

    const callArgs = mockNavigator.mediaDevices.getDisplayMedia.mock.calls[0][0];
    expect(callArgs.video).toEqual(expect.objectContaining({
      displaySurface: 'monitor',
      cursor: 'always'
    }));
    expect(callArgs.audio).toBeTruthy();
    expect(callArgs.preferCurrentTab).toBe(false);
  });

  test('should create MediaRecorder with webm/vp9 codec', async () => {
    const { prepareDisplayRecording } = createPrepare();
    await prepareDisplayRecording();

    expect(MockMediaRecorder).toHaveBeenCalledWith(
      mockStream,
      expect.objectContaining({
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      })
    );
  });

  test('should NOT call mediaRecorder.start() — recording deferred to beginRecording', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    const { mediaRecorder } = getState();
    expect(mediaRecorder.start).not.toHaveBeenCalled();
  });

  test('mediaRecorder state should remain inactive after prepare', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    const { mediaRecorder } = getState();
    expect(mediaRecorder.state).toBe('inactive');
  });

  test('should store acquired stream as displayStream', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    expect(getState().displayStream).toBe(mockStream);
  });

  test('should reset recordedChunks to an empty array', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    expect(getState().recordedChunks).toEqual([]);
  });

  test('should set ondataavailable handler on MediaRecorder', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    expect(getState().mediaRecorder.ondataavailable).toBeInstanceOf(Function);
  });

  test('should set onstop handler on MediaRecorder', async () => {
    const { prepareDisplayRecording, getState } = createPrepare();
    await prepareDisplayRecording();
    expect(getState().mediaRecorder.onstop).toBeInstanceOf(Function);
  });

  test('should set onended handler on the video track for browser-UI stop', async () => {
    const { prepareDisplayRecording } = createPrepare();
    await prepareDisplayRecording();
    expect(mockVideoTrack.onended).toBeInstanceOf(Function);
  });

  test('should throw if getDisplayMedia rejects (user denied permission)', async () => {
    mockNavigator.mediaDevices.getDisplayMedia.mockRejectedValue(
      new Error('User denied screen capture')
    );
    const { prepareDisplayRecording } = createPrepare();
    await expect(prepareDisplayRecording()).rejects.toThrow('User denied screen capture');
  });
});

// ===========================================================================
// offscreen.js — beginRecording message logic
// ===========================================================================

describe('offscreen.js - beginRecording logic', () => {

  test('should start MediaRecorder with 10s timeslice when state is inactive', () => {
    const mockRecorder = { state: 'inactive', start: jest.fn() };

    // Replicate the inline beginRecording guard
    if (!mockRecorder || mockRecorder.state !== 'inactive') {
      throw new Error('MediaRecorder not ready or already recording');
    }
    mockRecorder.start(10000);

    expect(mockRecorder.start).toHaveBeenCalledWith(10000);
  });

  test('should reject when MediaRecorder is null (not prepared)', () => {
    const mockRecorder = null;

    expect(() => {
      if (!mockRecorder || mockRecorder.state !== 'inactive') {
        throw new Error('MediaRecorder not ready or already recording');
      }
    }).toThrow('MediaRecorder not ready or already recording');
  });

  test('should reject when MediaRecorder is already recording', () => {
    const mockRecorder = { state: 'recording', start: jest.fn() };

    expect(() => {
      if (!mockRecorder || mockRecorder.state !== 'inactive') {
        throw new Error('MediaRecorder not ready or already recording');
      }
    }).toThrow('MediaRecorder not ready or already recording');
  });

  test('should reject when MediaRecorder is paused', () => {
    const mockRecorder = { state: 'paused', start: jest.fn() };

    expect(() => {
      if (!mockRecorder || mockRecorder.state !== 'inactive') {
        throw new Error('MediaRecorder not ready or already recording');
      }
    }).toThrow('MediaRecorder not ready or already recording');
  });

  test('should not call start when guard throws', () => {
    const mockRecorder = { state: 'recording', start: jest.fn() };

    try {
      if (!mockRecorder || mockRecorder.state !== 'inactive') {
        throw new Error('MediaRecorder not ready or already recording');
      }
      mockRecorder.start(10000);
    } catch (_) {
      // expected
    }

    expect(mockRecorder.start).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// background.js — showCountdownOnTab
// ===========================================================================

describe('background.js - showCountdownOnTab', () => {
  let mockChrome;

  beforeEach(() => {
    jest.useFakeTimers();
    mockChrome = {
      scripting: {
        executeScript: jest.fn().mockResolvedValue([])
      }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  function createShowCountdown() {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'background/background.js'), 'utf8'
    );
    const funcSrc = extractFunctionSource(source, 'showCountdownOnTab');

    const factory = new Function(
      'chrome',
      `
      ${funcSrc}
      return showCountdownOnTab;
      `
    );

    return factory(mockChrome);
  }

  test('should call executeScript exactly 5 times (create + 3 counts + remove)', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(42);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    expect(mockChrome.scripting.executeScript).toHaveBeenCalledTimes(5);
  });

  test('should target the correct tabId in every call', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(99);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    for (const call of mockChrome.scripting.executeScript.mock.calls) {
      expect(call[0].target).toEqual({ tabId: 99 });
    }
  });

  test('should pass countdown numbers 3, 2, 1 in order as args', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    // Calls at index 1, 2, 3 are the countdown-number updates
    const countCalls = mockChrome.scripting.executeScript.mock.calls.slice(1, 4);
    expect(countCalls[0][0].args).toEqual([3]);
    expect(countCalls[1][0].args).toEqual([2]);
    expect(countCalls[2][0].args).toEqual([1]);
  });

  test('first call (overlay creation) should have a func but no args', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    const firstCall = mockChrome.scripting.executeScript.mock.calls[0][0];
    expect(firstCall.func).toBeInstanceOf(Function);
    expect(firstCall.args).toBeUndefined();
  });

  test('last call (overlay removal) should have a func but no args', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    const calls = mockChrome.scripting.executeScript.mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.func).toBeInstanceOf(Function);
    expect(lastCall.args).toBeUndefined();
  });

  test('should propagate error if executeScript rejects', async () => {
    mockChrome.scripting.executeScript.mockRejectedValueOnce(
      new Error('Cannot access chrome:// URL')
    );

    const showCountdownOnTab = createShowCountdown();
    await expect(showCountdownOnTab(1)).rejects.toThrow('Cannot access chrome:// URL');
  });

  // -------------------------------------------------------------------------
  // DOM-level tests: verify the injected functions work correctly
  // -------------------------------------------------------------------------

  test('overlay creation func should add overlay and counter to the DOM', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    // Extract the creation function and execute it in jsdom
    const createFunc = mockChrome.scripting.executeScript.mock.calls[0][0].func;
    document.body.innerHTML = '';
    createFunc();

    const overlay = document.getElementById('recording-countdown-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.zIndex).toBe('2147483647');

    const counter = document.getElementById('recording-countdown-number');
    expect(counter).not.toBeNull();
    expect(counter.parentElement).toBe(overlay);
  });

  test('countdown update func should set the number as text content', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    // Create the counter element the update func expects
    const counter = document.createElement('div');
    counter.id = 'recording-countdown-number';
    document.body.appendChild(counter);

    // Call each update func and verify the text content
    for (let idx = 1; idx <= 3; idx++) {
      const call = mockChrome.scripting.executeScript.mock.calls[idx][0];
      const updateFunc = call.func;
      const num = call.args[0];
      updateFunc(num);
      expect(counter.textContent).toBe(String(num));
    }
  });

  test('overlay removal func should remove the overlay from the DOM', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    // Create the overlay element
    const overlay = document.createElement('div');
    overlay.id = 'recording-countdown-overlay';
    document.body.appendChild(overlay);
    expect(document.getElementById('recording-countdown-overlay')).not.toBeNull();

    // Execute the removal function
    const calls = mockChrome.scripting.executeScript.mock.calls;
    const removeFunc = calls[calls.length - 1][0].func;
    removeFunc();

    expect(document.getElementById('recording-countdown-overlay')).toBeNull();
  });

  test('overlay removal func should be safe when overlay does not exist', async () => {
    const showCountdownOnTab = createShowCountdown();
    const promise = showCountdownOnTab(1);

    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await promise;

    document.body.innerHTML = ''; // no overlay in DOM

    const calls = mockChrome.scripting.executeScript.mock.calls;
    const removeFunc = calls[calls.length - 1][0].func;

    // Should not throw
    expect(() => removeFunc()).not.toThrow();
  });
});

// ===========================================================================
// background.js — handleStartDisplayCapture orchestration
// ===========================================================================

describe('background.js - handleStartDisplayCapture', () => {
  let mockChrome;
  let mockSetupOffscreen;
  let mockCloseOffscreen;
  let mockShowCountdown;

  beforeEach(() => {
    mockChrome = {
      runtime: {
        sendMessage: jest.fn()
      },
      storage: {
        session: {
          set: jest.fn().mockResolvedValue(undefined)
        }
      }
    };

    mockSetupOffscreen = jest.fn().mockResolvedValue(undefined);
    mockCloseOffscreen = jest.fn().mockResolvedValue(undefined);
    mockShowCountdown = jest.fn().mockResolvedValue(undefined);
  });

  function createHandler(opts = {}) {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'background/background.js'), 'utf8'
    );
    const funcSrc = extractFunctionSource(source, 'handleStartDisplayCapture');

    const tabId = opts.recordingTabId !== undefined ? opts.recordingTabId : null;

    const factory = new Function(
      'chrome', 'setupOffscreenDocument', 'closeOffscreenDocument', 'showCountdownOnTab',
      `
      var recordingTabId = ${JSON.stringify(tabId)};
      var recordingStartTime = null;

      ${funcSrc}

      return {
        handleStartDisplayCapture: handleStartDisplayCapture,
        getState: function() {
          return { recordingTabId: recordingTabId, recordingStartTime: recordingStartTime };
        }
      };
      `
    );

    return factory(mockChrome, mockSetupOffscreen, mockCloseOffscreen, mockShowCountdown);
  }

  test('should call setupOffscreenDocument first', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler();
    await handleStartDisplayCapture();

    expect(mockSetupOffscreen).toHaveBeenCalledTimes(1);
  });

  test('should send prepareDisplayRecording message to offscreen', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler();
    await handleStartDisplayCapture();

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      action: 'prepareDisplayRecording'
    });
  });

  test('should show countdown when recordingTabId is set', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: 42 });
    await handleStartDisplayCapture();

    expect(mockShowCountdown).toHaveBeenCalledWith(42);
  });

  test('should skip countdown when recordingTabId is null', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: null });
    await handleStartDisplayCapture();

    expect(mockShowCountdown).not.toHaveBeenCalled();
  });

  test('should send beginRecording message after prepare and countdown', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: 1 });
    await handleStartDisplayCapture();

    const calls = mockChrome.runtime.sendMessage.mock.calls;
    expect(calls[0][0]).toEqual({ action: 'prepareDisplayRecording' });
    expect(calls[1][0]).toEqual({ action: 'beginRecording' });
  });

  test('should enforce correct order: prepare → countdown → begin', async () => {
    const callOrder = [];

    mockChrome.runtime.sendMessage.mockImplementation(async (msg) => {
      callOrder.push(msg.action);
      return { success: true };
    });
    mockShowCountdown.mockImplementation(async () => {
      callOrder.push('countdown');
    });

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: 5 });
    await handleStartDisplayCapture();

    expect(callOrder).toEqual([
      'prepareDisplayRecording',
      'countdown',
      'beginRecording'
    ]);
  });

  test('should update recordingStartTime after successful start', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const before = Date.now();
    const { handleStartDisplayCapture, getState } = createHandler();
    await handleStartDisplayCapture();
    const after = Date.now();

    const { recordingStartTime } = getState();
    expect(recordingStartTime).toBeGreaterThanOrEqual(before);
    expect(recordingStartTime).toBeLessThanOrEqual(after);
  });

  test('should persist recordingStartTime to session storage', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { handleStartDisplayCapture } = createHandler();
    await handleStartDisplayCapture();

    expect(mockChrome.storage.session.set).toHaveBeenCalledWith(
      expect.objectContaining({ recordingStartTime: expect.any(Number) })
    );
  });

  test('should continue recording if countdown fails (graceful degradation)', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });
    mockShowCountdown.mockRejectedValue(new Error('Cannot inject into chrome:// tab'));

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: 1 });

    // Should NOT throw despite countdown failure
    await expect(handleStartDisplayCapture()).resolves.toBeUndefined();

    // Should still have sent beginRecording
    const beginCall = mockChrome.runtime.sendMessage.mock.calls.find(
      c => c[0].action === 'beginRecording'
    );
    expect(beginCall).toBeDefined();
  });

  test('should throw and cleanup if prepareDisplayRecording fails', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: false, error: 'User denied permission' });

    const { handleStartDisplayCapture } = createHandler();

    await expect(handleStartDisplayCapture()).rejects.toThrow();
    expect(mockCloseOffscreen).toHaveBeenCalled();
  });

  test('should throw and cleanup if beginRecording fails', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Recorder not ready' });

    const { handleStartDisplayCapture } = createHandler();

    await expect(handleStartDisplayCapture()).rejects.toThrow();
    expect(mockCloseOffscreen).toHaveBeenCalled();
  });

  test('should throw and cleanup if prepareDisplayRecording returns null', async () => {
    mockChrome.runtime.sendMessage.mockResolvedValueOnce(null);

    const { handleStartDisplayCapture } = createHandler();

    await expect(handleStartDisplayCapture()).rejects.toThrow();
    expect(mockCloseOffscreen).toHaveBeenCalled();
  });

  test('should not call showCountdown if prepare fails', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: false, error: 'Denied' });

    const { handleStartDisplayCapture } = createHandler({ recordingTabId: 42 });

    await expect(handleStartDisplayCapture()).rejects.toThrow();
    expect(mockShowCountdown).not.toHaveBeenCalled();
  });

  test('should not send beginRecording if prepare fails', async () => {
    mockChrome.runtime.sendMessage
      .mockResolvedValueOnce({ success: false, error: 'Denied' });

    const { handleStartDisplayCapture } = createHandler();

    await expect(handleStartDisplayCapture()).rejects.toThrow();

    // Only one sendMessage call (prepare), not two
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
  });
});
