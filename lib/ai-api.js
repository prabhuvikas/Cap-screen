// AI Assistant integration module
//
// Talks to any OpenAI-compatible Chat Completions endpoint. This keeps the
// extension provider-agnostic: the user supplies the endpoint URL, an API key
// and (optionally) a model name in the extension settings. Works with OpenAI,
// Azure OpenAI, OpenRouter, Groq, Together, and local servers such as Ollama
// or LM Studio that expose the /v1/chat/completions contract.

class AIAssistant {
  constructor(config = {}) {
    this.endpoint = (config.endpoint || '').trim();
    this.apiKey = (config.apiKey || '').trim();
    this.model = (config.model || '').trim() || 'gpt-4o-mini';
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

    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: maxTokens
    };

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

    const content =
      payload?.choices?.[0]?.message?.content ??
      payload?.choices?.[0]?.text ??
      '';

    if (!content) {
      throw new Error('AI response did not contain any content.');
    }

    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  // Verify the endpoint/key/model work by asking for a trivial reply.
  async testConnection() {
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
  //   { subject, description, stepsToReproduce, expectedBehavior, actualBehavior }
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
      networkErrors = []
    } = context;

    const systemPrompt = [
      'You are an assistant that writes clear, professional software bug reports',
      'for a developer issue tracker (Redmine).',
      'Using the raw information provided by a reporter, produce a well-structured report.',
      'Be concise and factual. Do not invent details that are not supported by the input,',
      'but you may reasonably infer steps and expected behavior from the context.',
      'Respond with ONLY a JSON object (no markdown, no commentary) using exactly these keys:',
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

    const reply = await this.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: parts.join('\n') }
    ]);

    const parsed = AIAssistant.extractJson(reply);
    if (!parsed) {
      throw new Error('Could not parse the AI response into a bug report. Try again.');
    }

    return {
      subject: (parsed.subject || '').toString().trim(),
      description: (parsed.description || '').toString().trim(),
      stepsToReproduce: (parsed.stepsToReproduce || parsed.steps || '').toString().trim(),
      expectedBehavior: (parsed.expectedBehavior || parsed.expected || '').toString().trim(),
      actualBehavior: (parsed.actualBehavior || parsed.actual || '').toString().trim()
    };
  }
}

// Expose for both service-worker (self) and window contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIAssistant;
}
