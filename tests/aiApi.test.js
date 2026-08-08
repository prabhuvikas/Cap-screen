/**
 * Tests for the AIAssistant client (lib/ai-api.js)
 *
 * Verifies configuration checks, request shaping, response parsing,
 * JSON extraction, and bug-report generation against a mocked fetch.
 *
 * Run with: npx jest tests/aiApi.test.js --verbose
 */

const AIAssistant = require('../lib/ai-api.js');

function mockChatResponse(content, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    text: () =>
      Promise.resolve(
        JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] })
      )
  });
}

describe('AIAssistant', () => {
  afterEach(() => {
    delete global.fetch;
  });

  describe('isConfigured', () => {
    test('returns false when endpoint or key is missing', () => {
      expect(new AIAssistant({}).isConfigured()).toBe(false);
      expect(new AIAssistant({ endpoint: 'https://x/v1' }).isConfigured()).toBe(false);
      expect(new AIAssistant({ apiKey: 'k' }).isConfigured()).toBe(false);
    });

    test('returns true when endpoint and key are present', () => {
      expect(
        new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' }).isConfigured()
      ).toBe(true);
    });

    test('defaults the model when not provided', () => {
      expect(new AIAssistant({ endpoint: 'x', apiKey: 'k' }).model).toBe('gpt-4o-mini');
    });
  });

  describe('chat', () => {
    test('throws when not configured', async () => {
      await expect(new AIAssistant({}).chat([])).rejects.toThrow(/required/i);
    });

    test('sends model, messages and Bearer auth header', async () => {
      global.fetch = jest.fn(() => mockChatResponse('hello'));

      const ai = new AIAssistant({
        endpoint: 'https://api.example.com/v1/chat/completions',
        apiKey: 'secret-key',
        model: 'my-model'
      });

      const reply = await ai.chat([{ role: 'user', content: 'hi' }]);

      expect(reply).toBe('hello');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('https://api.example.com/v1/chat/completions');
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer secret-key');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('my-model');
      expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    });

    test('surfaces API error messages', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: () => Promise.resolve(JSON.stringify({ error: { message: 'bad key' } }))
        })
      );

      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      await expect(ai.chat([{ role: 'user', content: 'hi' }])).rejects.toThrow(/bad key/);
    });
  });

  describe('extractJson', () => {
    test('parses raw JSON', () => {
      expect(AIAssistant.extractJson('{"a":1}')).toEqual({ a: 1 });
    });

    test('parses JSON inside a fenced code block', () => {
      const reply = 'Here you go:\n```json\n{"subject":"x"}\n```\nThanks';
      expect(AIAssistant.extractJson(reply)).toEqual({ subject: 'x' });
    });

    test('parses JSON embedded in prose', () => {
      const reply = 'Sure! {"subject":"y","description":"z"} done';
      expect(AIAssistant.extractJson(reply)).toEqual({ subject: 'y', description: 'z' });
    });

    test('returns null for non-JSON', () => {
      expect(AIAssistant.extractJson('no json here')).toBeNull();
      expect(AIAssistant.extractJson('')).toBeNull();
    });
  });

  describe('generateBugReport', () => {
    test('returns normalized fields from the model reply', async () => {
      const aiJson = JSON.stringify({
        subject: 'Login button unresponsive',
        description: 'Clicking login does nothing.',
        stepsToReproduce: '1. Open page\n2. Click login',
        expectedBehavior: 'User is logged in',
        actualBehavior: 'Nothing happens'
      });
      global.fetch = jest.fn(() => mockChatResponse('```json\n' + aiJson + '\n```'));

      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      const report = await ai.generateBugReport({
        description: 'login broken',
        pageInfo: { url: 'https://app.test/login', title: 'Login' },
        consoleErrors: [{ level: 'error', message: 'TypeError: x is undefined' }],
        networkErrors: [{ method: 'POST', url: '/api/login', statusCode: 500 }]
      });

      expect(report.subject).toBe('Login button unresponsive');
      expect(report.description).toBe('Clicking login does nothing.');
      expect(report.stepsToReproduce).toContain('Click login');
      expect(report.expectedBehavior).toBe('User is logged in');
      expect(report.actualBehavior).toBe('Nothing happens');

      // Ensure the captured context was forwarded into the prompt
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      const userMessage = body.messages.find((m) => m.role === 'user').content;
      expect(userMessage).toContain('https://app.test/login');
      expect(userMessage).toContain('TypeError');
      expect(userMessage).toContain('/api/login');
    });

    test('supports short-key aliases (steps/expected/actual)', async () => {
      const aiJson = JSON.stringify({
        subject: 's',
        description: 'd',
        steps: 'do it',
        expected: 'good',
        actual: 'bad'
      });
      global.fetch = jest.fn(() => mockChatResponse(aiJson));

      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      const report = await ai.generateBugReport({ description: 'x' });

      expect(report.stepsToReproduce).toBe('do it');
      expect(report.expectedBehavior).toBe('good');
      expect(report.actualBehavior).toBe('bad');
    });

    test('throws when the reply cannot be parsed as JSON', async () => {
      global.fetch = jest.fn(() => mockChatResponse('sorry, no idea'));
      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      await expect(ai.generateBugReport({ description: 'x' })).rejects.toThrow(/parse/i);
    });
  });

  describe('testConnection', () => {
    test('returns success with the trimmed reply', async () => {
      global.fetch = jest.fn(() => mockChatResponse('  OK  '));
      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      const result = await ai.testConnection();
      expect(result).toEqual({ success: true, message: 'OK' });
    });

    test('returns failure with the error message', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: () => Promise.resolve(JSON.stringify({ error: { message: 'nope' } }))
        })
      );
      const ai = new AIAssistant({ endpoint: 'https://x/v1', apiKey: 'k' });
      const result = await ai.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/nope/);
    });
  });
});
