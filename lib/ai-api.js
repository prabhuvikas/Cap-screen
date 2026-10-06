// AI Assistant integration module
//
// Talks to any OpenAI-compatible Chat Completions endpoint. This keeps the
// extension provider-agnostic: the user supplies the endpoint URL, an API key
// and (optionally) a model name in the extension settings. Works with OpenAI,
// Azure OpenAI, OpenRouter, Groq, Together, and local servers such as Ollama
// or LM Studio that expose the /v1/chat/completions contract.
//
// It also supports TypeSafe AI's Jev ("System One" decision model) when the
// endpoint is a System One URL (https://api.typesafe.ai/v1/systemone). Jev does
// not generate text: it answers typed questions (choice / score / noul) about a
// state with calibrated probabilities. In that mode the client uses Jev only
// for decisions (tracker classification, duplicate detection) and keeps the
// reporter's own wording for the text fields.

class AIAssistant {
  constructor(config = {}) {
    this.endpoint = (config.endpoint || '').trim();
    this.apiKey = (config.apiKey || '').trim();
    this.model =
      (config.model || '').trim() || (this.isSystemOne() ? 'jev-latest' : 'gpt-4o-mini');
  }

  // Whether the endpoint is a TypeSafe System One (Jev) decision endpoint
  // rather than a Chat Completions endpoint. OpenRouter's /decisions endpoint
  // for Jev is treated the same way.
  isSystemOne() {
    return /\/(systemone|decisions)\/?(\?.*)?$/i.test(this.endpoint);
  }

  // Whether we have enough configuration to make a request
  isConfigured() {
    return !!(this.endpoint && this.apiKey);
  }

  // Low-level call to the chat completions endpoint. Returns the assistant
  // message content as a string.
  async chat(messages, { temperature = 0.4, maxTokens = 1500 } = {}) {
    if (!this.isConfigured()) {
      throw new Error('AI endpoint and API key are required. Configure them in Settings.');
    }

    const payload = await this._post({
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    });

    const content =
      payload?.choices?.[0]?.message?.content ??
      payload?.choices?.[0]?.text ??
      '';

    if (!content) {
      throw new Error('AI response did not contain any content.');
    }

    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  // POST a JSON body to the configured endpoint and return the parsed payload.
  async _post(body) {
    let response;
    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });
    } catch (networkError) {
      throw new Error(`Could not reach AI endpoint: ${networkError.message}`);
    }

    let payload;
    const text = await response.text();
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (e) {
      payload = {};
    }

    if (!response.ok) {
      const apiMessage =
        payload?.error?.message ||
        payload?.message ||
        text ||
        `${response.status} ${response.statusText}`;
      throw new Error(`AI request failed: ${apiMessage}`);
    }

    return payload;
  }

  // Ask a System One (Jev) model a set of typed questions about `state`.
  // `questions` maps a key to { type: 'choice' | 'score' | 'noul', instructions,
  // criteria }. Returns the `answers` map keyed the same way.
  async decide(state, questions) {
    if (!this.isConfigured()) {
      throw new Error('AI endpoint and API key are required. Configure them in Settings.');
    }

    const payload = await this._post({ model: this.model, state, questions });
    const answers = payload?.answers;
    if (!answers || typeof answers !== 'object') {
      throw new Error('AI response did not contain any answers.');
    }
    return answers;
  }

  // Verify the endpoint/key/model work by asking for a trivial reply.
  async testConnection() {
    if (this.isSystemOne()) {
      try {
        await this.decide('ping', {
          ok: { type: 'noul', instructions: 'Is this message a connection test?' }
        });
        return { success: true, message: `OK (${this.model})` };
      } catch (error) {
        return { success: false, message: error.message };
      }
    }

    try {
      const reply = await this.chat(
        [
          { role: 'system', content: 'You are a connection test. Reply with the single word: OK.' },
          { role: 'user', content: 'ping' }
        ],
        { temperature: 0, maxTokens: 5 }
      );
      return { success: true, message: reply.trim() || 'OK' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Extract a JSON object from a model reply that may be wrapped in prose or
  // fenced code blocks.
  static extractJson(reply) {
    if (!reply) return null;

    // Strip ```json ... ``` fences if present
    let cleaned = reply.trim();
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }

    // Try a straight parse first
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Fall back to the first balanced-looking {...} block
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          return JSON.parse(cleaned.slice(start, end + 1));
        } catch (e2) {
          return null;
        }
      }
      return null;
    }
  }

  // Generate a structured bug report from whatever context the reporter has
  // gathered so far. Returns:
  //   { subject, description, stepsToReproduce, expectedBehavior,
  //     actualBehavior, tracker }
  async generateBugReport(context = {}) {
    const {
      userView = '',
      subject = '',
      description = '',
      stepsToReproduce = '',
      expectedBehavior = '',
      actualBehavior = '',
      pageInfo = {},
      consoleErrors = [],
      networkErrors = [],
      availableTrackers = [],
      images = []
    } = context;

    // The tracker names the reporter can actually choose from. Fall back to a
    // sensible default set so the model always has options to pick from.
    const trackerOptions =
      Array.isArray(availableTrackers) && availableTrackers.length > 0
        ? availableTrackers
        : ['Bug', 'Feature', 'Support', 'Task'];

    const systemPrompt = [
      'You are an assistant that writes clear, professional reports',
      'for a developer issue tracker (Redmine).',
      'Using the raw information provided by a reporter, produce a well-structured report.',
      'Be concise and factual. Do not invent details that are not supported by the input,',
      'but you may reasonably infer steps and expected behavior from the context.',
      'One or more annotated screenshots of the issue may be attached as images;',
      'use them to inform and verify the report.',
      'Classify the issue and choose the single most appropriate tracker/category',
      `strictly from this list: [${trackerOptions.join(', ')}].`,
      'Do NOT default to "Bug" unless the report actually describes something broken or',
      'not working as intended; use a feature/enhancement tracker for requests for new',
      'or changed behavior, and a support/question/task tracker for how-to questions or',
      'non-defect work. Pick the closest match from the list when uncertain.',
      'Respond with ONLY a JSON object (no markdown, no commentary) using exactly these keys:',
      '"tracker" (one value copied verbatim from the list above),',
      '"subject" (a short one-line title),',
      '"description" (a clear summary paragraph),',
      '"stepsToReproduce" (numbered steps as a single string),',
      '"expectedBehavior" (a single string),',
      '"actualBehavior" (a single string).'
    ].join(' ');

    const parts = [];
    parts.push('Here is the information the reporter has provided so far.');

    if (userView) {
      parts.push("The reporter describes the issue in their own words as follows:");
      parts.push(`"${userView}"`);
      parts.push('Treat this as the primary description of the problem.');
    }

    if (subject) parts.push(`Draft title: ${subject}`);
    if (description) parts.push(`Draft description: ${description}`);
    if (stepsToReproduce) parts.push(`Draft steps to reproduce: ${stepsToReproduce}`);
    if (expectedBehavior) parts.push(`Draft expected behavior: ${expectedBehavior}`);
    if (actualBehavior) parts.push(`Draft actual behavior: ${actualBehavior}`);

    if (pageInfo && (pageInfo.url || pageInfo.title)) {
      parts.push('Page context:');
      if (pageInfo.url) parts.push(`- URL: ${pageInfo.url}`);
      if (pageInfo.title) parts.push(`- Page title: ${pageInfo.title}`);
      if (pageInfo.userAgent) parts.push(`- User agent: ${pageInfo.userAgent}`);
    }

    if (Array.isArray(consoleErrors) && consoleErrors.length > 0) {
      parts.push('Recent console errors/warnings:');
      consoleErrors.slice(0, 15).forEach((log) => {
        const level = log.level || log.type || 'log';
        const message = typeof log.message === 'string' ? log.message : JSON.stringify(log.message);
        parts.push(`- [${level}] ${String(message).slice(0, 300)}`);
      });
    }

    if (Array.isArray(networkErrors) && networkErrors.length > 0) {
      parts.push('Failed / error network requests:');
      networkErrors.slice(0, 15).forEach((req) => {
        const status = req.statusCode || (req.failed ? 'failed' : '');
        parts.push(`- ${req.method || 'GET'} ${req.url} ${status ? `(${status})` : ''}`.trim());
      });
    }

    parts.push('');
    parts.push('Produce the JSON bug report now.');

    const userText = parts.join('\n');

    if (this.isSystemOne()) {
      return this._decideBugReport(context, userText, trackerOptions);
    }

    // When screenshots are provided, send a multimodal message (text + images)
    // using the OpenAI-compatible content-array format. Otherwise send plain text.
    const validImages = Array.isArray(images) ? images.filter(Boolean) : [];
    const userContent = validImages.length
      ? [
          { type: 'text', text: userText },
          ...validImages.map((url) => ({ type: 'image_url', image_url: { url } }))
        ]
      : userText;

    const reply = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ]);

    const parsed = AIAssistant.extractJson(reply);
    if (!parsed) {
      throw new Error('Could not parse the AI response into a bug report. Try again.');
    }

    // Resolve the model's tracker choice against the real available options so
    // callers get a name that maps to an actual select option when possible.
    const rawTracker = (parsed.tracker || parsed.trackerName || parsed.category || '')
      .toString()
      .trim();
    let tracker = rawTracker;
    if (rawTracker) {
      const match = trackerOptions.find(
        (name) => name.toLowerCase() === rawTracker.toLowerCase()
      );
      if (match) tracker = match;
    }

    return {
      tracker,
      subject: (parsed.subject || '').toString().trim(),
      description: (parsed.description || '').toString().trim(),
      stepsToReproduce: (parsed.stepsToReproduce || parsed.steps || '').toString().trim(),
      expectedBehavior: (parsed.expectedBehavior || parsed.expected || '').toString().trim(),
      actualBehavior: (parsed.actualBehavior || parsed.actual || '').toString().trim()
    };
  }

  // Jev (System One) version of generateBugReport. Jev cannot write text, so
  // the reporter's own wording fills the text fields and Jev classifies the
  // tracker. Screenshots are not sent: System One accepts text/JSON state only.
  async _decideBugReport(context, stateText, trackerOptions) {
    const {
      userView = '',
      subject = '',
      description = '',
      stepsToReproduce = '',
      expectedBehavior = '',
      actualBehavior = ''
    } = context;

    const describeTracker = (name) => {
      const lower = name.toLowerCase();
      if (/bug|defect|error|incident/.test(lower)) {
        return `${name}: something is broken, failing or not working as intended`;
      }
      if (/feature|enhancement|improvement|story|request/.test(lower)) {
        return `${name}: a request for new or changed behavior`;
      }
      if (/support|question|help/.test(lower)) {
        return `${name}: a how-to question or request for help`;
      }
      if (/task|chore/.test(lower)) {
        return `${name}: non-defect work to be done`;
      }
      return name;
    };

    const criteria = {};
    trackerOptions.forEach((name) => {
      criteria[name] = describeTracker(name);
    });

    const answers = await this.decide(stateText, {
      tracker: {
        type: 'choice',
        instructions:
          'Which tracker/category best fits this issue report? Only pick a bug tracker ' +
          'if the report describes something broken or not working as intended.',
        criteria
      }
    });

    const rawTracker = (answers?.tracker?.choice || '').toString().trim();
    const tracker =
      trackerOptions.find((name) => name.toLowerCase() === rawTracker.toLowerCase()) ||
      rawTracker;

    // Without a generated title, use the first sentence of the reporter's own
    // description, capped to a reasonable length.
    const ownWords = userView.toString().replace(/\s+/g, ' ').trim();
    let fallbackSubject = ownWords.split(/(?<=[.!?])\s/)[0] || '';
    if (fallbackSubject.length > 100) fallbackSubject = `${fallbackSubject.slice(0, 97)}…`;

    return {
      tracker,
      trackerConfidence: Number(answers?.tracker?.confidence) || null,
      textGenerated: false,
      subject: (subject || fallbackSubject).toString().trim(),
      description: (description || userView).toString().trim(),
      stepsToReproduce: stepsToReproduce.toString().trim(),
      expectedBehavior: expectedBehavior.toString().trim(),
      actualBehavior: actualBehavior.toString().trim()
    };
  }

  // Decide which existing issues describe the same problem as a new report.
  // `report` is { subject, description, url }; `candidates` are Redmine issues
  // ({ id, subject, description, status }). Returns matches at or above
  // `minConfidence`, best first: [{ id, confidence, reason }]. Only ids from
  // the candidate list are ever returned.
  async findDuplicates(report = {}, candidates = [], { minConfidence = 0.5 } = {}) {
    const list = Array.isArray(candidates) ? candidates.filter((c) => c && c.id != null) : [];
    if (list.length === 0) return [];

    const systemPrompt = [
      'You help triage reports for a developer issue tracker (Redmine).',
      'Given a NEW report and a list of EXISTING open issues, decide which existing issues',
      'describe the same underlying problem, so the reporter can add to them instead of',
      'filing a duplicate. Similar wording alone is not enough: the symptom and the',
      'affected feature or page must match. Related-but-different problems are not duplicates.',
      'Respond with ONLY a JSON object (no markdown, no commentary) of the form',
      '{"duplicates": [{"id": <existing issue id>, "confidence": <0..1>, "reason": "<one short sentence>"}]}.',
      'Include only issues with confidence of at least 0.3. Use an empty list when none match.'
    ].join(' ');

    const truncate = (text, max) => {
      const str = (text || '').toString().replace(/\s+/g, ' ').trim();
      return str.length > max ? `${str.slice(0, max)}…` : str;
    };

    const parts = ['NEW report:'];
    parts.push(`Title: ${truncate(report.subject, 200)}`);
    if (report.url) parts.push(`Page URL: ${truncate(report.url, 300)}`);
    parts.push(`Description: ${truncate(report.description, 1500)}`);
    parts.push('');
    parts.push('EXISTING open issues:');
    list.forEach((issue) => {
      const status = issue.status?.name ? ` [${issue.status.name}]` : '';
      parts.push(`#${issue.id}${status}: ${truncate(issue.subject, 200)}`);
      if (issue.description) parts.push(`  ${truncate(issue.description, 400)}`);
    });
    parts.push('');
    parts.push('Return the JSON now.');

    if (this.isSystemOne()) {
      return this._decideDuplicates(report, list, truncate, minConfidence);
    }

    const reply = await this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: parts.join('\n') }
      ],
      { temperature: 0, maxTokens: 800 }
    );

    const parsed = AIAssistant.extractJson(reply);
    const raw = Array.isArray(parsed?.duplicates) ? parsed.duplicates : null;
    if (!raw) {
      throw new Error('Could not parse the AI duplicate check response.');
    }

    const validIds = new Set(list.map((issue) => Number(issue.id)));
    const seen = new Set();
    return raw
      .map((entry) => ({
        id: Number(String(entry?.id ?? '').replace(/^#/, '')),
        confidence: Math.max(0, Math.min(1, Number(entry?.confidence) || 0)),
        reason: (entry?.reason || '').toString().trim()
      }))
      .filter((entry) => {
        if (!validIds.has(entry.id) || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return entry.confidence >= minConfidence;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  // Jev (System One) version of findDuplicates: one yes/no (noul) question per
  // candidate, all in a single request. The noul value is the probability that
  // the candidate describes the same problem.
  async _decideDuplicates(report, list, truncate, minConfidence) {
    const state = [
      `Title: ${truncate(report.subject, 200)}`,
      report.url ? `Page URL: ${truncate(report.url, 300)}` : '',
      `Description: ${truncate(report.description, 1500)}`
    ]
      .filter(Boolean)
      .join('\n');

    const questions = {};
    list.forEach((issue) => {
      const existing = [truncate(issue.subject, 200), truncate(issue.description, 400)]
        .filter(Boolean)
        .join(' - ');
      questions[`issue_${issue.id}`] = {
        type: 'noul',
        instructions:
          `Does existing issue #${issue.id} ("${existing}") describe the same underlying ` +
          'problem as this new report? The symptom and the affected feature or page must ' +
          'match; similar wording alone is not enough.'
      };
    });

    const answers = await this.decide(state, questions);

    return list
      .map((issue) => {
        const value = Number(answers?.[`issue_${issue.id}`]?.noul);
        const confidence = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
        return {
          id: Number(issue.id),
          confidence,
          reason: `Jev: ${Math.round(confidence * 100)}% likely the same problem`
        };
      })
      .filter((entry, index, all) =>
        entry.confidence >= minConfidence && all.findIndex((e) => e.id === entry.id) === index
      )
      .sort((a, b) => b.confidence - a.confidence);
  }
}

// Expose for both service-worker (self) and window contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}
