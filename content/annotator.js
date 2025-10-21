// Screenshot annotation tool

class Annotator {
  constructor(canvas, imageDataUrl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageDataUrl = imageDataUrl;
    this.isDrawing = false;
    this.currentTool = 'pen';
    this.currentColor = '#ff0000';
    this.lineWidth = 3;
    this.history = [];
    this.historyStep = -1;
    this.startX = 0;
    this.startY = 0;
    this.shapes = [];

    this.init();
  }

  async init() {
    // Load the screenshot image
    const img = await this.loadImage(this.imageDataUrl);

    // Set canvas size to match image
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    // Draw the image
    this.ctx.drawImage(img, 0, 0);

    // Save initial state
    this.saveState();

    // Setup event listeners
    this.setupEventListeners();
  }

  loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  handleMouseDown(e) {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;

    if (this.currentTool === 'pen') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
    }
  }

  handleMouseMove(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.currentTool === 'pen') {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    } else if (['rectangle', 'circle', 'arrow', 'blackout'].includes(this.currentTool)) {
      // For shapes, we need to redraw from history and show preview
      this.restoreState();
      this.drawShape(this.startX, this.startY, x, y, this.currentTool, true);
    }
  }

  handleMouseUp(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (['rectangle', 'circle', 'arrow', 'blackout'].includes(this.currentTool)) {
      this.drawShape(this.startX, this.startY, x, y, this.currentTool, false);
    }

    this.isDrawing = false;
    this.saveState();
  }

  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.canvas.dispatchEvent(mouseEvent);
  }

  handleTouchEnd(e) {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.canvas.dispatchEvent(mouseEvent);
  }

  drawShape(startX, startY, endX, endY, shape, isPreview) {
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (shape === 'rectangle') {
      const width = endX - startX;
      const height = endY - startY;
      this.ctx.strokeRect(startX, startY, width, height);
    } else if (shape === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      this.ctx.beginPath();
      this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    } else if (shape === 'arrow') {
      this.drawArrow(startX, startY, endX, endY);
    } else if (shape === 'blackout') {
      this.drawBlackout(startX, startY, endX, endY);
    }
  }

  drawArrow(fromX, fromY, toX, toY) {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Draw arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.stroke();
  }

  drawBlackout(startX, startY, endX, endY) {
    // Draw a filled black rectangle to redact/hide sensitive information
    const width = endX - startX;
    const height = endY - startY;

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(startX, startY, width, height);
  }

  addText(x, y, text) {
    this.ctx.fillStyle = this.currentColor;
    this.ctx.font = `${this.lineWidth * 5}px Arial`;
    this.ctx.fillText(text, x, y);
    this.saveState();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setColor(color) {
    this.currentColor = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  saveState() {
    this.historyStep++;
    if (this.historyStep < this.history.length) {
      this.history.length = this.historyStep;
    }
    this.history.push(this.canvas.toDataURL());
  }

  restoreState() {
    if (this.historyStep >= 0 && this.historyStep < this.history.length) {
      const img = new Image();
      img.src = this.history[this.historyStep];
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);
      };
    }
  }

  undo() {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.restoreState();
    }
  }

  redo() {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++;
      this.restoreState();
    }
  }

  clear() {
    // Reload original image
    const img = new Image();
    img.src = this.imageDataUrl;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      this.history = [];
      this.historyStep = -1;
      this.saveState();
    };
  }

  getAnnotatedImage() {
    return this.canvas.toDataURL('image/png');
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Annotator;
}
