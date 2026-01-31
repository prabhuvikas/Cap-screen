// Draft storage helper for saving and restoring issue report drafts
// Uses chrome.storage.local for metadata and small data, IndexedDB for large media

const DRAFT_DB_NAME = 'CapScreenDraftsDB';
const DRAFT_DB_VERSION = 1;
const DRAFT_MEDIA_STORE = 'draft_media';
const DRAFTS_INDEX_KEY = 'drafts_index';
const DRAFT_PREFIX = 'draft_';
const CURRENT_DRAFT_VERSION = 1;
const MAX_INLINE_SIZE = 1024 * 1024; // 1MB - items larger than this go to IndexedDB
const MAX_DRAFTS = 10;
const DRAFT_EXPIRATION_DAYS = 30;

class DraftStorage {
  constructor() {
    this.db = null;
  }

  // Initialize IndexedDB for large media storage
  async initDB() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DRAFT_DB_NAME, DRAFT_DB_VERSION);

      request.onerror = () => {
        console.error('[DraftStorage] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[DraftStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for large media if it doesn't exist
        if (!db.objectStoreNames.contains(DRAFT_MEDIA_STORE)) {
          const objectStore = db.createObjectStore(DRAFT_MEDIA_STORE, { keyPath: 'key' });
          objectStore.createIndex('draftId', 'draftId', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[DraftStorage] Media store created');
        }
      };
    });
  }

  // Generate unique draft ID
  generateDraftId() {
    return 'draft_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get drafts index from chrome.storage.local
  async getDraftsIndex() {
    try {
      const result = await chrome.storage.local.get(DRAFTS_INDEX_KEY);
      return result[DRAFTS_INDEX_KEY] || [];
    } catch (error) {
      console.error('[DraftStorage] Error getting drafts index:', error);
      return [];
    }
  }

  // Save drafts index to chrome.storage.local
  async saveDraftsIndex(index) {
    try {
      await chrome.storage.local.set({ [DRAFTS_INDEX_KEY]: index });
    } catch (error) {
      console.error('[DraftStorage] Error saving drafts index:', error);
      throw error;
    }
  }

  // Save media to IndexedDB
  async saveMediaToIndexedDB(draftId, mediaId, data, type = 'screenshot') {
    await this.initDB();

    const key = `${draftId}_${type}_${mediaId}`;
    const mediaData = {
      key,
      draftId,
      mediaId,
      type,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_MEDIA_STORE], 'readwrite');
      const objectStore = transaction.objectStore(DRAFT_MEDIA_STORE);
      const request = objectStore.put(mediaData);

      request.onsuccess = () => {
        console.log('[DraftStorage] Media saved to IndexedDB:', key);
        resolve(key);
      };

      request.onerror = () => {
        console.error('[DraftStorage] Error saving media:', request.error);
        reject(request.error);
      };
    });
  }

  // Load media from IndexedDB
  async loadMediaFromIndexedDB(key) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_MEDIA_STORE], 'readonly');
      const objectStore = transaction.objectStore(DRAFT_MEDIA_STORE);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        if (request.result) {
          console.log('[DraftStorage] Media loaded from IndexedDB:', key);
          resolve(request.result.data);
        } else {
          console.log('[DraftStorage] No media found:', key);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[DraftStorage] Error loading media:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete media from IndexedDB
  async deleteMediaFromIndexedDB(key) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_MEDIA_STORE], 'readwrite');
      const objectStore = transaction.objectStore(DRAFT_MEDIA_STORE);
      const request = objectStore.delete(key);

      request.onsuccess = () => {
        console.log('[DraftStorage] Media deleted from IndexedDB:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('[DraftStorage] Error deleting media:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete all media for a draft from IndexedDB
  async deleteAllMediaForDraft(draftId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([DRAFT_MEDIA_STORE], 'readwrite');
      const objectStore = transaction.objectStore(DRAFT_MEDIA_STORE);
      const index = objectStore.index('draftId');
      const request = index.openCursor(IDBKeyRange.only(draftId));
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          objectStore.delete(cursor.primaryKey);
          deletedCount++;
          cursor.continue();
        } else {
          console.log('[DraftStorage] Deleted', deletedCount, 'media items for draft:', draftId);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('[DraftStorage] Error deleting media for draft:', request.error);
        reject(request.error);
      };
    });
  }

  // Process screenshots for storage - separate large media to IndexedDB
  async processScreenshotsForStorage(draftId, screenshots) {
    const processedScreenshots = [];
    const mediaKeys = [];

    for (const screenshot of screenshots) {
      const processed = { ...screenshot };

      // Check if screenshot data is large
      if (screenshot.data && screenshot.data.length > MAX_INLINE_SIZE) {
        // Store in IndexedDB and keep reference
        const key = await this.saveMediaToIndexedDB(draftId, screenshot.id, screenshot.data, screenshot.type || 'screenshot');
        processed.data = null; // Remove inline data
        processed.storageKey = key;
        processed.storedInIndexedDB = true;
        mediaKeys.push(key);
      }

      processedScreenshots.push(processed);
    }

    return { processedScreenshots, mediaKeys };
  }

  // Restore screenshots from storage - load large media from IndexedDB
  async restoreScreenshotsFromStorage(screenshots) {
    const restoredScreenshots = [];

    for (const screenshot of screenshots) {
      const restored = { ...screenshot };

      // Load from IndexedDB if needed
      if (screenshot.storedInIndexedDB && screenshot.storageKey) {
        const data = await this.loadMediaFromIndexedDB(screenshot.storageKey);
        if (data) {
          restored.data = data;
        } else {
          console.warn('[DraftStorage] Failed to load media:', screenshot.storageKey);
        }
        delete restored.storageKey;
        delete restored.storedInIndexedDB;
      }

      restoredScreenshots.push(restored);
    }

    return restoredScreenshots;
  }

  // Save a draft
  async saveDraft(draft) {
    const draftId = draft.id || this.generateDraftId();
    const now = Date.now();

    // Process screenshots to separate large media
    const { processedScreenshots, mediaKeys } = await this.processScreenshotsForStorage(
      draftId,
      draft.screenshots || []
    );

    // Create draft object for storage
    const draftData = {
      id: draftId,
      version: CURRENT_DRAFT_VERSION,
      name: draft.name || this.generateDraftName(draft),
      createdAt: draft.createdAt || now,
      updatedAt: now,

      // Form data
      formData: draft.formData || {},

      // Mode
      mode: draft.mode || 'create',
      existingIssueId: draft.existingIssueId || null,

      // Media (with large items stored in IndexedDB)
      screenshots: processedScreenshots,

      // Additional documents metadata (actual data stored separately if large)
      additionalDocuments: draft.additionalDocuments || [],

      // Technical data
      technicalData: draft.technicalData || null,

      // Multi-tab state
      selectedTabIds: draft.selectedTabIds || [],

      // Source context
      sourceUrl: draft.sourceUrl || '',
      sourceTitle: draft.sourceTitle || '',

      // Storage metadata
      mediaKeys: mediaKeys
    };

    try {
      // Save draft data to chrome.storage.local
      await chrome.storage.local.set({ [DRAFT_PREFIX + draftId]: draftData });

      // Update index
      const index = await this.getDraftsIndex();
      const existingIndex = index.findIndex(d => d.id === draftId);

      const indexEntry = {
        id: draftId,
        name: draftData.name,
        createdAt: draftData.createdAt,
        updatedAt: draftData.updatedAt,
        sourceUrl: draftData.sourceUrl,
        sourceTitle: draftData.sourceTitle,
        hasVideo: (draftData.screenshots || []).some(s => s.type === 'video'),
        screenshotCount: (draftData.screenshots || []).filter(s => s.type !== 'video').length,
        videoCount: (draftData.screenshots || []).filter(s => s.type === 'video').length,
        mode: draftData.mode
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexEntry;
      } else {
        index.unshift(indexEntry);
      }

      // Limit number of drafts
      if (index.length > MAX_DRAFTS) {
        const removedDrafts = index.splice(MAX_DRAFTS);
        // Clean up removed drafts
        for (const removed of removedDrafts) {
          await this.deleteDraft(removed.id, false); // Don't update index, we're doing it
        }
      }

      await this.saveDraftsIndex(index);

      console.log('[DraftStorage] Draft saved:', draftId);
      return draftId;
    } catch (error) {
      console.error('[DraftStorage] Error saving draft:', error);
      // Clean up any media we stored
      for (const key of mediaKeys) {
        try {
          await this.deleteMediaFromIndexedDB(key);
        } catch (e) {
          console.error('[DraftStorage] Error cleaning up media:', e);
        }
      }
      throw error;
    }
  }

  // Generate a name for the draft based on content
  generateDraftName(draft) {
    if (draft.formData?.subject) {
      return draft.formData.subject.substring(0, 50);
    }
    if (draft.sourceTitle) {
      return 'Draft - ' + draft.sourceTitle.substring(0, 40);
    }
    if (draft.sourceUrl) {
      try {
        const url = new URL(draft.sourceUrl);
        return 'Draft - ' + url.hostname;
      } catch (e) {
        // Invalid URL, ignore
      }
    }
    return 'Draft - ' + new Date().toLocaleDateString();
  }

  // Get a draft by ID
  async getDraft(draftId) {
    try {
      const result = await chrome.storage.local.get(DRAFT_PREFIX + draftId);
      const draft = result[DRAFT_PREFIX + draftId];

      if (!draft) {
        return null;
      }

      // Restore screenshots from IndexedDB if needed
      if (draft.screenshots && draft.screenshots.length > 0) {
        draft.screenshots = await this.restoreScreenshotsFromStorage(draft.screenshots);
      }

      return draft;
    } catch (error) {
      console.error('[DraftStorage] Error getting draft:', error);
      throw error;
    }
  }

  // Update an existing draft
  async updateDraft(draftId, updates) {
    const existing = await this.getDraft(draftId);
    if (!existing) {
      throw new Error('Draft not found: ' + draftId);
    }

    const updated = {
      ...existing,
      ...updates,
      id: draftId, // Ensure ID doesn't change
      createdAt: existing.createdAt, // Preserve creation time
      updatedAt: Date.now()
    };

    return this.saveDraft(updated);
  }

  // Delete a draft
  async deleteDraft(draftId, updateIndex = true) {
    try {
      // Get draft to find media keys
      const result = await chrome.storage.local.get(DRAFT_PREFIX + draftId);
      const draft = result[DRAFT_PREFIX + draftId];

      if (draft) {
        // Delete all media from IndexedDB
        await this.deleteAllMediaForDraft(draftId);
      }

      // Delete from chrome.storage.local
      await chrome.storage.local.remove(DRAFT_PREFIX + draftId);

      // Update index
      if (updateIndex) {
        const index = await this.getDraftsIndex();
        const newIndex = index.filter(d => d.id !== draftId);
        await this.saveDraftsIndex(newIndex);
      }

      console.log('[DraftStorage] Draft deleted:', draftId);
    } catch (error) {
      console.error('[DraftStorage] Error deleting draft:', error);
      throw error;
    }
  }

  // List all drafts (returns summary info only)
  async listDrafts() {
    const index = await this.getDraftsIndex();
    return index.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // Check if there are any drafts
  async hasDrafts() {
    const index = await this.getDraftsIndex();
    return index.length > 0;
  }

  // Get the most recent draft
  async getMostRecentDraft() {
    const index = await this.getDraftsIndex();
    if (index.length === 0) return null;

    // Sort by updatedAt descending
    const sorted = index.sort((a, b) => b.updatedAt - a.updatedAt);
    return this.getDraft(sorted[0].id);
  }

  // Clean up expired drafts
  async cleanupExpiredDrafts() {
    const expirationTime = Date.now() - (DRAFT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    const index = await this.getDraftsIndex();
    let deletedCount = 0;

    for (const draft of index) {
      if (draft.updatedAt < expirationTime) {
        await this.deleteDraft(draft.id, false);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      // Update index to remove deleted drafts
      const newIndex = index.filter(d => d.updatedAt >= expirationTime);
      await this.saveDraftsIndex(newIndex);
      console.log('[DraftStorage] Cleaned up', deletedCount, 'expired drafts');
    }

    return deletedCount;
  }

  // Clear all drafts
  async clearAllDrafts() {
    const index = await this.getDraftsIndex();

    for (const draft of index) {
      await this.deleteDraft(draft.id, false);
    }

    await this.saveDraftsIndex([]);
    console.log('[DraftStorage] All drafts cleared');
  }

  // Get storage usage info
  async getStorageUsage() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      return {
        used: bytesInUse,
        available: quota - bytesInUse,
        quota: quota,
        percentUsed: Math.round((bytesInUse / quota) * 100)
      };
    } catch (error) {
      console.error('[DraftStorage] Error getting storage usage:', error);
      return { used: 0, available: 0, quota: 0, percentUsed: 0 };
    }
  }
}

// Create singleton instance
const draftStorage = new DraftStorage();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DraftStorage;
}
