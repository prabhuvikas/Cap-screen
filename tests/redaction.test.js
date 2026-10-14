/**
 * Tests for secret redaction (lib/redaction.js)
 *
 * Verifies that tokens, cookies, passwords and auth headers are masked in
 * URLs, free text, header lists and nested objects before captured data is
 * attached to an issue or sent to the AI assistant.
 *
 * Run with: npx jest tests/redaction.test.js --verbose
 */

const Redaction = require('../lib/redaction.js');

const MASK = Redaction.MASK;

describe('Redaction', () => {
  describe('redactUrl', () => {
    test('masks secret query parameters and keeps the rest', () => {
      expect(Redaction.redactUrl('https://app.example.com/cb?code=abc&page=2&access_token=xyz'))
        .toBe(`https://app.example.com/cb?code=${MASK}&page=2&access_token=${MASK}`);
    });

    test('masks tokens in the fragment and keeps the fragment', () => {
      expect(Redaction.redactUrl('https://app.example.com/#id_token=abc&state=1'))
        .toBe(`https://app.example.com/#id_token=${MASK}&state=1`);
    });

    test('drops user:password credentials', () => {
      expect(Redaction.redactUrl('https://user:pw@example.com/path')).toBe('https://example.com/path');
    });

    test('leaves URLs without secrets untouched', () => {
      const url = 'https://example.com/orders?id=42&sort=desc#details';
      expect(Redaction.redactUrl(url)).toBe(url);
    });

    test('handles empty and non-string input', () => {
      expect(Redaction.redactUrl('')).toBe('');
      expect(Redaction.redactUrl(null)).toBe(null);
    });
  });

  describe('redactText', () => {
    test('masks bearer tokens, JWTs and secret=value pairs', () => {
      const text = 'Authorization: Bearer abcdefghijkl123 failed; token=55; got eyJhbGciOi.eyJzdWIiOi.c2ln';
      const out = Redaction.redactText(text);
      expect(out).not.toContain('abcdefghijkl123');
      expect(out).not.toContain('eyJhbGciOi');
      expect(out).toContain(`token=${MASK}`);
    });

    test('masks secrets in JSON-like log messages', () => {
      expect(Redaction.redactText('{"password": "hunter2", "user": "bob"}'))
        .toBe(`{"password": "${MASK}", "user": "bob"}`);
    });

    test('masks secret parameters in URLs inside text', () => {
      expect(Redaction.redactText('GET https://api.example.com/x?api_key=k1&q=1 failed'))
        .toBe(`GET https://api.example.com/x?api_key=${MASK}&q=1 failed`);
    });

    test('does not mask words that only look similar', () => {
      const text = 'author=bob sidebar=open';
      expect(Redaction.redactText(text)).toBe(text);
    });
  });

  describe('redactHeaders', () => {
    test('masks credential headers and keeps the rest', () => {
      expect(Redaction.redactHeaders([
        { name: 'Set-Cookie', value: 'sid=1' },
        { name: 'X-Auth-Token', value: 't' },
        { name: 'Content-Type', value: 'application/json' }
      ])).toEqual([
        { name: 'Set-Cookie', value: MASK },
        { name: 'X-Auth-Token', value: MASK },
        { name: 'Content-Type', value: 'application/json' }
      ]);
    });
  });

  describe('redactObject', () => {
    test('masks secret keys, cookies and header lists in nested data', () => {
      const out = Redaction.redactObject({
        url: 'https://a.example.com/?session_id=1',
        author: 'bob',
        storage: { cookies: 'a=b', localStorage: { authToken: 't', theme: 'dark' } },
        responseHeaders: [{ name: 'set-cookie', value: 'x' }],
        log: { entries: [{ request: { headers: [{ name: 'Authorization', value: 'Basic abc' }] } }] }
      });
      expect(out.url).toBe(`https://a.example.com/?session_id=${MASK}`);
      expect(out.author).toBe('bob');
      expect(out.storage.cookies).toBe(MASK);
      expect(out.storage.localStorage).toEqual({ authToken: MASK, theme: 'dark' });
      expect(out.responseHeaders[0].value).toBe(MASK);
      expect(out.log.entries[0].request.headers[0].value).toBe(MASK);
    });

    test('does not modify the input', () => {
      const input = { token: 'secret' };
      Redaction.redactObject(input);
      expect(input.token).toBe('secret');
    });

    test('drops circular references instead of throwing', () => {
      const page = { title: 'x' };
      page.self = page;
      page.all = [page];
      const out = Redaction.redactObject(page);
      expect(() => JSON.stringify(out)).not.toThrow();
      expect(out.title).toBe('x');
    });

    test('keeps shared (non-circular) references', () => {
      const shared = { a: 1 };
      expect(Redaction.redactObject({ x: shared, y: shared })).toEqual({ x: { a: 1 }, y: { a: 1 } });
    });
  });
});

describe('RedmineAPI.describeError', () => {
  const RedmineAPI = require('../lib/redmine-api.js');

  test('lists Redmine validation errors', () => {
    const msg = RedmineAPI.describeError(422, JSON.stringify({ errors: ['Assignee is invalid', 'Due date cannot be blank'] }));
    expect(msg).toBe('Redmine rejected the issue:\n- Assignee is invalid\n- Due date cannot be blank (HTTP 422)');
  });

  test('explains authentication failures', () => {
    expect(RedmineAPI.describeError(401, '')).toContain('Check the Redmine API key');
  });

  test('does not dump HTML error pages', () => {
    const msg = RedmineAPI.describeError(502, '<html><body>Bad gateway</body></html>');
    expect(msg).not.toContain('<html>');
    expect(msg).toContain('HTTP 502');
  });

  test('truncates long plain-text bodies', () => {
    expect(RedmineAPI.describeError(400, 'x'.repeat(1000)).length).toBeLessThan(400);
  });
});
