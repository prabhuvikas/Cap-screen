/**
 * Tests for page console capture (content/console-capture.js) and the reader
 * in content/content.js that fetches its buffer.
 *
 * Run with: npx jest tests/consoleCapture.test.js --verbose
 */

const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

// Pull readPageConsoleLogs out of content.js (the rest needs chrome.* APIs).
function loadReader() {
  const source = read('content/content.js');
  const start = source.indexOf('function readPageConsoleLogs(');
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) {
      return new Function(`${source.slice(start, i + 1)}; return readPageConsoleLogs;`)();
    }
  }
  throw new Error('readPageConsoleLogs not found');
}

describe('console capture', () => {
  const originals = {};
  let readPageConsoleLogs;
  let passedThrough;

  beforeAll(() => {
    // Stand-in console so the test output stays clean and calls are observable.
    passedThrough = [];
    ['error', 'warn', 'info', 'log'].forEach((method) => {
      originals[method] = console[method];
      console[method] = (...args) => passedThrough.push([method, ...args]);
    });

    const capture = read('content/console-capture.js');
    new Function(capture)();
    new Function(capture)(); // second injection must be a no-op
    readPageConsoleLogs = loadReader();
  });

  afterAll(() => {
    Object.assign(console, originals);
  });

  test('returns an empty list before anything is logged', () => {
    expect(readPageConsoleLogs()).toEqual([]);
  });

  test('records console calls in order and still calls the original console', () => {
    console.error('Payment failed', { code: 42 });
    console.log('rendered');

    const logs = readPageConsoleLogs();
    expect(logs.map((l) => [l.type, l.message])).toEqual([
      ['error', 'Payment failed {code: 42}'],
      ['log', 'rendered']
    ]);
    expect(logs[0].timestamp).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(logs[0].url).toBe(window.location.href);
    expect(logs[0].stack).toBeTruthy();
    expect(logs[0]).not.toHaveProperty('seq');

    // Captured once even though the script was injected twice.
    expect(passedThrough.filter(([m, msg]) => m === 'error' && msg === 'Payment failed')).toHaveLength(1);
  });

  test('keeps the stack of a logged Error', () => {
    const error = new TypeError('x is undefined');
    console.error(error);

    const last = readPageConsoleLogs().pop();
    expect(last.message).toBe('TypeError: x is undefined');
    expect(last.stack).toBe(error.stack);
  });

  test('records uncaught errors', () => {
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'ReferenceError: foo is not defined',
      filename: 'https://app.example/app.js',
      lineno: 10,
      colno: 5,
      error: new ReferenceError('foo is not defined')
    }));

    const last = readPageConsoleLogs().pop();
    expect(last.type).toBe('error');
    expect(last.message).toBe('Uncaught ReferenceError: foo is not defined at https://app.example/app.js:10:5');
    expect(last.stack).toContain('ReferenceError');
  });

  test('does not repeat "Uncaught" when the browser message already has it', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Uncaught TypeError: x is not a function' }));
    expect(readPageConsoleLogs().pop().message).toBe('Uncaught TypeError: x is not a function');
  });

  test('records unhandled promise rejections', () => {
    const event = new Event('unhandledrejection');
    event.reason = new Error('request timed out');
    window.dispatchEvent(event);

    const last = readPageConsoleLogs().pop();
    expect(last.message).toBe('Unhandled Promise Rejection: Error: request timed out');
  });

  test('describes large and circular objects without serializing them whole', () => {
    const big = {};
    for (let i = 0; i < 50; i++) big[`k${i}`] = i;
    const circular = { name: 'node' };
    circular.self = circular;

    console.log(big, circular, [1, 2, 3], document.createElement('button'));

    const message = readPageConsoleLogs().pop().message;
    expect(message).toContain('k19: 19, …30 more}');
    expect(message).toContain('{name: node, self: {name: node, self: [Object]}}');
    expect(message).toContain('[1, 2, 3]');
    expect(message).toContain('<button>');
  });

  test('keeps errors when chatty logging overflows its buffer', () => {
    console.error('the important one');
    for (let i = 0; i < 500; i++) console.log(`noise ${i}`);

    const logs = readPageConsoleLogs();
    expect(logs.filter((l) => l.type === 'log')).toHaveLength(200);
    expect(logs.some((l) => l.message === 'the important one')).toBe(true);
    expect(logs[logs.length - 1].message).toBe('noise 499');
  });

  test('truncates very long messages', () => {
    console.warn('x'.repeat(20000));
    expect(readPageConsoleLogs().pop().message.length).toBeLessThan(5100);
  });

  test('a logging failure never breaks the page', () => {
    const hostile = new Proxy({}, { ownKeys() { throw new Error('nope'); } });
    expect(() => console.log(hostile)).not.toThrow();
    expect(readPageConsoleLogs().pop().message).toBe('[Unreadable value]');
  });
});
