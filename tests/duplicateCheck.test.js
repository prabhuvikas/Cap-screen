/**
 * Tests for the duplicate issue helpers (lib/duplicate-check.js)
 *
 * Verifies keyword extraction, URL path normalization, candidate scoring,
 * merging of Redmine result lists and cache keys.
 *
 * Run with: npx jest tests/duplicateCheck.test.js --verbose
 */

const DuplicateCheck = require('../lib/duplicate-check.js');

describe('DuplicateCheck', () => {
  describe('tokenize', () => {
    test('lowercases, splits on punctuation and drops stop words, short words and numbers', () => {
      expect(DuplicateCheck.tokenize('The Checkout page shows a 500 Error on Submit!')).toEqual([
        'checkout',
        'submit'
      ]);
    });

    test('handles empty input', () => {
      expect(DuplicateCheck.tokenize('')).toEqual([]);
      expect(DuplicateCheck.tokenize(null)).toEqual([]);
    });
  });

  describe('extractKeywords', () => {
    test('puts title words first, removes repeats and caps the count', () => {
      expect(
        DuplicateCheck.extractKeywords('Coupon checkout total', 'Checkout total ignores coupon discount', 4)
      ).toEqual(['coupon', 'checkout', 'total', 'ignores']);
    });
  });

  describe('normalizeUrlPath', () => {
    test('replaces numeric and hex ids and trims trailing slashes', () => {
      expect(DuplicateCheck.normalizeUrlPath('https://app.test/orders/123/edit/')).toBe('/orders/:id/edit');
      expect(DuplicateCheck.normalizeUrlPath('https://app.test/Users/9f8e7d6c-aa/profile?x=1')).toBe(
        '/users/:id/profile'
      );
    });

    test('returns empty for root paths and invalid URLs', () => {
      expect(DuplicateCheck.normalizeUrlPath('https://app.test/')).toBe('');
      expect(DuplicateCheck.normalizeUrlPath('not a url')).toBe('');
      expect(DuplicateCheck.normalizeUrlPath('')).toBe('');
    });
  });

  describe('urlPathsIn', () => {
    test('finds and normalizes every URL in text', () => {
      const text = '- URL: https://app.test/orders/55/edit\nsee also (http://app.test/cart)';
      expect(DuplicateCheck.urlPathsIn(text)).toEqual(['/orders/:id/edit', '/cart']);
    });
  });

  describe('scoreCandidates', () => {
    const report = {
      subject: 'Coupon discount missing from checkout total',
      description: 'Applying SAVE10 does not change the total',
      url: 'https://shop.test/checkout/42'
    };

    const issues = [
      { id: 1, subject: 'Login button misaligned', description: 'CSS problem on login' },
      { id: 2, subject: 'Checkout total ignores coupon', description: '' },
      { id: 3, subject: 'Slow dashboard', description: 'Seen on - URL: https://shop.test/checkout/7' },
      { id: 4, subject: 'Typo in footer', description: 'The total in the footer is misspelled' }
    ];

    test('ranks title matches above description matches and drops non-matches', () => {
      const scored = DuplicateCheck.scoreCandidates(report, issues);
      expect(scored.map((e) => e.issue.id)).toEqual([2, 3, 4]);
      expect(scored[0].matched).toEqual(expect.arrayContaining(['coupon', 'checkout', 'total']));
      expect(scored[0].score).toBe(6);
    });

    test('gives a bonus for the same page path', () => {
      const scored = DuplicateCheck.scoreCandidates(report, issues);
      const sameUrl = scored.find((e) => e.issue.id === 3);
      // 1 for "checkout" appearing in the URL text + 2 for the same path
      expect(sameUrl.score).toBe(3);
      expect(sameUrl.matched).toEqual(['checkout']);
    });

    test('respects the limit', () => {
      expect(DuplicateCheck.scoreCandidates(report, issues, 1)).toHaveLength(1);
    });

    test('returns nothing when the report has no keywords or URL', () => {
      expect(DuplicateCheck.scoreCandidates({ subject: 'the a of' }, issues)).toEqual([]);
    });
  });

  describe('mergeIssues', () => {
    test('keeps the first copy of each id across lists', () => {
      const merged = DuplicateCheck.mergeIssues(
        [{ id: 1, subject: 'a' }, { id: 2, subject: 'b' }],
        [{ id: 2, subject: 'b2' }, { id: 3, subject: 'c' }],
        undefined
      );
      expect(merged).toEqual([
        { id: 1, subject: 'a' },
        { id: 2, subject: 'b' },
        { id: 3, subject: 'c' }
      ]);
    });
  });

  describe('cacheKey', () => {
    test('is stable for the same report and changes with content or AI mode', () => {
      const base = { projectId: '5', subject: 'X ', description: 'Y', useAI: false };
      expect(DuplicateCheck.cacheKey(base)).toBe(DuplicateCheck.cacheKey({ ...base, subject: 'X' }));
      expect(DuplicateCheck.cacheKey(base)).not.toBe(DuplicateCheck.cacheKey({ ...base, description: 'Z' }));
      expect(DuplicateCheck.cacheKey(base)).not.toBe(DuplicateCheck.cacheKey({ ...base, useAI: true }));
    });
  });
});
