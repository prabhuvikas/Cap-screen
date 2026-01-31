/**
 * Tests for buildDescription() - Additional Information section
 *
 * Verifies that the "Additional Information" section is only included
 * in the issue description when actual data (network requests, console
 * logs, video, multi-tab capture) is attached.
 *
 * Run with: npx jest tests/buildDescription.test.js --verbose
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Helpers: extract function source from a file and build a callable wrapper
// ---------------------------------------------------------------------------

/**
 * Extract a named function declaration from source code by brace-matching.
 */
function extractFunctionSource(source, functionName) {
  const funcStart = source.indexOf(`function ${functionName}(`);
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

/**
 * Create a callable buildDescription function with injected globals.
 *
 * @param {string} sourceFile - relative path from repo root (e.g. 'annotate/annotate.js')
 * @param {object} globals    - overrides for global variables the function reads
 * @returns {Function} buildDescription bound to the supplied globals
 */
function createBuildDescription(sourceFile, globals) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', sourceFile),
    'utf8'
  );

  const sanitizeTextSrc = extractFunctionSource(source, 'sanitizeText');
  const buildDescriptionSrc = extractFunctionSource(source, 'buildDescription');

  const {
    settings = {},
    pageInfo = { url: 'https://example.com', title: 'Test Page' },
    networkRequests = [],
    consoleLogs = [],
    videoDataUrl = null,
    screenshots = [],
    currentTab = { url: 'https://example.com', title: 'Test Page' },
  } = globals;

  // Build the function body inside new Function() so the extracted functions
  // close over the parameter names that match the globals they reference.
  const factory = new Function(
    'document', 'Date', 'Set', 'String',
    'settings', 'pageInfo', 'networkRequests', 'consoleLogs',
    'videoDataUrl', 'screenshots', 'currentTab',
    `
    ${sanitizeTextSrc}
    ${buildDescriptionSrc}
    return buildDescription;
    `
  );

  return factory(
    document, Date, Set, String,
    settings, pageInfo, networkRequests, consoleLogs,
    videoDataUrl, screenshots, currentTab
  );
}

// ---------------------------------------------------------------------------
// Test suites – one per source file
// ---------------------------------------------------------------------------

describe.each([
  ['annotate/annotate.js'],
  ['popup/popup.js'],
])('buildDescription in %s', (sourceFile) => {

  beforeEach(() => {
    // Minimal DOM elements required by buildDescription
    document.body.innerHTML = `
      <input  id="description" value="Bug description" />
      <textarea id="stepsToReproduce"></textarea>
      <textarea id="expectedBehavior"></textarea>
      <textarea id="actualBehavior"></textarea>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // -----------------------------------------------------------------------
  // Core fix: section must be absent when no additional data exists
  // -----------------------------------------------------------------------

  test('should NOT include Additional Information when no data is attached', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: false, includeConsoleLogs: false },
      networkRequests: [],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).not.toContain('## Additional Information');
    expect(result).not.toContain('technical-data.json');
  });

  test('should NOT include Additional Information when settings are enabled but arrays are empty', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: true, includeConsoleLogs: true },
      networkRequests: [],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).not.toContain('## Additional Information');
    expect(result).not.toContain('technical-data.json');
  });

  test('should NOT include Additional Information when arrays have data but settings are disabled', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: false, includeConsoleLogs: false },
      networkRequests: [{ url: 'https://api.example.com', method: 'GET' }],
      consoleLogs: [{ message: 'test log' }],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).not.toContain('## Additional Information');
    expect(result).not.toContain('technical-data.json');
  });

  // -----------------------------------------------------------------------
  // Section must appear when there IS additional data
  // -----------------------------------------------------------------------

  test('should include Additional Information when network requests are present and enabled', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: true, includeConsoleLogs: false },
      networkRequests: [
        { url: 'https://api.example.com/data', method: 'GET' },
        { url: 'https://api.example.com/submit', method: 'POST' },
      ],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('## Additional Information');
    expect(result).toContain('technical-data.json');
    expect(result).toContain('Network requests (2 captured)');
    expect(result).toContain('HAR file');
  });

  test('should include Additional Information when console logs are present and enabled', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: false, includeConsoleLogs: true },
      networkRequests: [],
      consoleLogs: [
        { message: 'error 1' },
        { message: 'error 2' },
        { message: 'error 3' },
      ],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('## Additional Information');
    expect(result).toContain('technical-data.json');
    expect(result).toContain('Console logs (3 entries)');
    expect(result).toContain('console logs file');
  });

  test('should include Additional Information when video is attached', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: false, includeConsoleLogs: false },
      networkRequests: [],
      consoleLogs: [],
      videoDataUrl: 'data:video/webm;base64,mockVideoData',
    });

    const result = buildDescription();

    expect(result).toContain('## Additional Information');
    expect(result).toContain('Video recording of the issue is attached');
  });

  test('should include Additional Information when both network requests and console logs exist', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: true, includeConsoleLogs: true },
      networkRequests: [{ url: 'https://api.example.com', method: 'GET' }],
      consoleLogs: [{ message: 'log entry' }],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('## Additional Information');
    expect(result).toContain('Network requests (1 captured)');
    expect(result).toContain('Console logs (1 entries)');
  });

  test('should include multi-tab note when network requests have _tabId', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: { includeNetworkRequests: true, includeConsoleLogs: false },
      networkRequests: [
        { url: 'https://a.com', method: 'GET', _tabId: 1 },
        { url: 'https://b.com', method: 'GET', _tabId: 2 },
      ],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('## Additional Information');
    expect(result).toContain('Data captured from 2 tab(s)');
  });

  // -----------------------------------------------------------------------
  // Page Information should always be present
  // -----------------------------------------------------------------------

  test('should always include Page Information regardless of additional data', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: {},
      networkRequests: [],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('## Page Information');
    expect(result).toContain('https://example.com');
  });

  // -----------------------------------------------------------------------
  // Description content should always be present
  // -----------------------------------------------------------------------

  test('should include the user-provided description text', () => {
    const buildDescription = createBuildDescription(sourceFile, {
      settings: {},
      networkRequests: [],
      consoleLogs: [],
      videoDataUrl: null,
    });

    const result = buildDescription();

    expect(result).toContain('Bug description');
  });
});
