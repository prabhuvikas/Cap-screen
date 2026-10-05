// Duplicate issue detection helpers
//
// Pure functions used by the annotate page to find existing Redmine issues
// that look like the report about to be submitted. The keyword scoring here
// runs locally and needs no AI; when the AI assistant is enabled for duplicate
// checks, the top keyword candidates are passed to AIAssistant.findDuplicates
// for a final ranking.

const DuplicateCheck = (() => {
  // Common English words and bug-report boilerplate that say nothing about
  // which issue a report is about.
  const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'cannot',
    'could', 'did', 'do', 'does', 'doesnt', 'dont', 'for', 'from', 'get', 'gets', 'got',
    'has', 'have', 'having', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'me',
    'my', 'no', 'not', 'of', 'on', 'or', 'our', 'should', 'so', 'some', 'than', 'that',
    'the', 'their', 'then', 'there', 'these', 'this', 'to', 'too', 'up', 'was', 'we',
    'were', 'what', 'when', 'where', 'which', 'while', 'will', 'with', 'would', 'you',
    'your', 'after', 'before', 'also', 'just', 'only', 'all', 'any', 'out', 'page',
    'issue', 'bug', 'error', 'problem', 'please', 'steps', 'reproduce', 'expected',
    'actual', 'behavior', 'behaviour', 'working', 'works', 'work', 'click', 'clicked',
    'clicking', 'shown', 'shows', 'show', 'showing', 'see', 'user', 'users', 'http',
    'https', 'www', 'com', 'information', 'url', 'title', 'timestamp', 'na'
  ]);

  // Lowercase word tokens of 3+ characters, minus stop words and pure numbers.
  function tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
  }

  // Distinct keywords from the subject (first, most important) then the
  // description, capped at `max`.
  function extractKeywords(subject, description, max = 12) {
    const seen = new Set();
    const keywords = [];
    [...tokenize(subject), ...tokenize(description)].forEach((word) => {
      if (!seen.has(word) && keywords.length < max) {
        seen.add(word);
        keywords.push(word);
      }
    });
    return keywords;
  }

  // The path part of a URL with ids and trailing slashes stripped, so
  // /orders/123/edit and /orders/456/edit/ compare equal. '' when there's no
  // meaningful path.
  function normalizeUrlPath(url) {
    if (!url) return '';
    let path;
    try {
      path = new URL(url).pathname;
    } catch (e) {
      return '';
    }
    path = path
      .toLowerCase()
      .split('/')
      .map((segment) => (/^[0-9a-f-]{6,}$|^\d+$/.test(segment) ? ':id' : segment))
      .join('/')
      .replace(/\/+$/, '');
    return path && path !== '/' ? path : '';
  }

  // Normalized paths of every http(s) URL mentioned in a block of text.
  function urlPathsIn(text) {
    const urls = String(text || '').match(/https?:\/\/[^\s)<>"']+/gi) || [];
    return urls.map(normalizeUrlPath).filter(Boolean);
  }

  // Score each candidate issue against the report by keyword overlap. Subject
  // matches count double; a matching page path in the candidate's text adds a
  // bonus. Returns the candidates with score > 0, best first, capped at `limit`.
  function scoreCandidates(report, issues, limit = 20) {
    const keywords = extractKeywords(report.subject, report.description, 20);
    const subjectWords = new Set(tokenize(report.subject));
    const urlPath = normalizeUrlPath(report.url);

    if (keywords.length === 0 && !urlPath) return [];

    return (issues || [])
      .map((issue) => {
        const issueSubject = new Set(tokenize(issue.subject));
        const issueBody = new Set(tokenize(issue.description));
        const matched = [];
        let score = 0;

        keywords.forEach((word) => {
          if (issueSubject.has(word)) {
            score += subjectWords.has(word) ? 2 : 1;
            matched.push(word);
          } else if (issueBody.has(word)) {
            score += 1;
            matched.push(word);
          }
        });

        if (urlPath && urlPathsIn(issue.description).includes(urlPath)) {
          score += 2;
        }

        return { issue, score, matched };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Merge several issue lists, keeping the first copy of each id.
  function mergeIssues(...lists) {
    const byId = new Map();
    lists.forEach((list) => {
      (list || []).forEach((issue) => {
        if (issue && issue.id != null && !byId.has(issue.id)) byId.set(issue.id, issue);
      });
    });
    return Array.from(byId.values());
  }

  // Cache key for a check: same project + subject + description => same result.
  function cacheKey(report) {
    return JSON.stringify([
      report.projectId || '',
      (report.subject || '').trim(),
      (report.description || '').trim(),
      report.useAI ? 'ai' : 'kw'
    ]);
  }

  return {
    STOP_WORDS,
    tokenize,
    extractKeywords,
    normalizeUrlPath,
    urlPathsIn,
    scoreCandidates,
    mergeIssues,
    cacheKey
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DuplicateCheck;
}
