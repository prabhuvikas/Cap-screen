/**
 * Unit tests for Annotator class
 * Tests core functionality: state management, undo/redo, crop, annotations
 */

// Load the Annotator class
const Annotator = require('../content/annotator.js');

describe('Annotator', () => {
  let canvas;
  let annotator;
  const mockImageDataUrl = 'data:image/png;base64,mockImageData';

  beforeEach(async () => {
    // Create a mock canvas element
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create container for canvas
    const container = document.createElement('div');
    container.appendChild(canvas);
    document.body.appendChild(container);

    // Create annotator instance
    annotator = new Annotator(canvas, mockImageDataUrl);

    // Wait for initialization
    await annotator.initPromise;
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(annotator.currentTool).toBe('pen');
      expect(annotator.currentColor).toBe('#ff0000');
      expect(annotator.lineWidth).toBe(3);
      expect(annotator.zoomLevel).toBe(1.0);
      expect(annotator.annotations).toEqual([]);
      expect(annotator.ready).toBe(true);
    });

    test('should save initial state on init', () => {
      expect(annotator.history.length).toBe(1);
      expect(annotator.historyStep).toBe(0);
    });

    test('should have canvas dimensions set', () => {
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('saveState()', () => {
    test('should increment historyStep', () => {
      const initialStep = annotator.historyStep;
      annotator.saveState();
      expect(annotator.historyStep).toBe(initialStep + 1);
    });

    test('should add state object to history', () => {
      const initialLength = annotator.history.length;
      annotator.saveState();
      expect(annotator.history.length).toBe(initialLength + 1);
    });

    test('should save state with correct structure', () => {
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 }];
      annotator.saveState();

      const state = annotator.history[annotator.historyStep];
      expect(state).toHaveProperty('canvasData');
      expect(state).toHaveProperty('annotations');
      expect(state).toHaveProperty('imageDataUrl');
      expect(state).toHaveProperty('canvasWidth');
      expect(state).toHaveProperty('canvasHeight');
    });

    test('should deep copy annotations', () => {
      const annotation = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 };
      annotator.annotations = [annotation];
      annotator.saveState();

      // Modify original
      annotation.x = 999;

      // Saved state should not be affected
      const state = annotator.history[annotator.historyStep];
      expect(state.annotations[0].x).toBe(10);
    });

    test('should truncate redo stack when saving new state after undo', () => {
      // Save 3 states
      annotator.saveState();
      annotator.saveState();
      annotator.saveState();

      const lengthBefore = annotator.history.length;

      // Undo twice
      annotator.undo();
      annotator.undo();

      // Save new state (should clear redo stack)
      annotator.saveState();

      // History should be truncated
      expect(annotator.history.length).toBeLessThan(lengthBefore);
    });
  });

  describe('undo()', () => {
    test('should decrement historyStep', async () => {
      annotator.saveState();
      const stepBefore = annotator.historyStep;

      annotator.undo();

      expect(annotator.historyStep).toBe(stepBefore - 1);
    });

    test('should not go below 0', () => {
      // Try to undo at initial state
      annotator.undo();
      annotator.undo();
      annotator.undo();

      expect(annotator.historyStep).toBeGreaterThanOrEqual(0);
    });

    test('should restore annotations array', async () => {
      // Add annotation and save
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 }];
      annotator.saveState();

      // Add another annotation and save
      annotator.annotations.push({ type: 'circle', x: 50, y: 50, endX: 100, endY: 100, color: '#00ff00', lineWidth: 3 });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(2);

      // Undo
      annotator.undo();

      // Wait for redraw
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(1);
    });

    test('should clear selection when undoing', () => {
      annotator.selectedAnnotation = { type: 'rectangle' };
      annotator.saveState();

      annotator.undo();

      expect(annotator.selectedAnnotation).toBeNull();
    });
  });

  describe('redo()', () => {
    test('should increment historyStep after undo', () => {
      annotator.saveState();
      annotator.undo();

      const stepBefore = annotator.historyStep;
      annotator.redo();

      expect(annotator.historyStep).toBe(stepBefore + 1);
    });

    test('should not go beyond history length', () => {
      annotator.saveState();

      // Try to redo without undo
      const stepBefore = annotator.historyStep;
      annotator.redo();

      expect(annotator.historyStep).toBe(stepBefore);
    });

    test('should restore annotations after undo-redo', async () => {
      // Add annotations
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 }];
      annotator.saveState();

      annotator.annotations.push({ type: 'circle', x: 50, y: 50, endX: 100, endY: 100, color: '#00ff00', lineWidth: 3 });
      annotator.saveState();

      // Undo
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(1);

      // Redo
      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(2);
    });
  });

  describe('Tool Selection', () => {
    test('setTool should update currentTool', () => {
      annotator.setTool('rectangle');
      expect(annotator.currentTool).toBe('rectangle');

      annotator.setTool('circle');
      expect(annotator.currentTool).toBe('circle');

      annotator.setTool('move');
      expect(annotator.currentTool).toBe('move');
    });

    test('setColor should update currentColor', () => {
      annotator.setColor('#00ff00');
      expect(annotator.currentColor).toBe('#00ff00');
    });

    test('setLineWidth should update lineWidth', () => {
      annotator.setLineWidth(5);
      expect(annotator.lineWidth).toBe(5);
    });
  });

  describe('Zoom', () => {
    test('setZoom should update zoomLevel', () => {
      annotator.setZoom(2.0);
      expect(annotator.zoomLevel).toBe(2.0);
    });

    test('setZoom should clamp to minZoom', () => {
      annotator.setZoom(0.1);
      expect(annotator.zoomLevel).toBe(annotator.minZoom);
    });

    test('setZoom should clamp to maxZoom', () => {
      annotator.setZoom(10);
      expect(annotator.zoomLevel).toBe(annotator.maxZoom);
    });

    test('zoomIn should increase by zoomStep', () => {
      const before = annotator.zoomLevel;
      annotator.zoomIn();
      expect(annotator.zoomLevel).toBe(before + annotator.zoomStep);
    });

    test('zoomOut should decrease by zoomStep', () => {
      annotator.setZoom(2.0);
      const before = annotator.zoomLevel;
      annotator.zoomOut();
      expect(annotator.zoomLevel).toBe(before - annotator.zoomStep);
    });

    test('zoomReset should return to 1.0', () => {
      annotator.setZoom(3.0);
      annotator.zoomReset();
      expect(annotator.zoomLevel).toBe(1.0);
    });
  });

  describe('Annotation Management', () => {
    test('annotations array should start empty', () => {
      expect(annotator.annotations).toEqual([]);
    });

    test('deleteSelectedAnnotation should remove annotation', async () => {
      const annotation = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 };
      annotator.annotations = [annotation];
      annotator.selectedAnnotation = annotation;

      annotator.deleteSelectedAnnotation();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('deleteSelectedAnnotation should do nothing if no selection', () => {
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 }];
      annotator.selectedAnnotation = null;

      annotator.deleteSelectedAnnotation();

      expect(annotator.annotations.length).toBe(1);
    });
  });

  describe('adjustAnnotationForCrop', () => {
    test('should adjust rectangle coordinates', () => {
      const annotation = { type: 'rectangle', x: 100, y: 100, endX: 200, endY: 200, color: '#ff0000', lineWidth: 3 };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 50, 50);

      expect(adjusted.x).toBe(50);
      expect(adjusted.y).toBe(50);
      expect(adjusted.endX).toBe(150);
      expect(adjusted.endY).toBe(150);
    });

    test('should adjust pen points', () => {
      const annotation = {
        type: 'pen',
        points: [{ x: 100, y: 100 }, { x: 150, y: 150 }],
        color: '#ff0000',
        lineWidth: 3
      };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 50, 50);

      expect(adjusted.points[0].x).toBe(50);
      expect(adjusted.points[0].y).toBe(50);
      expect(adjusted.points[1].x).toBe(100);
      expect(adjusted.points[1].y).toBe(100);
    });

    test('should adjust text position', () => {
      const annotation = { type: 'text', x: 100, y: 100, text: 'Test', color: '#ff0000', fontSize: 15 };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 50, 50);

      expect(adjusted.x).toBe(50);
      expect(adjusted.y).toBe(50);
    });

    test('should return null for out of bounds rectangle', () => {
      const annotation = { type: 'rectangle', x: -100, y: -100, endX: -50, endY: -50, color: '#ff0000', lineWidth: 3 };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 0, 0);

      expect(adjusted).toBeNull();
    });

    test('should return null for out of bounds text', () => {
      const annotation = { type: 'text', x: -50, y: -50, text: 'Test', color: '#ff0000', fontSize: 15 };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 0, 0);

      expect(adjusted).toBeNull();
    });

    test('should return null for out of bounds pen', () => {
      const annotation = {
        type: 'pen',
        points: [{ x: -100, y: -100 }, { x: -50, y: -50 }],
        color: '#ff0000',
        lineWidth: 3
      };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 0, 0);

      expect(adjusted).toBeNull();
    });

    test('should keep partially visible shape', () => {
      const annotation = { type: 'rectangle', x: -50, y: -50, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 };
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 0, 0);

      expect(adjusted).not.toBeNull();
    });
  });

  describe('getState / restoreState', () => {
    test('getState should return complete state object', () => {
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 }];
      annotator.currentTool = 'circle';
      annotator.currentColor = '#00ff00';
      annotator.zoomLevel = 2.0;

      const state = annotator.getState();

      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('historyStep');
      expect(state).toHaveProperty('currentTool', 'circle');
      expect(state).toHaveProperty('currentColor', '#00ff00');
      expect(state).toHaveProperty('lineWidth');
      expect(state).toHaveProperty('annotations');
      expect(state).toHaveProperty('zoomLevel', 2.0);
    });

    test('getState should deep copy annotations', () => {
      const annotation = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 };
      annotator.annotations = [annotation];

      const state = annotator.getState();
      annotation.x = 999;

      expect(state.annotations[0].x).toBe(10);
    });

    test('restoreState should restore all properties', async () => {
      const state = {
        history: [],
        historyStep: -1,
        currentTool: 'arrow',
        currentColor: '#0000ff',
        lineWidth: 7,
        annotations: [{ type: 'circle', x: 50, y: 50, endX: 100, endY: 100 }],
        zoomLevel: 1.5
      };

      await annotator.restoreState(state);

      expect(annotator.currentTool).toBe('arrow');
      expect(annotator.currentColor).toBe('#0000ff');
      expect(annotator.lineWidth).toBe(7);
      expect(annotator.annotations.length).toBe(1);
      expect(annotator.zoomLevel).toBe(1.5);
    });

    test('restoreState should handle null state', async () => {
      const toolBefore = annotator.currentTool;
      await annotator.restoreState(null);
      expect(annotator.currentTool).toBe(toolBefore);
    });

    test('restoreState should handle new history format', async () => {
      const state = {
        history: [{
          canvasData: 'data:image/png;base64,test',
          annotations: [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 }],
          imageDataUrl: 'data:image/png;base64,test',
          canvasWidth: 800,
          canvasHeight: 600
        }],
        historyStep: 0,
        currentTool: 'pen',
        currentColor: '#ff0000',
        lineWidth: 3,
        annotations: []
      };

      // Should not throw error
      await annotator.restoreState(state);
    });

    test('restoreState should handle legacy string history format', async () => {
      const state = {
        history: ['data:image/png;base64,legacyFormat'],
        historyStep: 0,
        currentTool: 'pen',
        currentColor: '#ff0000',
        lineWidth: 3,
        annotations: []
      };

      // Should not throw error
      await annotator.restoreState(state);
    });
  });

  describe('clear()', () => {
    test('should clear all annotations', async () => {
      annotator.annotations = [
        { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 },
        { type: 'circle', x: 50, y: 50, endX: 100, endY: 100 }
      ];

      annotator.clear();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('should clear selection', async () => {
      annotator.selectedAnnotation = { type: 'rectangle' };

      annotator.clear();

      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('should reset history', async () => {
      annotator.saveState();
      annotator.saveState();

      annotator.clear();

      await new Promise(resolve => setTimeout(resolve, 10));

      // After clear, should have fresh history with just initial state
      expect(annotator.history.length).toBe(1);
      expect(annotator.historyStep).toBe(0);
    });
  });

  describe('findAnnotationAt', () => {
    test('should find rectangle at coordinates', () => {
      const annotation = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 };
      annotator.annotations = [annotation];

      const found = annotator.findAnnotationAt(50, 50);

      expect(found).toBe(annotation);
    });

    test('should not find rectangle outside bounds', () => {
      const annotation = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 };
      annotator.annotations = [annotation];

      const found = annotator.findAnnotationAt(200, 200);

      expect(found).toBeNull();
    });

    test('should find topmost annotation when overlapping', () => {
      const bottom = { type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100, color: '#ff0000', lineWidth: 3 };
      const top = { type: 'rectangle', x: 20, y: 20, endX: 80, endY: 80, color: '#00ff00', lineWidth: 3 };
      annotator.annotations = [bottom, top];

      const found = annotator.findAnnotationAt(50, 50);

      expect(found).toBe(top);
    });

    test('should find blackout at coordinates', () => {
      const annotation = { type: 'blackout', x: 10, y: 10, endX: 100, endY: 100, color: '#000000', lineWidth: 3 };
      annotator.annotations = [annotation];

      const found = annotator.findAnnotationAt(50, 50);

      expect(found).toBe(annotation);
    });

    test('should return null for empty annotations', () => {
      annotator.annotations = [];

      const found = annotator.findAnnotationAt(50, 50);

      expect(found).toBeNull();
    });
  });

  describe('Crop State', () => {
    test('applyCrop should reject small crop areas', async () => {
      annotator.cropActive = true;
      annotator.cropStartX = 0;
      annotator.cropStartY = 0;
      annotator.cropEndX = 5;
      annotator.cropEndY = 5;

      // Mock alert
      global.alert = jest.fn();

      const result = await annotator.applyCrop();

      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalled();
    });

    test('applyCrop should return undefined if not active', async () => {
      annotator.cropActive = false;

      const result = await annotator.applyCrop();

      expect(result).toBeUndefined();
    });

    test('cancelCrop should reset crop state', () => {
      annotator.cropActive = true;
      annotator.isCropping = true;

      annotator.cancelCrop();

      expect(annotator.cropActive).toBe(false);
      expect(annotator.isCropping).toBe(false);
    });
  });

  // ============================================
  // BUG FIX VERIFICATION TESTS
  // These tests verify the specific bugs that were fixed
  // ============================================

  describe('Bug Fix: Undo/Redo with annotations', () => {
    test('undo should restore annotations array correctly', async () => {
      // Initial state: no annotations
      expect(annotator.annotations.length).toBe(0);

      // Add first annotation
      const rect1 = { type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50, color: '#ff0000', lineWidth: 3 };
      annotator.annotations.push(rect1);
      annotator.saveState();

      // Add second annotation
      const rect2 = { type: 'rectangle', x: 60, y: 60, endX: 100, endY: 100, color: '#00ff00', lineWidth: 3 };
      annotator.annotations.push(rect2);
      annotator.saveState();

      expect(annotator.annotations.length).toBe(2);

      // Undo - should have 1 annotation
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].color).toBe('#ff0000');

      // Undo again - should have 0 annotations
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(0);

      // Redo - should have 1 annotation
      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(1);

      // Redo again - should have 2 annotations
      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(2);
    });

    test('undo should restore imageDataUrl after crop', async () => {
      const originalImageUrl = annotator.imageDataUrl;

      // Simulate crop by changing imageDataUrl
      annotator.imageDataUrl = 'data:image/png;base64,croppedImage';
      annotator.saveState();

      // Undo should restore original imageDataUrl
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.imageDataUrl).toBe(originalImageUrl);
    });

    test('undo should restore canvas dimensions after crop', async () => {
      const originalWidth = annotator.canvas.width;
      const originalHeight = annotator.canvas.height;

      // Simulate crop by changing dimensions
      annotator.canvas.width = 400;
      annotator.canvas.height = 300;
      annotator.saveState();

      // Undo should restore original dimensions
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.canvas.width).toBe(originalWidth);
      expect(annotator.canvas.height).toBe(originalHeight);
    });
  });

  describe('Bug Fix: No duplicate annotations after crop + move', () => {
    test('annotations array should not duplicate after adjustAnnotationForCrop', () => {
      // Create annotation at position (100, 100)
      const annotation = {
        type: 'rectangle',
        x: 100, y: 100,
        endX: 200, endY: 200,
        color: '#ff0000',
        lineWidth: 3
      };
      annotator.annotations = [annotation];

      // Simulate crop with offset (50, 50)
      const adjusted = annotator.adjustAnnotationForCrop(annotation, 50, 50);

      // The original annotation should not be modified
      expect(annotation.x).toBe(100);
      expect(annotation.y).toBe(100);

      // The adjusted annotation should have new coordinates
      expect(adjusted.x).toBe(50);
      expect(adjusted.y).toBe(50);
      expect(adjusted.endX).toBe(150);
      expect(adjusted.endY).toBe(150);
    });

    test('applyCrop should filter and adjust annotations without duplicating', async () => {
      // Setup: Add an annotation
      annotator.annotations = [
        { type: 'rectangle', x: 100, y: 100, endX: 200, endY: 200, color: '#ff0000', lineWidth: 3 }
      ];

      // Setup crop area that includes the annotation
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 250;
      annotator.cropEndY = 250;

      const annotationCountBefore = annotator.annotations.length;

      await annotator.applyCrop();

      // Should still have exactly 1 annotation (not duplicated)
      expect(annotator.annotations.length).toBe(annotationCountBefore);

      // Annotation should be adjusted
      expect(annotator.annotations[0].x).toBe(50); // 100 - 50
      expect(annotator.annotations[0].y).toBe(50); // 100 - 50
    });
  });

  describe('Bug Fix: History format compatibility', () => {
    test('saveState should create objects with all required fields', () => {
      annotator.annotations = [{ type: 'rectangle', x: 10, y: 10, endX: 100, endY: 100 }];
      annotator.saveState();

      const lastState = annotator.history[annotator.historyStep];

      expect(lastState).toHaveProperty('canvasData');
      expect(lastState).toHaveProperty('annotations');
      expect(lastState).toHaveProperty('imageDataUrl');
      expect(lastState).toHaveProperty('canvasWidth');
      expect(lastState).toHaveProperty('canvasHeight');

      expect(typeof lastState.canvasData).toBe('string');
      expect(Array.isArray(lastState.annotations)).toBe(true);
      expect(typeof lastState.imageDataUrl).toBe('string');
      expect(typeof lastState.canvasWidth).toBe('number');
      expect(typeof lastState.canvasHeight).toBe('number');
    });

    test('restoreStateFromHistory should handle object format via undo-redo', () => {
      // Save a state with annotation
      annotator.annotations = [{ type: 'circle', x: 50, y: 50, endX: 100, endY: 100, color: '#0000ff', lineWidth: 5 }];
      annotator.saveState();

      // Save another state with different annotation
      annotator.annotations.push({ type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50, color: '#ff0000', lineWidth: 3 });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(2);

      // Undo - should restore to state with 1 annotation
      annotator.undo();

      // Wait for async operations
      return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
        // Should be back to 1 annotation (the circle)
        expect(annotator.annotations.length).toBe(1);
        expect(annotator.annotations[0].type).toBe('circle');
        expect(annotator.annotations[0].color).toBe('#0000ff');
      });
    });

    test('restoreState should extract canvasData from object history entries', async () => {
      const state = {
        history: [{
          canvasData: 'data:image/png;base64,specificTestData',
          annotations: [],
          imageDataUrl: 'data:image/png;base64,baseImage',
          canvasWidth: 640,
          canvasHeight: 480
        }],
        historyStep: 0,
        currentTool: 'pen',
        currentColor: '#ff0000',
        lineWidth: 3,
        annotations: []
      };

      // This should not throw an error about [object Object]
      await annotator.restoreState(state);

      // The state should be properly restored
      expect(annotator.historyStep).toBe(0);
    });
  });

  describe('State consistency', () => {
    test('multiple undo/redo operations should maintain consistency', async () => {
      // Build up history
      for (let i = 0; i < 5; i++) {
        annotator.annotations.push({
          type: 'rectangle',
          x: i * 20,
          y: i * 20,
          endX: i * 20 + 50,
          endY: i * 20 + 50,
          color: '#ff0000',
          lineWidth: 3
        });
        annotator.saveState();
      }

      expect(annotator.annotations.length).toBe(5);

      // Undo 3 times
      annotator.undo();
      annotator.undo();
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(2);

      // Redo 2 times
      annotator.redo();
      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(4);

      // Undo all the way
      annotator.undo();
      annotator.undo();
      annotator.undo();
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('new action after undo should clear redo stack', () => {
      // Build up history
      annotator.annotations.push({ type: 'rectangle', x: 0, y: 0, endX: 50, endY: 50, color: '#ff0000', lineWidth: 3 });
      annotator.saveState();
      annotator.annotations.push({ type: 'rectangle', x: 60, y: 0, endX: 110, endY: 50, color: '#ff0000', lineWidth: 3 });
      annotator.saveState();

      const historyLengthAfterTwoAdds = annotator.history.length;

      // Undo once
      annotator.undo();

      // Add new annotation (should clear redo stack)
      annotator.annotations.push({ type: 'circle', x: 100, y: 100, endX: 150, endY: 150, color: '#00ff00', lineWidth: 3 });
      annotator.saveState();

      // Redo should not work (stack was cleared)
      const stepBeforeRedo = annotator.historyStep;
      annotator.redo();
      expect(annotator.historyStep).toBe(stepBeforeRedo);
    });
  });
});
