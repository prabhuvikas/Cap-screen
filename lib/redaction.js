// Redaction of secrets in captured technical data
//
// Pure functions used by the annotate page to mask credentials before page
// info, network requests and console logs leave the browser (Redmine
// attachments, the issue description, the AI assistant). Applied when the
// "Sanitize sensitive data" setting is on.

const Redaction = (() => {
  const MASK = '[REDACTED]';

  // Names of query parameters, object keys and headers whose values are secrets.
  const SENSITIVE_NAME = /pass(word|wd)?|secret|token|api[_-]?key|apikey|auth(?!or)|session|sess[_-]?id|^sid$|csrf|xsrf|jwt|bearer|credential|private[_-]?key|signature|^sig$|^code$|^key$|cookie/i;

  // Headers that can carry credentials even though their names look harmless.
  const SENSITIVE_HEADERS = new Set(['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'location']);

  // Values that are secrets whatever they are called.
  const URL_IN_TEXT = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]]+/gi;
  const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/g;
  const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
  // name=value or "name": "value" pairs inside free text (log messages, stacks).
  const INLINE_PAIR = /\b([A-Za-z0-9_-]*(?:pass(?:word|wd)?|secret|token|api[_-]?key|apikey|auth(?!or)|session|csrf|jwt|credential)[A-Za-z0-9_-]*)(["']?\s*[:=]\s*["']?)([^\s"'&,;}#?]+)/gi;

  function isSensitiveName(name) {
    return typeof name === 'string' && SENSITIVE_NAME.test(name);
  }

  function maskParams(params) {
    let changed = false;
    for (const name of Array.from(new Set(params.keys()))) {
      if (isSensitiveName(name)) {
        params.set(name, MASK);
        changed = true;
      }
    }
    return changed;
  }

  // Mask secret query/fragment parameters and embedded user:password in one URL.
  function redactUrlParts(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return url;
    }

    let changed = false;
    if (parsed.username || parsed.password) {
      parsed.username = '';
      parsed.password = '';
      changed = true;
    }

    if (maskParams(parsed.searchParams)) changed = true;

    // OAuth implicit flow puts tokens in the fragment: #access_token=...
    if (parsed.hash.includes('=')) {
      const fragment = new URLSearchParams(parsed.hash.slice(1));
      if (maskParams(fragment)) {
        parsed.hash = fragment.toString();
        changed = true;
      }
    }

    return changed ? parsed.toString().replace(/%5BREDACTED%5D/g, MASK) : url;
  }

  // Mask secrets in any string: URLs inside it, bearer tokens, JWTs and
  // secret=value pairs. A plain URL is just a string that is all URL.
  function redactText(text) {
    if (typeof text !== 'string' || !text) return text;
    return text
      .replace(URL_IN_TEXT, redactUrlParts)
      .replace(BEARER, (m, scheme) => `${scheme} ${MASK}`)
      .replace(JWT, MASK)
      .replace(INLINE_PAIR, (m, name, sep) => `${name}${sep}${MASK}`);
  }

  // Mask the values of credential-carrying headers ([{name, value}] form).
  function redactHeaders(headers) {
    if (!Array.isArray(headers)) return headers;
    return headers.map((h) => {
      if (!h || typeof h.name !== 'string') return h;
      const lower = h.name.toLowerCase();
      if (SENSITIVE_HEADERS.has(lower) || isSensitiveName(lower)) {
        return { ...h, value: MASK };
      }
      return { ...h, value: redactText(h.value) };
    });
  }

  // Deep-copy a value, masking secret-named keys and secret-looking strings.
  // A reference back to an enclosing object is dropped instead of followed.
  function redactObject(value, ancestors = new WeakSet()) {
    if (typeof value === 'string') return redactText(value);
    if (value === null || typeof value !== 'object') return value;
    if (ancestors.has(value)) return undefined;
    ancestors.add(value);

    let out;
    if (Array.isArray(value)) {
      out = value.map((item) => redactObject(item, ancestors));
    } else {
      out = {};
      for (const [key, item] of Object.entries(value)) {
        if (key === 'headers' || key === 'responseHeaders' || key === 'requestHeaders') {
          out[key] = redactHeaders(item);
        } else if (isSensitiveName(key) && (typeof item === 'string' || typeof item === 'number')) {
          out[key] = MASK;
        } else {
          out[key] = redactObject(item, ancestors);
        }
      }
    }

    ancestors.delete(value);
    return out;
  }

  return {
    MASK,
    isSensitiveName,
    redactUrl: redactText,
    redactText,
    redactHeaders,
    redactObject
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Redaction;
}
