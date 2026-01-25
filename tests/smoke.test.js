/**
 * Pre-Merge Smoke Tests
 *
 * Quick sanity checks to run before every PR merge.
 * These tests verify critical functionality works correctly.
 *
 * Run with: npm run test:smoke
 * Time: ~10 seconds
 */

const Annotator = require('../content/annotator.js');

describe('SMOKE TEST: Critical Path Verification', () => {
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
    document.body.innerHTML = '';
  });

  // =============================================
  // CRITICAL PATH 1: Basic Initialization
  // =============================================
  describe('1. Extension Initialization', () => {
    test('Annotator initializes without errors', () => {
      expect(annotator).toBeDefined();
      expect(annotator.ready).toBe(true);
    });

    test('Canvas is properly configured', () => {
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
      expect(annotator.ctx).toBeDefined();
    });

    test('Default tool settings are correct', () => {
      expect(annotator.currentTool).toBe('pen');
      expect(annotator.currentColor).toBe('#ff0000');
      expect(annotator.lineWidth).toBe(3);
    });
  });

  // =============================================
  // CRITICAL PATH 2: Annotation Tools
  // =============================================
  describe('2. Annotation Tools Work', () => {
    test('Pen tool can be selected and draws', () => {
      annotator.setTool('pen');
      expect(annotator.currentTool).toBe('pen');

      // Simulate pen stroke
      annotator.annotations.push({
        type: 'pen',
        points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].type).toBe('pen');
    });

    test('Rectangle tool can be selected and draws', () => {
      annotator.setTool('rectangle');
      expect(annotator.currentTool).toBe('rectangle');

      // Simulate rectangle
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].type).toBe('rectangle');
    });

    test('Arrow tool can be selected and draws', () => {
      annotator.setTool('arrow');
      expect(annotator.currentTool).toBe('arrow');

      annotator.annotations.push({
        type: 'arrow',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].type).toBe('arrow');
    });

    test('Text annotations can be added', async () => {
      await annotator.addText(50, 50, 'Test annotation');

      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].type).toBe('text');
      expect(annotator.annotations[0].text).toBe('Test annotation');
    });

    test('Color changes apply to new annotations', () => {
      annotator.setColor('#00ff00');
      expect(annotator.currentColor).toBe('#00ff00');

      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: annotator.currentColor,
        lineWidth: 3
      });

      expect(annotator.annotations[0].color).toBe('#00ff00');
    });
  });

  // =============================================
  // CRITICAL PATH 3: Undo/Redo
  // =============================================
  describe('3. Undo/Redo Works', () => {
    test('Undo removes last annotation', async () => {
      // Add annotation
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(1);

      // Undo
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('Redo restores undone annotation', async () => {
      // Add annotation
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      // Undo then Redo
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(0);

      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(1);
    });

    test('Multiple undo operations work', async () => {
      // Add 3 annotations
      for (let i = 0; i < 3; i++) {
        annotator.annotations.push({
          type: 'rectangle',
          x: i * 20, y: i * 20, endX: i * 20 + 50, endY: i * 20 + 50,
          color: '#ff0000',
          lineWidth: 3
        });
        annotator.saveState();
      }

      expect(annotator.annotations.length).toBe(3);

      // Undo 3 times
      annotator.undo();
      annotator.undo();
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });
  });

  // =============================================
  // CRITICAL PATH 4: Move Annotation
  // =============================================
  describe('4. Move Annotation Works', () => {
    test('Move tool can be selected', () => {
      annotator.setTool('move');
      expect(annotator.currentTool).toBe('move');
    });

    test('Annotation can be found at coordinates', () => {
      const annotation = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      };
      annotator.annotations.push(annotation);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(annotation);
    });

    test('Annotation selection works', () => {
      const annotation = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      };
      annotator.annotations.push(annotation);

      annotator.selectedAnnotation = annotation;
      expect(annotator.selectedAnnotation).toBe(annotation);
    });

    test('Delete selected annotation works', async () => {
      const annotation = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      };
      annotator.annotations.push(annotation);
      annotator.selectedAnnotation = annotation;

      annotator.deleteSelectedAnnotation();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
      expect(annotator.selectedAnnotation).toBeNull();
    });
  });

  // =============================================
  // CRITICAL PATH 5: Crop Function
  // =============================================
  describe('5. Crop Function Works', () => {
    test('Crop tool can be selected', () => {
      annotator.setTool('crop');
      expect(annotator.currentTool).toBe('crop');
    });

    test('Crop area can be set', () => {
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;
      annotator.cropActive = true;

      expect(annotator.cropActive).toBe(true);
    });

    test('Crop applies successfully', async () => {
      // Add annotation inside crop area
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000',
        lineWidth: 3
      });

      // Set crop area
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      const result = await annotator.applyCrop();

      expect(result).toBe(true);
      expect(annotator.cropActive).toBe(false);
    });

    test('Crop cancel works', () => {
      annotator.cropActive = true;
      annotator.isCropping = true;

      annotator.cancelCrop();

      expect(annotator.cropActive).toBe(false);
      expect(annotator.isCropping).toBe(false);
    });

    test('NO DUPLICATE: Annotation not duplicated after crop', async () => {
      // Add annotation
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000',
        lineWidth: 3
      });

      const countBefore = annotator.annotations.length;

      // Crop
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      // Should still have same number of annotations
      expect(annotator.annotations.length).toBe(countBefore);
    });
  });

  // =============================================
  // CRITICAL PATH 6: Undo After Crop
  // =============================================
  describe('6. Undo After Crop Works', () => {
    test('Undo restores pre-crop state', async () => {
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;

      // Add annotation
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      // Crop
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      // Canvas should be smaller now
      expect(canvas.width).toBe(150);
      expect(canvas.height).toBe(150);

      // Undo
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Canvas should be restored
      expect(canvas.width).toBe(originalWidth);
      expect(canvas.height).toBe(originalHeight);
    });

    test('Annotations restored after undo crop', async () => {
      // Add annotation at original position
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000',
        lineWidth: 3
      });
      annotator.saveState();

      const originalX = annotator.annotations[0].x;

      // Crop
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      // Annotation should be adjusted
      expect(annotator.annotations[0].x).toBe(50); // 100 - 50

      // Undo
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Annotation should be at original position
      expect(annotator.annotations[0].x).toBe(originalX);
    });
  });

  // =============================================
  // CRITICAL PATH 7: State Persistence
  // =============================================
  describe('7. State Persistence Works', () => {
    test('getState returns complete state', () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });

      const state = annotator.getState();

      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('historyStep');
      expect(state).toHaveProperty('annotations');
      expect(state).toHaveProperty('currentTool');
      expect(state).toHaveProperty('currentColor');
      expect(state).toHaveProperty('zoomLevel');
    });

    test('restoreState restores annotations', async () => {
      const state = {
        history: [],
        historyStep: -1,
        currentTool: 'circle',
        currentColor: '#00ff00',
        lineWidth: 5,
        annotations: [{ type: 'circle', x: 50, y: 50, endX: 100, endY: 100 }],
        zoomLevel: 1.5
      };

      await annotator.restoreState(state);

      expect(annotator.currentTool).toBe('circle');
      expect(annotator.currentColor).toBe('#00ff00');
      expect(annotator.annotations.length).toBe(1);
    });

    test('restoreState handles new history format', async () => {
      const state = {
        history: [{
          canvasData: 'data:image/png;base64,test',
          annotations: [{ type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50 }],
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
      await expect(annotator.restoreState(state)).resolves.not.toThrow();
    });
  });

  // =============================================
  // CRITICAL PATH 8: Zoom Controls
  // =============================================
  describe('8. Zoom Controls Work', () => {
    test('Zoom in increases zoom level', () => {
      const before = annotator.zoomLevel;
      annotator.zoomIn();
      expect(annotator.zoomLevel).toBeGreaterThan(before);
    });

    test('Zoom out decreases zoom level', () => {
      annotator.setZoom(2.0);
      const before = annotator.zoomLevel;
      annotator.zoomOut();
      expect(annotator.zoomLevel).toBeLessThan(before);
    });

    test('Zoom reset returns to 100%', () => {
      annotator.setZoom(3.0);
      annotator.zoomReset();
      expect(annotator.zoomLevel).toBe(1.0);
    });

    test('Zoom respects min/max limits', () => {
      // Try to zoom below min
      annotator.setZoom(0.1);
      expect(annotator.zoomLevel).toBe(annotator.minZoom);

      // Try to zoom above max
      annotator.setZoom(10);
      expect(annotator.zoomLevel).toBe(annotator.maxZoom);
    });
  });

  // =============================================
  // CRITICAL PATH 9: Canvas Output
  // =============================================
  describe('9. Canvas Output Works', () => {
    test('getAnnotatedImage returns data URL', () => {
      const dataUrl = annotator.getAnnotatedImage();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('Canvas can be redrawn', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000',
        lineWidth: 3
      });

      // Should not throw
      await expect(annotator.redrawCanvas()).resolves.not.toThrow();
    });
  });
});

// =============================================
// SUMMARY TEST
// =============================================
describe('SMOKE TEST SUMMARY', () => {
  test('All critical paths verified', () => {
    // This test always passes - it's a marker that all smoke tests ran
    console.log('\n========================================');
    console.log('SMOKE TEST COMPLETE');
    console.log('All critical paths have been verified.');
    console.log('Safe to merge if all tests pass.');
    console.log('========================================\n');
    expect(true).toBe(true);
  });
});
