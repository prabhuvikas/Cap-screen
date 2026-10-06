/**
 * Tests for the TypeSafe Jev (System One) mode of the AIAssistant client
 * (lib/ai-api.js), against a mocked fetch.
 *
 * Run with: npx jest tests/aiApiJev.test.js --verbose
 */

const AIAssistant = require('../lib/ai-api.js');

const JEV_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

function mockAnswers(answers, { ok = true, status = 200 } = {}) {
  return jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      text: () => Promise.resolve(JSON.stringify(ok ? { model: 'jev-1.13.0', answers } : { error: { message: 'bad key' } }))
    })
  );
}

function sentBody() {
  return JSON.parse(global.fetch.mock.calls[0][1].body);
}

describe('AIAssistant (Jev / System One)', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('detects System One endpoints and defaults the model to jev-latest', () => {
    const jev = new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' });
    expect(jev.isSystemOne()).toBe(true);
    expect(jev.model).toBe('jev-latest');

    const chat = new AIAssistant({ endpoint: 'https://api.openai.com/v1/chat/completions', apiKey: 'k' });
    expect(chat.isSystemOne()).toBe(false);
    expect(chat.model).toBe('gpt-4o-mini');
  });

  test('testConnection sends a noul question and reports success', async () => {
    global.fetch = mockAnswers({ ok: { type: 'noul', noul: 0.97 } });
    const result = await new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' }).testConnection();

    expect(result.success).toBe(true);
    expect(sentBody()).toEqual({
      model: 'jev-latest',
      state: 'ping',
      questions: { ok: { type: 'noul', instructions: expect.any(String) } }
    });
  });

  test('testConnection surfaces API errors', async () => {
    global.fetch = mockAnswers(null, { ok: false, status: 401 });
    const result = await new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' }).testConnection();
    expect(result).toEqual({ success: false, message: 'AI request failed: bad key' });
  });

  describe('generateBugReport', () => {
    test('classifies the tracker with a choice question and keeps the reporter text', async () => {
      global.fetch = mockAnswers({
        tracker: { type: 'choice', choice: 'Feature', probabilities: { Bug: 0.1, Feature: 0.9 }, confidence: 0.88 }
      });
      const ai = new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' });

      const report = await ai.generateBugReport({
        userView: 'Please add a dark mode toggle. It would help at night.',
        availableTrackers: ['Bug', 'Feature'],
        pageInfo: { url: 'https://app.example.com/settings' },
        images: ['data:image/png;base64,AAA']
      });

      const body = sentBody();
      expect(body.questions.tracker.type).toBe('choice');
      expect(Object.keys(body.questions.tracker.criteria)).toEqual(['Bug', 'Feature']);
      expect(body.state).toContain('Please add a dark mode toggle');
      expect(body.state).toContain('https://app.example.com/settings');
      expect(JSON.stringify(body)).not.toContain('data:image');

      expect(report).toEqual({
        tracker: 'Feature',
        trackerConfidence: 0.88,
        textGenerated: false,
        subject: 'Please add a dark mode toggle.',
        description: 'Please add a dark mode toggle. It would help at night.',
        stepsToReproduce: '',
        expectedBehavior: '',
        actualBehavior: ''
      });
    });

    test('prefers the reporter drafts and maps the choice case-insensitively', async () => {
      global.fetch = mockAnswers({ tracker: { type: 'choice', choice: 'bug', confidence: 0.7 } });
      const report = await new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' }).generateBugReport({
        subject: 'Save fails',
        description: 'Clicking save shows a 500',
        stepsToReproduce: '1. Click save',
        availableTrackers: ['Bug', 'Support']
      });

      expect(report.tracker).toBe('Bug');
      expect(report.subject).toBe('Save fails');
      expect(report.description).toBe('Clicking save shows a 500');
      expect(report.stepsToReproduce).toBe('1. Click save');
    });
  });

  describe('findDuplicates', () => {
    const candidates = [
      { id: 11, subject: 'Save button returns 500', description: 'On settings page' },
      { id: 12, subject: 'Typo in footer' },
      { id: 13, subject: 'Settings save broken' }
    ];

    test('asks one noul question per candidate and returns matches above the threshold', async () => {
      global.fetch = mockAnswers({
        issue_11: { type: 'noul', noul: 0.91 },
        issue_12: { type: 'noul', noul: 0.02 },
        issue_13: { type: 'noul', noul: 0.64 }
      });
      const ai = new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' });

      const matches = await ai.findDuplicates(
        { subject: 'Saving settings fails', description: '500 on save', url: 'https://app/settings' },
        candidates
      );

      const body = sentBody();
      expect(Object.keys(body.questions)).toEqual(['issue_11', 'issue_12', 'issue_13']);
      expect(body.questions.issue_11.type).toBe('noul');
      expect(body.questions.issue_11.instructions).toContain('#11');
      expect(body.state).toContain('Saving settings fails');

      expect(matches).toEqual([
        { id: 11, confidence: 0.91, reason: 'Jev: 91% likely the same problem' },
        { id: 13, confidence: 0.64, reason: 'Jev: 64% likely the same problem' }
      ]);
    });

    test('treats missing answers as no match', async () => {
      global.fetch = mockAnswers({ issue_11: { type: 'noul', noul: 0.8 } });
      const matches = await new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' }).findDuplicates(
        { subject: 'x', description: 'y' },
        candidates
      );
      expect(matches.map((m) => m.id)).toEqual([11]);
    });

    test('throws when the response has no answers', async () => {
      global.fetch = mockAnswers(undefined);
      await expect(
        new AIAssistant({ endpoint: JEV_ENDPOINT, apiKey: 'k' }).findDuplicates({ subject: 'x' }, candidates)
      ).rejects.toThrow('AI response did not contain any answers.');
    });
  });
});
