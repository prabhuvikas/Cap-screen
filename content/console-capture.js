// Page console capture (runs in the page's MAIN world)
//
// Content scripts normally run in an isolated world, where patching `console`
// only sees the extension's own logging. This script runs in the page's own
// world from document_start, so it records the page's console calls, uncaught
// errors and unhandled promise rejections. Entries stay in this page's memory
// (bounded) until content/content.js asks for them via a DOM event; nothing is
// sent anywhere unless the user files a report with console logs enabled.

(() => {
  const INSTALLED = Symbol.for('credIssueReporter.consoleCapture');
  if (window[INSTALLED]) return;
  Object.defineProperty(window, INSTALLED, { value: true });

  const REQUEST_EVENT = 'cred-issue-reporter:get-console-logs';
  const RESPONSE_EVENT = 'cred-issue-reporter:console-logs';

  // Errors and warnings get their own buffer so chatty console.log output
  // can't push them out.
  const MAX_PROBLEMS = 300;
  const MAX_OTHER = 200;
  const MAX_MESSAGE_LENGTH = 5000;
  const MAX_STACK_LENGTH = 4000;

  const problems = [];
  const other = [];
  let sequence = 0;

  function record(entry) {
    entry.seq = sequence++;
    entry.timestamp = new Date().toISOString();
    entry.url = location.href;
    const buffer = entry.type === 'error' || entry.type === 'warn' ? problems : other;
    buffer.push(entry);
    if (buffer.length > (buffer === problems ? MAX_PROBLEMS : MAX_OTHER)) buffer.shift();
  }

  function clip(text, max) {
    return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
  }

  // Cheap, bounded description of a logged value. Never serializes a whole
  // object graph, so logging large objects on a busy page stays fast.
  function describe(value, depth = 0) {
    if (value === null) return 'null';
    const type = typeof value;
    if (type === 'string') return value;
    if (type === 'number' || type === 'boolean' || type === 'bigint' || type === 'undefined') return String(value);
    if (type === 'symbol') return value.toString();
    if (type === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (value instanceof Error) return `${value.name}: ${value.message}`;

    try {
      if (typeof Node !== 'undefined' && value instanceof Node) {
        return value.nodeType === 1
          ? `<${value.nodeName.toLowerCase()}${value.id ? `#${value.id}` : ''}>`
          : `[${value.nodeName}]`;
      }
      if (depth >= 2) return Array.isArray(value) ? `[Array(${value.length})]` : '[Object]';

      if (Array.isArray(value)) {
        const items = value.slice(0, 20).map((item) => describe(item, depth + 1));
        if (value.length > 20) items.push(`…${value.length - 20} more`);
        return `[${items.join(', ')}]`;
      }

      const keys = Object.keys(value);
      const parts = keys.slice(0, 20).map((key) => `${key}: ${describe(value[key], depth + 1)}`);
      if (keys.length > 20) parts.push(`…${keys.length - 20} more`);
      const name = value.constructor && value.constructor.name !== 'Object' ? `${value.constructor.name} ` : '';
      return `${name}{${parts.join(', ')}}`;
    } catch (e) {
      // Getters that throw, cross-origin objects, revoked proxies…
      return '[Unreadable value]';
    }
  }

  ['error', 'warn', 'info', 'log'].forEach((method) => {
    const original = console[method];
    if (typeof original !== 'function') return;

    console[method] = function (...args) {
      try {
        const entry = {
          type: method,
          message: clip(args.map((arg) => describe(arg)).join(' '), MAX_MESSAGE_LENGTH)
        };
        const error = args.find((arg) => arg instanceof Error);
        if (error && error.stack) {
          entry.stack = clip(String(error.stack), MAX_STACK_LENGTH);
        } else if (method === 'error' || method === 'warn') {
          // Where the page called console.error/warn from (drop this wrapper's frame).
          const stack = new Error().stack;
          if (stack) entry.stack = clip(stack.split('\n').slice(2).join('\n'), MAX_STACK_LENGTH);
        }
        record(entry);
      } catch (e) {
        // Capturing must never break the page's logging.
      }
      return original.apply(this, args);
    };
  });

  window.addEventListener('error', (event) => {
    try {
      const where = event.filename ? ` at ${event.filename}:${event.lineno}:${event.colno}` : '';
      // Chrome's message already reads "Uncaught ReferenceError: …".
      const text = event.message || 'error';
      record({
        type: 'error',
        message: clip(`${/^Uncaught\b/.test(text) ? '' : 'Uncaught '}${text}${where}`, MAX_MESSAGE_LENGTH),
        stack: event.error && event.error.stack ? clip(String(event.error.stack), MAX_STACK_LENGTH) : undefined
      });
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    try {
      const reason = event.reason;
      record({
        type: 'error',
        message: clip(`Unhandled Promise Rejection: ${describe(reason)}`, MAX_MESSAGE_LENGTH),
        stack: reason instanceof Error && reason.stack ? clip(String(reason.stack), MAX_STACK_LENGTH) : undefined
      });
    } catch (e) {
      // ignore
    }
  });

  // content/content.js (isolated world) asks for the logs; objects don't cross
  // worlds, so the answer is a JSON string. Both events dispatch synchronously.
  document.addEventListener(REQUEST_EVENT, () => {
    const logs = problems.concat(other).sort((a, b) => a.seq - b.seq);
    document.dispatchEvent(new CustomEvent(RESPONSE_EVENT, { detail: JSON.stringify(logs) }));
  });
})();
