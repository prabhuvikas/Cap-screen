// Screenshot storage helper using IndexedDB for large screenshots
// IndexedDB has much higher storage limits than chrome.storage.session (several GB vs ~10MB)

const SS_DB_NAME = 'CapScreenScreenshotDB';
const SS_DB_VERSION = 1;
const SS_STORE_NAME = 'screenshots';

class ScreenshotStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(SS_DB_NAME, SS_DB_VERSION);

      request.onerror = () => {
        console.error('[ScreenshotStorage] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ScreenshotStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(SS_STORE_NAME)) {
          const objectStore = db.createObjectStore(SS_STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[ScreenshotStorage] Object store created');
        }
      };
    });
  }

  async saveScreenshots(screenshots, metadata = {}) {
    await this.init();

    const data = {
      id: 'current-screenshots', // Always use same ID to overwrite previous
      screenshots: screenshots,
      timestamp: Date.now(),
      ...metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SS_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(SS_STORE_NAME);
      const request = objectStore.put(data);

      request.onsuccess = () => {
        const totalSize = screenshots.reduce((sum, s) => sum + (s.data?.length || 0), 0);
        console.log('[ScreenshotStorage] Screenshots saved successfully, count:', screenshots.length, 'total size:', totalSize);
        resolve(data.id);
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] Error saving screenshots:', request.error);
        reject(request.error);
      };
    });
  }

  async getScreenshots(id = 'current-screenshots') {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SS_STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(SS_STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        if (request.result) {
          console.log('[ScreenshotStorage] Screenshots retrieved, count:', request.result.screenshots?.length || 0);
          resolve(request.result);
        } else {
          console.log('[ScreenshotStorage] No screenshots found with id:', id);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] Error retrieving screenshots:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteScreenshots(id = 'current-screenshots') {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SS_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(SS_STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('[ScreenshotStorage] Screenshots deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] Error deleting screenshots:', request.error);
        reject(request.error);
      };
    });
  }

  async clear() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([SS_STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(SS_STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[ScreenshotStorage] All screenshots cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[ScreenshotStorage] Error clearing screenshots:', request.error);
        reject(request.error);
      };
    });
  }
}

// Create singleton instance
const screenshotStorage = new ScreenshotStorage();
