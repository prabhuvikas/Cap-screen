// Video storage helper using IndexedDB for large videos
// IndexedDB has much higher storage limits than chrome.storage (several GB vs 10MB)

const DB_NAME = 'CapScreenVideoDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

class VideoStorage {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[VideoStorage] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[VideoStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[VideoStorage] Object store created');
        }
      };
    });
  }

  async saveVideo(videoDataUrl, metadata = {}) {
    await this.init();

    const videoData = {
      id: 'current-recording', // Always use same ID to overwrite previous
      dataUrl: videoDataUrl,
      timestamp: Date.now(),
      size: videoDataUrl.length,
      ...metadata
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put(videoData);

      request.onsuccess = () => {
        console.log('[VideoStorage] Video saved successfully, size:', videoDataUrl.length);
        resolve(videoData.id);
      };

      request.onerror = () => {
        console.error('[VideoStorage] Error saving video:', request.error);
        reject(request.error);
      };
    });
  }

  async getVideo(id = 'current-recording') {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(id);

      request.onsuccess = () => {
        if (request.result) {
          console.log('[VideoStorage] Video retrieved, size:', request.result.dataUrl.length);
          resolve(request.result);
        } else {
          console.log('[VideoStorage] No video found with id:', id);
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('[VideoStorage] Error retrieving video:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteVideo(id = 'current-recording') {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('[VideoStorage] Video deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[VideoStorage] Error deleting video:', request.error);
        reject(request.error);
      };
    });
  }

  async clear() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('[VideoStorage] All videos cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('[VideoStorage] Error clearing videos:', request.error);
        reject(request.error);
      };
    });
  }
}

// Create singleton instance
const videoStorage = new VideoStorage();
