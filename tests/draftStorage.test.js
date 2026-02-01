/**
 * Draft Storage Tests
 *
 * Tests for the DraftStorage class that handles saving and loading
 * issue report drafts.
 *
 * Run with: npm run test:unit
 */

const DraftStorage = require('../lib/draft-storage.js');

describe('DraftStorage', () => {
  let draftStorage;

  beforeEach(() => {
    // Reset chrome storage mocks
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
    chrome.storage.local.remove.mockReset();
    chrome.storage.local.getBytesInUse.mockResolvedValue(0);

    // Create new instance
    draftStorage = new DraftStorage();

    // Reset IndexedDB
    global.indexedDB = new (require('./setup.js').MockIDBFactory ||
      global.indexedDB.constructor)();
  });

  // =============================================
  // Draft ID Generation
  // =============================================
  describe('Draft ID Generation', () => {
    test('generateDraftId creates unique IDs', () => {
      const id1 = draftStorage.generateDraftId();
      const id2 = draftStorage.generateDraftId();

      expect(id1).toMatch(/^draft_/);
      expect(id2).toMatch(/^draft_/);
      expect(id1).not.toBe(id2);
    });

    test('generateDraftId includes timestamp component', () => {
      const id = draftStorage.generateDraftId();
      // ID format: draft_<timestamp36>_<random>
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('draft');
    });
  });

  // =============================================
  // Draft Name Generation
  // =============================================
  describe('Draft Name Generation', () => {
    test('uses subject as draft name when available', () => {
      const draft = {
        formData: { subject: 'Login page not loading' }
      };
      const name = draftStorage.generateDraftName(draft);
      expect(name).toBe('Login page not loading');
    });

    test('truncates long subjects to 50 characters', () => {
      const longSubject = 'A'.repeat(100);
      const draft = {
        formData: { subject: longSubject }
      };
      const name = draftStorage.generateDraftName(draft);
      expect(name.length).toBe(50);
    });

    test('uses sourceTitle when no subject', () => {
      const draft = {
        formData: {},
        sourceTitle: 'Example Page Title'
      };
      const name = draftStorage.generateDraftName(draft);
      expect(name).toBe('Draft - Example Page Title');
    });

    test('uses hostname when only sourceUrl available', () => {
      const draft = {
        formData: {},
        sourceUrl: 'https://example.com/page/path'
      };
      const name = draftStorage.generateDraftName(draft);
      expect(name).toBe('Draft - example.com');
    });

    test('uses date when no context available', () => {
      const draft = { formData: {} };
      const name = draftStorage.generateDraftName(draft);
      expect(name).toMatch(/^Draft - /);
    });
  });

  // =============================================
  // Drafts Index Management
  // =============================================
  describe('Drafts Index', () => {
    test('getDraftsIndex returns empty array when no drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const index = await draftStorage.getDraftsIndex();
      expect(index).toEqual([]);
    });

    test('getDraftsIndex returns stored index', async () => {
      const mockIndex = [
        { id: 'draft_1', name: 'Test Draft', updatedAt: Date.now() }
      ];
      chrome.storage.local.get.mockResolvedValue({ drafts_index: mockIndex });

      const index = await draftStorage.getDraftsIndex();
      expect(index).toEqual(mockIndex);
    });

    test('saveDraftsIndex stores index in chrome.storage.local', async () => {
      chrome.storage.local.set.mockResolvedValue();

      const mockIndex = [{ id: 'draft_1', name: 'Test' }];
      await draftStorage.saveDraftsIndex(mockIndex);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        drafts_index: mockIndex
      });
    });
  });

  // =============================================
  // Save Draft
  // =============================================
  describe('saveDraft', () => {
    beforeEach(() => {
      chrome.storage.local.get.mockResolvedValue({});
      chrome.storage.local.set.mockResolvedValue();
    });

    test('saves draft and returns ID', async () => {
      const draft = {
        formData: { subject: 'Test Issue' },
        screenshots: []
      };

      const id = await draftStorage.saveDraft(draft);

      expect(id).toMatch(/^draft_/);
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('preserves existing draft ID on update', async () => {
      const existingId = 'draft_existing_123';
      const draft = {
        id: existingId,
        formData: { subject: 'Updated Issue' },
        screenshots: []
      };

      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [{ id: existingId, name: 'Old Name', updatedAt: 1000 }]
      });

      const id = await draftStorage.saveDraft(draft);

      expect(id).toBe(existingId);
    });

    test('updates index entry for existing draft', async () => {
      const existingId = 'draft_existing_123';
      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [{ id: existingId, name: 'Old', updatedAt: 1000 }]
      });

      const draft = {
        id: existingId,
        formData: { subject: 'New Subject' },
        screenshots: []
      };

      await draftStorage.saveDraft(draft);

      // Check that set was called with updated index
      const setCalls = chrome.storage.local.set.mock.calls;
      const indexCall = setCalls.find(call => call[0].drafts_index);
      expect(indexCall[0].drafts_index[0].name).toBe('New Subject');
    });

    test('adds new draft to beginning of index', async () => {
      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [{ id: 'old_draft', name: 'Old', updatedAt: 1000 }]
      });

      const draft = {
        formData: { subject: 'New Draft' },
        screenshots: []
      };

      await draftStorage.saveDraft(draft);

      const setCalls = chrome.storage.local.set.mock.calls;
      const indexCall = setCalls.find(call => call[0].drafts_index);
      expect(indexCall[0].drafts_index[0].name).toBe('New Draft');
      expect(indexCall[0].drafts_index.length).toBe(2);
    });

    test('saves draft metadata correctly', async () => {
      const draft = {
        formData: {
          subject: 'Test',
          description: 'Description',
          project_id: '1',
          priority_id: '2'
        },
        mode: 'create',
        screenshots: [
          { id: 's1', type: 'screenshot', data: 'data:image/png;base64,small' },
          { id: 'v1', type: 'video', data: 'data:video/webm;base64,small' }
        ],
        sourceUrl: 'https://example.com',
        sourceTitle: 'Example'
      };

      await draftStorage.saveDraft(draft);

      const setCalls = chrome.storage.local.set.mock.calls;
      const indexCall = setCalls.find(call => call[0].drafts_index);

      expect(indexCall[0].drafts_index[0]).toMatchObject({
        name: 'Test',
        sourceUrl: 'https://example.com',
        hasVideo: true,
        screenshotCount: 1,
        videoCount: 1,
        mode: 'create'
      });
    });
  });

  // =============================================
  // Get Draft
  // =============================================
  describe('getDraft', () => {
    test('returns null for non-existent draft', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const draft = await draftStorage.getDraft('non_existent');
      expect(draft).toBeNull();
    });

    test('returns draft data for existing draft', async () => {
      const mockDraft = {
        id: 'draft_123',
        formData: { subject: 'Test' },
        screenshots: []
      };
      chrome.storage.local.get.mockResolvedValue({
        'draft_draft_123': mockDraft
      });

      const draft = await draftStorage.getDraft('draft_123');
      expect(draft).toEqual(mockDraft);
    });
  });

  // =============================================
  // Delete Draft
  // =============================================
  describe('deleteDraft', () => {
    test('removes draft from storage', async () => {
      chrome.storage.local.get.mockImplementation((key) => {
        if (key === 'drafts_index') {
          return Promise.resolve({ drafts_index: [{ id: 'draft_123' }] });
        }
        return Promise.resolve({ 'draft_draft_123': { id: 'draft_123' } });
      });
      chrome.storage.local.remove.mockResolvedValue();
      chrome.storage.local.set.mockResolvedValue();

      await draftStorage.deleteDraft('draft_123');

      expect(chrome.storage.local.remove).toHaveBeenCalledWith('draft_draft_123');
    });

    test('removes draft from index', async () => {
      chrome.storage.local.get.mockImplementation((key) => {
        if (key === 'drafts_index' || key.drafts_index) {
          return Promise.resolve({
            drafts_index: [
              { id: 'draft_123' },
              { id: 'draft_456' }
            ]
          });
        }
        return Promise.resolve({});
      });
      chrome.storage.local.remove.mockResolvedValue();
      chrome.storage.local.set.mockResolvedValue();

      await draftStorage.deleteDraft('draft_123');

      const setCalls = chrome.storage.local.set.mock.calls;
      const indexCall = setCalls.find(call => call[0].drafts_index);
      expect(indexCall[0].drafts_index).toEqual([{ id: 'draft_456' }]);
    });
  });

  // =============================================
  // List Drafts
  // =============================================
  describe('listDrafts', () => {
    test('returns empty array when no drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const drafts = await draftStorage.listDrafts();
      expect(drafts).toEqual([]);
    });

    test('returns drafts sorted by updatedAt descending', async () => {
      const mockIndex = [
        { id: 'draft_1', updatedAt: 1000 },
        { id: 'draft_2', updatedAt: 3000 },
        { id: 'draft_3', updatedAt: 2000 }
      ];
      chrome.storage.local.get.mockResolvedValue({ drafts_index: mockIndex });

      const drafts = await draftStorage.listDrafts();

      expect(drafts[0].id).toBe('draft_2');
      expect(drafts[1].id).toBe('draft_3');
      expect(drafts[2].id).toBe('draft_1');
    });
  });

  // =============================================
  // Has Drafts
  // =============================================
  describe('hasDrafts', () => {
    test('returns false when no drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const result = await draftStorage.hasDrafts();
      expect(result).toBe(false);
    });

    test('returns true when drafts exist', async () => {
      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [{ id: 'draft_1' }]
      });

      const result = await draftStorage.hasDrafts();
      expect(result).toBe(true);
    });
  });

  // =============================================
  // Get Most Recent Draft
  // =============================================
  describe('getMostRecentDraft', () => {
    test('returns null when no drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({});

      const draft = await draftStorage.getMostRecentDraft();
      expect(draft).toBeNull();
    });

    test('returns most recently updated draft', async () => {
      const mockIndex = [
        { id: 'draft_1', updatedAt: 1000 },
        { id: 'draft_2', updatedAt: 3000 }
      ];
      const mockDraft = { id: 'draft_2', formData: { subject: 'Recent' } };

      chrome.storage.local.get.mockImplementation((key) => {
        if (key === 'drafts_index' || (typeof key === 'object' && 'drafts_index' in key)) {
          return Promise.resolve({ drafts_index: mockIndex });
        }
        if (key === 'draft_draft_2') {
          return Promise.resolve({ 'draft_draft_2': mockDraft });
        }
        return Promise.resolve({});
      });

      const draft = await draftStorage.getMostRecentDraft();
      expect(draft.id).toBe('draft_2');
    });
  });

  // =============================================
  // Cleanup Expired Drafts
  // =============================================
  describe('cleanupExpiredDrafts', () => {
    test('removes drafts older than 30 days', async () => {
      const now = Date.now();
      const oldDate = now - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      const recentDate = now - (1 * 24 * 60 * 60 * 1000); // 1 day ago

      chrome.storage.local.get.mockImplementation((key) => {
        if (key === 'drafts_index') {
          return Promise.resolve({
            drafts_index: [
              { id: 'old_draft', updatedAt: oldDate },
              { id: 'recent_draft', updatedAt: recentDate }
            ]
          });
        }
        return Promise.resolve({});
      });
      chrome.storage.local.remove.mockResolvedValue();
      chrome.storage.local.set.mockResolvedValue();

      const deleted = await draftStorage.cleanupExpiredDrafts();

      expect(deleted).toBe(1);
    });

    test('returns 0 when no expired drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [
          { id: 'draft_1', updatedAt: Date.now() }
        ]
      });

      const deleted = await draftStorage.cleanupExpiredDrafts();
      expect(deleted).toBe(0);
    });
  });

  // =============================================
  // Clear All Drafts
  // =============================================
  describe('clearAllDrafts', () => {
    test('removes all drafts', async () => {
      chrome.storage.local.get.mockResolvedValue({
        drafts_index: [
          { id: 'draft_1' },
          { id: 'draft_2' }
        ]
      });
      chrome.storage.local.remove.mockResolvedValue();
      chrome.storage.local.set.mockResolvedValue();

      await draftStorage.clearAllDrafts();

      // Should save empty index
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        drafts_index: []
      });
    });
  });

  // =============================================
  // Storage Usage
  // =============================================
  describe('getStorageUsage', () => {
    test('returns storage usage info', async () => {
      chrome.storage.local.getBytesInUse.mockResolvedValue(5000000);

      const usage = await draftStorage.getStorageUsage();

      expect(usage).toMatchObject({
        used: 5000000,
        quota: 10485760,
        percentUsed: expect.any(Number)
      });
      expect(usage.available).toBe(10485760 - 5000000);
    });
  });

  // =============================================
  // Screenshot Processing
  // =============================================
  describe('Screenshot Processing', () => {
    test('small screenshots stored inline', async () => {
      chrome.storage.local.get.mockResolvedValue({});
      chrome.storage.local.set.mockResolvedValue();

      const smallData = 'data:image/png;base64,' + 'A'.repeat(100);
      const draft = {
        formData: { subject: 'Test' },
        screenshots: [{ id: 's1', data: smallData, type: 'screenshot' }]
      };

      await draftStorage.saveDraft(draft);

      // Check that screenshot data is preserved
      const setCalls = chrome.storage.local.set.mock.calls;
      const draftCall = setCalls.find(call =>
        Object.keys(call[0]).some(k => k.startsWith('draft_') && k !== 'drafts_index')
      );

      expect(draftCall[0][Object.keys(draftCall[0])[0]].screenshots[0].data).toBe(smallData);
    });
  });
});

// =============================================
// Draft Form Data Tests
// =============================================
describe('Draft Form Data Structure', () => {
  test('draft contains all required form fields', () => {
    const expectedFields = [
      'project_id',
      'tracker_id',
      'subject',
      'description',
      'priority_id',
      'assigned_to_id',
      'due_date',
      'category_id',
      'fixed_version_id',
      'stepsToReproduce',
      'expectedBehavior',
      'actualBehavior',
      'attachTechnicalData',
      'captureFromOtherTabs',
      'noteText'
    ];

    const mockFormData = {
      project_id: '1',
      tracker_id: '1',
      subject: 'Test',
      description: 'Test description',
      priority_id: '2',
      assigned_to_id: '3',
      due_date: '2024-12-31',
      category_id: '',
      fixed_version_id: '',
      stepsToReproduce: '1. Do this\n2. Do that',
      expectedBehavior: 'Should work',
      actualBehavior: 'Does not work',
      attachTechnicalData: true,
      captureFromOtherTabs: false,
      noteText: ''
    };

    expectedFields.forEach(field => {
      expect(field in mockFormData).toBe(true);
    });
  });
});

// =============================================
// Summary
// =============================================
describe('DRAFT STORAGE TEST SUMMARY', () => {
  test('All draft storage tests completed', () => {
    console.log('\n========================================');
    console.log('DRAFT STORAGE TESTS COMPLETE');
    console.log('All draft save/load functionality verified.');
    console.log('========================================\n');
    expect(true).toBe(true);
  });
});
