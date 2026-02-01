// Jest setup file for browser API mocks

// Mock chrome extension APIs
global.chrome = {
  storage: {
    session: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      getBytesInUse: jest.fn().mockResolvedValue(0),
      QUOTA_BYTES: 10485760
    },
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://mock-id/${path}`)
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn()
  }
};

// Mock IndexedDB
class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }

  _succeed(result) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  _fail(error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBObjectStore {
  constructor(name) {
    this.name = name;
    this._data = new Map();
    this._indexes = new Map();
  }

  put(value) {
    const request = new MockIDBRequest();
    const key = value.key || value.id;
    this._data.set(key, value);
    setTimeout(() => request._succeed(key), 0);
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    setTimeout(() => request._succeed(this._data.get(key)), 0);
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    this._data.delete(key);
    setTimeout(() => request._succeed(), 0);
    return request;
  }

  createIndex(name, keyPath, options) {
    this._indexes.set(name, { keyPath, options });
    return { name, keyPath };
  }

  index(name) {
    return {
      openCursor: (range) => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          // Return null cursor (no results) for simplicity
          request._succeed(null);
        }, 0);
        return request;
      }
    };
  }
}

class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this._stores = {};
    for (const name of storeNames) {
      this._stores[name] = db._stores.get(name) || new MockIDBObjectStore(name);
    }
  }

  objectStore(name) {
    return this._stores[name];
  }
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._stores = new Map();
    this.objectStoreNames = {
      contains: (name) => this._stores.has(name)
    };
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore(name);
    this._stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode);
  }

  close() {}
}

class MockIDBFactory {
  constructor() {
    this._databases = new Map();
  }

  open(name, version) {
    const request = new MockIDBRequest();

    setTimeout(() => {
      let db = this._databases.get(name);
      const isNew = !db;
      const needsUpgrade = isNew || (db && db.version < version);

      if (isNew) {
        db = new MockIDBDatabase(name, version);
        this._databases.set(name, db);
      }

      if (needsUpgrade) {
        db.version = version;
        request.result = db;
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request, oldVersion: 0, newVersion: version });
        }
      }

      request._succeed(db);
    }, 0);

    return request;
  }

  deleteDatabase(name) {
    const request = new MockIDBRequest();
    this._databases.delete(name);
    setTimeout(() => request._succeed(), 0);
    return request;
  }
}

global.indexedDB = new MockIDBFactory();
global.IDBKeyRange = {
  only: (value) => ({ value, type: 'only' }),
  bound: (lower, upper) => ({ lower, upper, type: 'bound' })
};

// Create a minimal canvas mock that works with the Annotator
class MockCanvasRenderingContext2D {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.font = '10px sans-serif';
  }

  clearRect() {}
  fillRect() {}
  strokeRect() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  stroke() {}
  fill() {}
  fillText() {}
  setLineDash() {}
  save() {}
  restore() {}
  clip() {}
  rect() {}
  getImageData() {
    return { data: new Uint8ClampedArray(4) };
  }
  putImageData() {}
  drawImage() {}
  measureText(text) {
    return { width: text.length * 10 };
  }
}

// Override HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    return new MockCanvasRenderingContext2D();
  }
  return null;
};

// Mock toDataURL
HTMLCanvasElement.prototype.toDataURL = function() {
  return 'data:image/png;base64,mockImageData';
};

// Mock Image loading
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 800;
    this.height = 600;
  }

  set src(value) {
    this._src = value;
    // Simulate async image load
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }

  get src() {
    return this._src;
  }
};
