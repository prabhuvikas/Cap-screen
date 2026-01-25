// Jest setup file for browser API mocks

// Mock chrome extension APIs
global.chrome = {
  storage: {
    session: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
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
