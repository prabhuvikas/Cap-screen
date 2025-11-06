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
    this.annotations = []; // Store all annotations as objects
    this.selectedAnnotation = null;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.ready = false;

    // Zoom properties
    this.zoomLevel = 1.0;
    this.minZoom = 0.25;
    this.maxZoom = 4.0;
    this.zoomStep = 0.25;

    // Store the initialization promise
    this.initPromise = this.init();
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

    // Mark as ready
    this.ready = true;
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
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width * this.zoomLevel);
    const scaleY = this.canvas.height / (rect.height * this.zoomLevel);
    this.startX = (e.clientX - rect.left) * scaleX;
    this.startY = (e.clientY - rect.top) * scaleY;

    if (this.currentTool === 'move') {
      // Check if clicking on an annotation
      console.log('[Annotator] Move tool clicked at', this.startX, this.startY);
      console.log('[Annotator] Total annotations:', this.annotations.length);
      this.selectedAnnotation = this.findAnnotationAt(this.startX, this.startY);
      console.log('[Annotator] Selected annotation:', this.selectedAnnotation);

      if (this.selectedAnnotation) {
        this.isDragging = true;

        // Calculate offset based on annotation type
        if (this.selectedAnnotation.type === 'pen' && this.selectedAnnotation.points && this.selectedAnnotation.points.length > 0) {
          // For pen, use first point as reference
          this.dragOffsetX = this.startX - this.selectedAnnotation.points[0].x;
          this.dragOffsetY = this.startY - this.selectedAnnotation.points[0].y;
        } else {
          // For shapes, use x, y as reference
          this.dragOffsetX = this.startX - this.selectedAnnotation.x;
          this.dragOffsetY = this.startY - this.selectedAnnotation.y;
        }

        this.canvas.classList.add('grabbing-cursor');
        this.canvas.classList.remove('grab-cursor');
        this.redrawCanvas();
      } else {
        console.log('[Annotator] No annotation found at click position');
      }
    } else if (this.currentTool === 'text') {
      // Show text input at click position
      this.showTextInput(e.clientX, e.clientY, this.startX, this.startY);
    } else {
      this.isDrawing = true;

      if (this.currentTool === 'pen') {
        // Start new pen stroke
        this.currentPenStrokes = [{x: this.startX, y: this.startY}];
      } else if (['rectangle', 'circle', 'arrow', 'blackout'].includes(this.currentTool)) {
        // Store current canvas state for shape preview
        this.tempCanvasState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width * this.zoomLevel);
    const scaleY = this.canvas.height / (rect.height * this.zoomLevel);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (this.currentTool === 'move' && this.isDragging && this.selectedAnnotation) {
      // Move the selected annotation
      const newX = x - this.dragOffsetX;
      const newY = y - this.dragOffsetY;

      if (this.selectedAnnotation.type === 'pen' && this.selectedAnnotation.points) {
        // For pen strokes, calculate delta and move all points
        const deltaX = newX - this.selectedAnnotation.points[0].x;
        const deltaY = newY - this.selectedAnnotation.points[0].y;

        this.selectedAnnotation.points = this.selectedAnnotation.points.map(point => ({
          x: point.x + deltaX,
          y: point.y + deltaY
        }));
      } else if (this.selectedAnnotation.type === 'text') {
        // For text, just move x and y
        this.selectedAnnotation.x = newX;
        this.selectedAnnotation.y = newY;
      } else {
        // For shapes, move both start and end coordinates
        const deltaX = newX - this.selectedAnnotation.x;
        const deltaY = newY - this.selectedAnnotation.y;

        this.selectedAnnotation.x = newX;
        this.selectedAnnotation.y = newY;
        this.selectedAnnotation.endX += deltaX;
        this.selectedAnnotation.endY += deltaY;
      }

      // Redraw without awaiting for smooth dragging
      this.redrawCanvas();
      return;
    }

    if (!this.isDrawing) return;

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (this.currentTool === 'pen') {
      this.currentPenStrokes.push({x, y});
      // Draw the stroke preview
      if (this.currentPenStrokes.length > 1) {
        const prev = this.currentPenStrokes[this.currentPenStrokes.length - 2];
        this.ctx.beginPath();
        this.ctx.moveTo(prev.x, prev.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      }
    } else if (['rectangle', 'circle', 'arrow', 'blackout'].includes(this.currentTool)) {
      // For shapes, restore canvas state synchronously and show preview
      if (this.tempCanvasState) {
        this.ctx.putImageData(this.tempCanvasState, 0, 0);
      }
      this.drawShape(this.startX, this.startY, x, y, this.currentTool, true);
    }
  }

  async handleMouseUp(e) {
    if (this.currentTool === 'move' && this.isDragging) {
      this.isDragging = false;
      this.selectedAnnotation = null;
      this.canvas.classList.remove('grabbing-cursor');
      this.canvas.classList.add('grab-cursor');
      this.saveState();
      return;
    }

    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width * this.zoomLevel);
    const scaleY = this.canvas.height / (rect.height * this.zoomLevel);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Save annotation as object
    if (this.currentTool === 'pen' && this.currentPenStrokes && this.currentPenStrokes.length > 0) {
      const annotation = {
        type: 'pen',
        points: this.currentPenStrokes,
        color: this.currentColor,
        lineWidth: this.lineWidth
      };
      this.annotations.push(annotation);
      console.log('[Annotator] Added pen annotation, total:', this.annotations.length);
      this.currentPenStrokes = null;
    } else if (['rectangle', 'circle', 'arrow', 'blackout'].includes(this.currentTool)) {
      const annotation = {
        type: this.currentTool,
        x: this.startX,
        y: this.startY,
        endX: x,
        endY: y,
        color: this.currentColor,
        lineWidth: this.lineWidth
      };
      this.annotations.push(annotation);
      console.log('[Annotator] Added', this.currentTool, 'annotation, total:', this.annotations.length);
    }

    this.isDrawing = false;
    this.tempCanvasState = null;
    await this.redrawCanvas();
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

  // Redraw entire canvas with base image and all annotations
  async redrawCanvas() {
    // Load and draw base image
    const img = await this.loadImage(this.imageDataUrl);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, 0, 0);

    // Render all annotations
    this.annotations.forEach((annotation, index) => {
      this.renderAnnotation(annotation, index === this.annotations.indexOf(this.selectedAnnotation));
    });
  }

  // Render a single annotation
  renderAnnotation(annotation, isSelected = false) {
    this.ctx.strokeStyle = annotation.color;
    this.ctx.lineWidth = annotation.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (annotation.type === 'pen') {
      // Draw pen stroke
      if (annotation.points && annotation.points.length > 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
        for (let i = 1; i < annotation.points.length; i++) {
          this.ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
        }
        this.ctx.stroke();

        // Draw selection box for pen stroke
        if (isSelected) {
          const xs = annotation.points.map(p => p.x);
          const ys = annotation.points.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          this.drawSelectionBox(minX, minY, maxX, maxY);
        }
      }
    } else if (annotation.type === 'rectangle') {
      const width = annotation.endX - annotation.x;
      const height = annotation.endY - annotation.y;
      this.ctx.strokeRect(annotation.x, annotation.y, width, height);

      // Draw selection handles
      if (isSelected) {
        this.drawSelectionBox(annotation.x, annotation.y, annotation.endX, annotation.endY);
      }
    } else if (annotation.type === 'circle') {
      const radius = Math.sqrt(Math.pow(annotation.endX - annotation.x, 2) + Math.pow(annotation.endY - annotation.y, 2));
      this.ctx.beginPath();
      this.ctx.arc(annotation.x, annotation.y, radius, 0, 2 * Math.PI);
      this.ctx.stroke();

      // Draw selection handles
      if (isSelected) {
        this.drawSelectionBox(
          annotation.x - radius,
          annotation.y - radius,
          annotation.x + radius,
          annotation.y + radius
        );
      }
    } else if (annotation.type === 'arrow') {
      this.drawArrow(annotation.x, annotation.y, annotation.endX, annotation.endY);

      // Draw selection handles
      if (isSelected) {
        this.drawSelectionBox(
          Math.min(annotation.x, annotation.endX),
          Math.min(annotation.y, annotation.endY),
          Math.max(annotation.x, annotation.endX),
          Math.max(annotation.y, annotation.endY)
        );
      }
    } else if (annotation.type === 'blackout') {
      const width = annotation.endX - annotation.x;
      const height = annotation.endY - annotation.y;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(annotation.x, annotation.y, width, height);

      // Draw selection handles
      if (isSelected) {
        this.drawSelectionBox(annotation.x, annotation.y, annotation.endX, annotation.endY);
      }
    } else if (annotation.type === 'text') {
      this.ctx.fillStyle = annotation.color;
      this.ctx.font = `${annotation.fontSize}px Arial`;
      this.ctx.fillText(annotation.text, annotation.x, annotation.y);

      // Draw selection box for text
      if (isSelected) {
        const metrics = this.ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = annotation.fontSize;
        this.drawSelectionBox(annotation.x, annotation.y - textHeight, annotation.x + textWidth, annotation.y);
      }
    }
  }

  // Draw selection box around annotation
  drawSelectionBox(x1, y1, x2, y2) {
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x1 - 5, y1 - 5, x2 - x1 + 10, y2 - y1 + 10);
    this.ctx.setLineDash([]);
  }

  // Find annotation at given coordinates
  findAnnotationAt(x, y) {
    // Check in reverse order (top annotation first)
    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const annotation = this.annotations[i];

      if (annotation.type === 'pen') {
        // Check if point is near any stroke point
        for (const point of annotation.points) {
          const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
          if (distance < annotation.lineWidth + 5) {
            return annotation;
          }
        }
      } else if (annotation.type === 'rectangle' || annotation.type === 'blackout') {
        const minX = Math.min(annotation.x, annotation.endX);
        const maxX = Math.max(annotation.x, annotation.endX);
        const minY = Math.min(annotation.y, annotation.endY);
        const maxY = Math.max(annotation.y, annotation.endY);

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return annotation;
        }
      } else if (annotation.type === 'circle') {
        const radius = Math.sqrt(Math.pow(annotation.endX - annotation.x, 2) + Math.pow(annotation.endY - annotation.y, 2));
        const distance = Math.sqrt(Math.pow(x - annotation.x, 2) + Math.pow(y - annotation.y, 2));

        if (Math.abs(distance - radius) < annotation.lineWidth + 5) {
          return annotation;
        }
      } else if (annotation.type === 'arrow') {
        // Check if point is near the arrow line
        const distance = this.distanceToLine(x, y, annotation.x, annotation.y, annotation.endX, annotation.endY);
        if (distance < annotation.lineWidth + 5) {
          return annotation;
        }
      } else if (annotation.type === 'text') {
        // Check if point is inside text bounding box
        this.ctx.font = `${annotation.fontSize}px Arial`;
        const metrics = this.ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = annotation.fontSize;

        if (x >= annotation.x && x <= annotation.x + textWidth &&
            y >= annotation.y - textHeight && y <= annotation.y) {
          return annotation;
        }
      }
    }

    return null;
  }

  // Calculate distance from point to line segment
  distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq != 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  showTextInput(clientX, clientY, canvasX, canvasY) {
    // Remove any existing text input
    const existingInput = document.getElementById('annotationTextInput');
    if (existingInput) {
      existingInput.remove();
    }

    // Get canvas container position for proper positioning
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const inputX = clientX - containerRect.left;
    const inputY = clientY - containerRect.top;

    // Create input element
    const input = document.createElement('input');
    input.id = 'annotationTextInput';
    input.type = 'text';
    input.style.position = 'absolute';
    input.style.left = inputX + 'px';
    input.style.top = inputY + 'px';
    input.style.fontSize = (this.lineWidth * 5) + 'px';
    input.style.color = this.currentColor;
    input.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    input.style.border = '2px solid ' + this.currentColor;
    input.style.outline = 'none';
    input.style.padding = '4px 8px';
    input.style.fontFamily = 'Arial';
    input.style.zIndex = '10000';
    input.style.minWidth = '200px';
    input.style.borderRadius = '4px';

    // Add to canvas parent
    this.canvas.parentElement.appendChild(input);

    // Small delay before focusing to prevent immediate blur
    setTimeout(() => {
      input.focus();
    }, 10);

    // Handle Enter key to save text
    const handleKeydown = async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
          await this.addText(canvasX, canvasY, text);
        }
        cleanup();
      } else if (e.key === 'Escape') {
        cleanup();
      }
    };

    // Handle click outside to cancel
    const handleClickOutside = (e) => {
      if (e.target !== input) {
        cleanup();
      }
    };

    const cleanup = () => {
      input.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleClickOutside);
      input.remove();
    };

    input.addEventListener('keydown', handleKeydown);

    // Use mousedown on document instead of blur
    // Delay adding this listener to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
  }

  async addText(x, y, text) {
    if (!text) return;

    const annotation = {
      type: 'text',
      x: x,
      y: y,
      text: text,
      color: this.currentColor,
      fontSize: this.lineWidth * 5
    };
    this.annotations.push(annotation);
    console.log('[Annotator] Added text annotation, total:', this.annotations.length);

    await this.redrawCanvas();
    this.saveState();
  }

  setTool(tool) {
    console.log('[Annotator] Tool changed to:', tool);
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
    // Clear all annotations
    this.annotations = [];
    this.selectedAnnotation = null;
    this.redrawCanvas().then(() => {
      this.history = [];
      this.historyStep = -1;
      this.saveState();
    });
  }

  getAnnotatedImage() {
    return this.canvas.toDataURL('image/png');
  }

  // Get the current state (for saving annotations when switching screenshots)
  getState() {
    return {
      history: this.history.slice(),
      historyStep: this.historyStep,
      currentTool: this.currentTool,
      currentColor: this.currentColor,
      lineWidth: this.lineWidth,
      annotations: JSON.parse(JSON.stringify(this.annotations)), // Deep copy
      zoomLevel: this.zoomLevel
    };
  }

  // Restore a saved state (when switching back to a screenshot)
  async restoreState(state) {
    if (!state) return;

    console.log('[Annotator] Restoring state:', state);

    this.history = state.history ? state.history.slice() : [];
    this.historyStep = state.historyStep !== undefined ? state.historyStep : -1;
    this.currentTool = state.currentTool || 'pen';
    this.currentColor = state.currentColor || '#ff0000';
    this.lineWidth = state.lineWidth || 3;
    this.annotations = state.annotations ? JSON.parse(JSON.stringify(state.annotations)) : [];

    // Restore zoom level if saved
    if (state.zoomLevel) {
      this.zoomLevel = state.zoomLevel;
      this.applyZoom();
    }

    // Restore the canvas to the last history state
    if (this.historyStep >= 0 && this.historyStep < this.history.length) {
      const img = await this.loadImage(this.history[this.historyStep]);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      console.log('[Annotator] State restored successfully');
    } else {
      // If no history, just redraw from annotations
      await this.redrawCanvas();
    }
  }

  // Zoom methods
  setZoom(level) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.applyZoom();
    console.log('[Annotator] Zoom level set to:', this.zoomLevel);
    return this.zoomLevel;
  }

  zoomIn() {
    const newZoom = this.zoomLevel + this.zoomStep;
    return this.setZoom(newZoom);
  }

  zoomOut() {
    const newZoom = this.zoomLevel - this.zoomStep;
    return this.setZoom(newZoom);
  }

  zoomReset() {
    return this.setZoom(1.0);
  }

  applyZoom() {
    // Apply CSS transform to scale the canvas
    this.canvas.style.transform = `scale(${this.zoomLevel})`;
    this.canvas.style.transformOrigin = 'top left';

    // Update canvas container to handle overflow
    const container = this.canvas.parentElement;
    if (container) {
      container.style.overflow = 'auto';
    }
  }

  getZoomLevel() {
    return this.zoomLevel;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Annotator;
}
