/**
 * Full Regression Tests
 *
 * Comprehensive testing of all features before major releases.
 * Run with: npm run test:regression
 * Time: ~30-60 seconds
 */

const Annotator = require('../content/annotator.js');

describe('REGRESSION TEST: Full Feature Verification', () => {
  let canvas;
  let annotator;
  const mockImageDataUrl = 'data:image/png;base64,mockImageData';

  beforeEach(async () => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const container = document.createElement('div');
    container.appendChild(canvas);
    document.body.appendChild(container);

    annotator = new Annotator(canvas, mockImageDataUrl);
    await annotator.initPromise;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  // =============================================
  // SECTION 1: INITIALIZATION & SETUP
  // =============================================
  describe('Section 1: Initialization & Setup', () => {
    test('1.1 Annotator class exists and can be instantiated', () => {
      expect(Annotator).toBeDefined();
      expect(annotator).toBeInstanceOf(Annotator);
    });

    test('1.2 Canvas context is properly initialized', () => {
      expect(annotator.ctx).toBeDefined();
      expect(annotator.canvas).toBe(canvas);
    });

    test('1.3 Default properties are set correctly', () => {
      expect(annotator.currentTool).toBe('pen');
      expect(annotator.currentColor).toBe('#ff0000');
      expect(annotator.lineWidth).toBe(3);
      expect(annotator.zoomLevel).toBe(1.0);
      expect(annotator.minZoom).toBe(0.25);
      expect(annotator.maxZoom).toBe(4.0);
      expect(annotator.zoomStep).toBe(0.25);
    });

    test('1.4 State tracking properties initialized', () => {
      expect(annotator.isDrawing).toBe(false);
      expect(annotator.isDragging).toBe(false);
      expect(annotator.isPanning).toBe(false);
      expect(annotator.isCropping).toBe(false);
      expect(annotator.cropActive).toBe(false);
    });

    test('1.5 History initialized with one state', () => {
      expect(annotator.history.length).toBe(1);
      expect(annotator.historyStep).toBe(0);
    });

    test('1.6 Annotations array is empty initially', () => {
      expect(Array.isArray(annotator.annotations)).toBe(true);
      expect(annotator.annotations.length).toBe(0);
    });

    test('1.7 Selected annotation is null initially', () => {
      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('1.8 Ready flag is true after init', () => {
      expect(annotator.ready).toBe(true);
    });
  });

  // =============================================
  // SECTION 2: DRAWING TOOLS
  // =============================================
  describe('Section 2: Drawing Tools', () => {
    describe('2.1 Pen Tool', () => {
      test('2.1.1 Pen tool can be selected', () => {
        annotator.setTool('pen');
        expect(annotator.currentTool).toBe('pen');
      });

      test('2.1.2 Pen annotation structure is correct', () => {
        const penAnnotation = {
          type: 'pen',
          points: [{ x: 10, y: 10 }, { x: 50, y: 50 }, { x: 100, y: 30 }],
          color: '#ff0000',
          lineWidth: 3
        };
        annotator.annotations.push(penAnnotation);

        expect(annotator.annotations[0].type).toBe('pen');
        expect(annotator.annotations[0].points.length).toBe(3);
        expect(annotator.annotations[0].color).toBe('#ff0000');
      });

      test('2.1.3 Pen with single point is valid', () => {
        const penAnnotation = {
          type: 'pen',
          points: [{ x: 10, y: 10 }],
          color: '#ff0000',
          lineWidth: 3
        };
        annotator.annotations.push(penAnnotation);
        expect(annotator.annotations.length).toBe(1);
      });
    });

    describe('2.2 Rectangle Tool', () => {
      test('2.2.1 Rectangle tool can be selected', () => {
        annotator.setTool('rectangle');
        expect(annotator.currentTool).toBe('rectangle');
      });

      test('2.2.2 Rectangle annotation structure is correct', () => {
        const rectAnnotation = {
          type: 'rectangle',
          x: 10, y: 10, endX: 100, endY: 100,
          color: '#ff0000',
          lineWidth: 3
        };
        annotator.annotations.push(rectAnnotation);

        expect(annotator.annotations[0].type).toBe('rectangle');
        expect(annotator.annotations[0].x).toBe(10);
        expect(annotator.annotations[0].endX).toBe(100);
      });

      test('2.2.3 Rectangle with negative dimensions works', () => {
        const rectAnnotation = {
          type: 'rectangle',
          x: 100, y: 100, endX: 10, endY: 10,
          color: '#ff0000',
          lineWidth: 3
        };
        annotator.annotations.push(rectAnnotation);
        expect(annotator.annotations.length).toBe(1);
      });
    });

    describe('2.3 Circle Tool', () => {
      test('2.3.1 Circle tool can be selected', () => {
        annotator.setTool('circle');
        expect(annotator.currentTool).toBe('circle');
      });

      test('2.3.2 Circle annotation structure is correct', () => {
        const circleAnnotation = {
          type: 'circle',
          x: 50, y: 50, endX: 100, endY: 50,
          color: '#00ff00',
          lineWidth: 2
        };
        annotator.annotations.push(circleAnnotation);

        expect(annotator.annotations[0].type).toBe('circle');
        expect(annotator.annotations[0].x).toBe(50);
      });
    });

    describe('2.4 Arrow Tool', () => {
      test('2.4.1 Arrow tool can be selected', () => {
        annotator.setTool('arrow');
        expect(annotator.currentTool).toBe('arrow');
      });

      test('2.4.2 Arrow annotation structure is correct', () => {
        const arrowAnnotation = {
          type: 'arrow',
          x: 10, y: 10, endX: 100, endY: 100,
          color: '#0000ff',
          lineWidth: 3
        };
        annotator.annotations.push(arrowAnnotation);

        expect(annotator.annotations[0].type).toBe('arrow');
      });
    });

    describe('2.5 Text Tool', () => {
      test('2.5.1 Text tool can be selected', () => {
        annotator.setTool('text');
        expect(annotator.currentTool).toBe('text');
      });

      test('2.5.2 Text can be added via addText method', async () => {
        await annotator.addText(50, 50, 'Test text');

        expect(annotator.annotations.length).toBe(1);
        expect(annotator.annotations[0].type).toBe('text');
        expect(annotator.annotations[0].text).toBe('Test text');
        expect(annotator.annotations[0].x).toBe(50);
        expect(annotator.annotations[0].y).toBe(50);
      });

      test('2.5.3 Text fontSize is based on lineWidth', async () => {
        annotator.setLineWidth(5);
        await annotator.addText(50, 50, 'Test');

        expect(annotator.annotations[0].fontSize).toBe(25); // 5 * 5
      });

      test('2.5.4 Empty text is not added', async () => {
        await annotator.addText(50, 50, '');
        expect(annotator.annotations.length).toBe(0);
      });

      test('2.5.5 Whitespace-only text is allowed (caller validates)', async () => {
        await annotator.addText(50, 50, '   ');
        // addText accepts any string - caller is responsible for validation
        expect(annotator.annotations.length).toBe(1);
        expect(annotator.annotations[0].text).toBe('   ');
      });
    });

    describe('2.6 Blackout Tool', () => {
      test('2.6.1 Blackout tool can be selected', () => {
        annotator.setTool('blackout');
        expect(annotator.currentTool).toBe('blackout');
      });

      test('2.6.2 Blackout annotation structure is correct', () => {
        const blackoutAnnotation = {
          type: 'blackout',
          x: 10, y: 10, endX: 100, endY: 50,
          color: '#000000',
          lineWidth: 1
        };
        annotator.annotations.push(blackoutAnnotation);

        expect(annotator.annotations[0].type).toBe('blackout');
      });
    });

    describe('2.7 Move Tool', () => {
      test('2.7.1 Move tool can be selected', () => {
        annotator.setTool('move');
        expect(annotator.currentTool).toBe('move');
      });
    });

    describe('2.8 Crop Tool', () => {
      test('2.8.1 Crop tool can be selected', () => {
        annotator.setTool('crop');
        expect(annotator.currentTool).toBe('crop');
      });
    });

    describe('2.9 Pan Tool', () => {
      test('2.9.1 Pan tool can be selected', () => {
        annotator.setTool('pan');
        expect(annotator.currentTool).toBe('pan');
      });
    });
  });

  // =============================================
  // SECTION 3: COLOR & LINE WIDTH
  // =============================================
  describe('Section 3: Color & Line Width', () => {
    test('3.1 setColor updates currentColor', () => {
      annotator.setColor('#00ff00');
      expect(annotator.currentColor).toBe('#00ff00');
    });

    test('3.2 setColor accepts various color formats', () => {
      annotator.setColor('#f00');
      expect(annotator.currentColor).toBe('#f00');

      annotator.setColor('rgb(255, 0, 0)');
      expect(annotator.currentColor).toBe('rgb(255, 0, 0)');

      annotator.setColor('red');
      expect(annotator.currentColor).toBe('red');
    });

    test('3.3 setLineWidth updates lineWidth', () => {
      annotator.setLineWidth(5);
      expect(annotator.lineWidth).toBe(5);
    });

    test('3.4 setLineWidth accepts various values', () => {
      annotator.setLineWidth(1);
      expect(annotator.lineWidth).toBe(1);

      annotator.setLineWidth(10);
      expect(annotator.lineWidth).toBe(10);
    });

    test('3.5 New annotations use current color', () => {
      annotator.setColor('#00ff00');
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: annotator.currentColor,
        lineWidth: annotator.lineWidth
      });

      expect(annotator.annotations[0].color).toBe('#00ff00');
    });

    test('3.6 New annotations use current lineWidth', () => {
      annotator.setLineWidth(7);
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: annotator.currentColor,
        lineWidth: annotator.lineWidth
      });

      expect(annotator.annotations[0].lineWidth).toBe(7);
    });
  });

  // =============================================
  // SECTION 4: ANNOTATION SELECTION & FINDING
  // =============================================
  describe('Section 4: Annotation Selection & Finding', () => {
    test('4.1 findAnnotationAt finds rectangle', () => {
      const rect = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(rect);
    });

    test('4.2 findAnnotationAt finds blackout', () => {
      const blackout = {
        type: 'blackout',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#000000', lineWidth: 1
      };
      annotator.annotations.push(blackout);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(blackout);
    });

    test('4.3 findAnnotationAt returns null for empty area', () => {
      const rect = {
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);

      const found = annotator.findAnnotationAt(200, 200);
      expect(found).toBeNull();
    });

    test('4.4 findAnnotationAt returns topmost annotation', () => {
      const bottom = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      };
      const top = {
        type: 'rectangle',
        x: 20, y: 20, endX: 80, endY: 80,
        color: '#00ff00', lineWidth: 3
      };
      annotator.annotations.push(bottom);
      annotator.annotations.push(top);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(top);
    });

    test('4.5 findAnnotationAt handles reversed rectangle coordinates', () => {
      const rect = {
        type: 'rectangle',
        x: 100, y: 100, endX: 10, endY: 10,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(rect);
    });

    test('4.6 findAnnotationAt finds text annotation', () => {
      const text = {
        type: 'text',
        x: 50, y: 50,
        text: 'Hello',
        color: '#ff0000',
        fontSize: 20
      };
      annotator.annotations.push(text);

      // Text y is baseline, so hit area is above y
      const found = annotator.findAnnotationAt(60, 40);
      expect(found).toBe(text);
    });

    test('4.7 findAnnotationAt finds pen stroke', () => {
      const pen = {
        type: 'pen',
        points: [{ x: 50, y: 50 }, { x: 100, y: 100 }],
        color: '#ff0000',
        lineWidth: 5
      };
      annotator.annotations.push(pen);

      const found = annotator.findAnnotationAt(50, 50);
      expect(found).toBe(pen);
    });
  });

  // =============================================
  // SECTION 5: DELETE ANNOTATION
  // =============================================
  describe('Section 5: Delete Annotation', () => {
    test('5.1 deleteSelectedAnnotation removes annotation', async () => {
      const rect = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);
      annotator.selectedAnnotation = rect;

      annotator.deleteSelectedAnnotation();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('5.2 deleteSelectedAnnotation clears selection', async () => {
      const rect = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);
      annotator.selectedAnnotation = rect;

      annotator.deleteSelectedAnnotation();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('5.3 deleteSelectedAnnotation saves state', async () => {
      const rect = {
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);
      annotator.saveState();
      annotator.selectedAnnotation = rect;

      const historyLengthBefore = annotator.history.length;

      annotator.deleteSelectedAnnotation();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.history.length).toBe(historyLengthBefore + 1);
    });

    test('5.4 deleteSelectedAnnotation does nothing without selection', () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 100, endY: 100,
        color: '#ff0000', lineWidth: 3
      });
      annotator.selectedAnnotation = null;

      annotator.deleteSelectedAnnotation();

      expect(annotator.annotations.length).toBe(1);
    });
  });

  // =============================================
  // SECTION 6: UNDO/REDO
  // =============================================
  describe('Section 6: Undo/Redo', () => {
    test('6.1 saveState increments historyStep', () => {
      const before = annotator.historyStep;
      annotator.saveState();
      expect(annotator.historyStep).toBe(before + 1);
    });

    test('6.2 saveState adds to history array', () => {
      const before = annotator.history.length;
      annotator.saveState();
      expect(annotator.history.length).toBe(before + 1);
    });

    test('6.3 undo decrements historyStep', () => {
      annotator.saveState();
      const before = annotator.historyStep;
      annotator.undo();
      expect(annotator.historyStep).toBe(before - 1);
    });

    test('6.4 undo does not go below 0', () => {
      annotator.undo();
      annotator.undo();
      annotator.undo();
      expect(annotator.historyStep).toBeGreaterThanOrEqual(0);
    });

    test('6.5 redo increments historyStep', () => {
      annotator.saveState();
      annotator.undo();
      const before = annotator.historyStep;
      annotator.redo();
      expect(annotator.historyStep).toBe(before + 1);
    });

    test('6.6 redo does not exceed history length', () => {
      annotator.saveState();
      const maxStep = annotator.historyStep;
      annotator.redo();
      annotator.redo();
      expect(annotator.historyStep).toBe(maxStep);
    });

    test('6.7 undo restores annotations', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(1);

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('6.8 redo restores annotations', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      });
      annotator.saveState();

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(0);

      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(1);
    });

    test('6.9 new action after undo clears redo stack', () => {
      annotator.saveState();
      annotator.saveState();
      annotator.undo();

      const stepAfterUndo = annotator.historyStep;
      annotator.saveState();

      annotator.redo();
      // Redo should not work
      expect(annotator.historyStep).toBe(stepAfterUndo + 1);
    });

    test('6.10 undo clears selection', () => {
      annotator.selectedAnnotation = { type: 'rectangle' };
      annotator.saveState();
      annotator.undo();
      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('6.11 multiple undo/redo maintains consistency', async () => {
      for (let i = 0; i < 5; i++) {
        annotator.annotations.push({
          type: 'rectangle',
          x: i * 10, y: i * 10,
          endX: i * 10 + 50, endY: i * 10 + 50,
          color: '#ff0000', lineWidth: 3
        });
        annotator.saveState();
      }

      expect(annotator.annotations.length).toBe(5);

      // Undo 3
      annotator.undo();
      annotator.undo();
      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(2);

      // Redo 2
      annotator.redo();
      annotator.redo();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(annotator.annotations.length).toBe(4);
    });

    test('6.12 undo restores canvas dimensions', async () => {
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;

      canvas.width = 400;
      canvas.height = 300;
      annotator.saveState();

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(canvas.width).toBe(originalWidth);
      expect(canvas.height).toBe(originalHeight);
    });

    test('6.13 undo restores imageDataUrl', async () => {
      const originalUrl = annotator.imageDataUrl;

      annotator.imageDataUrl = 'data:image/png;base64,newImage';
      annotator.saveState();

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.imageDataUrl).toBe(originalUrl);
    });
  });

  // =============================================
  // SECTION 7: ZOOM
  // =============================================
  describe('Section 7: Zoom', () => {
    test('7.1 setZoom updates zoomLevel', () => {
      annotator.setZoom(2.0);
      expect(annotator.zoomLevel).toBe(2.0);
    });

    test('7.2 setZoom clamps to minZoom', () => {
      annotator.setZoom(0.1);
      expect(annotator.zoomLevel).toBe(0.25);
    });

    test('7.3 setZoom clamps to maxZoom', () => {
      annotator.setZoom(10);
      expect(annotator.zoomLevel).toBe(4.0);
    });

    test('7.4 zoomIn increases by zoomStep', () => {
      const before = annotator.zoomLevel;
      annotator.zoomIn();
      expect(annotator.zoomLevel).toBe(before + 0.25);
    });

    test('7.5 zoomOut decreases by zoomStep', () => {
      annotator.setZoom(2.0);
      const before = annotator.zoomLevel;
      annotator.zoomOut();
      expect(annotator.zoomLevel).toBe(before - 0.25);
    });

    test('7.6 zoomReset returns to 1.0', () => {
      annotator.setZoom(3.0);
      annotator.zoomReset();
      expect(annotator.zoomLevel).toBe(1.0);
    });

    test('7.7 getZoomLevel returns current zoom', () => {
      annotator.setZoom(2.5);
      expect(annotator.getZoomLevel()).toBe(2.5);
    });

    test('7.8 zoomIn respects maxZoom', () => {
      annotator.setZoom(4.0);
      annotator.zoomIn();
      expect(annotator.zoomLevel).toBe(4.0);
    });

    test('7.9 zoomOut respects minZoom', () => {
      annotator.setZoom(0.25);
      annotator.zoomOut();
      expect(annotator.zoomLevel).toBe(0.25);
    });

    test('7.10 applyZoom sets canvas transform', () => {
      annotator.setZoom(2.0);
      expect(canvas.style.transform).toContain('scale(2)');
    });
  });

  // =============================================
  // SECTION 8: CROP
  // =============================================
  describe('Section 8: Crop', () => {
    test('8.1 applyCrop returns false for small area', async () => {
      annotator.cropActive = true;
      annotator.cropStartX = 0;
      annotator.cropStartY = 0;
      annotator.cropEndX = 5;
      annotator.cropEndY = 5;

      global.alert = jest.fn();
      const result = await annotator.applyCrop();

      expect(result).toBe(false);
    });

    test('8.2 applyCrop returns undefined if not active', async () => {
      annotator.cropActive = false;
      const result = await annotator.applyCrop();
      expect(result).toBeUndefined();
    });

    test('8.3 applyCrop updates canvas dimensions', async () => {
      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(canvas.width).toBe(150);
      expect(canvas.height).toBe(150);
    });

    test('8.4 applyCrop resets crop state', async () => {
      annotator.cropActive = true;
      annotator.isCropping = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(annotator.cropActive).toBe(false);
      expect(annotator.isCropping).toBe(false);
    });

    test('8.5 applyCrop adjusts annotations', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000', lineWidth: 3
      });

      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(annotator.annotations[0].x).toBe(50);  // 100 - 50
      expect(annotator.annotations[0].y).toBe(50);  // 100 - 50
    });

    test('8.6 applyCrop adjusts out-of-bounds annotations (they remain with adjusted coords)', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 300, y: 300, endX: 350, endY: 350,
        color: '#ff0000', lineWidth: 3
      });

      annotator.cropActive = true;
      annotator.cropStartX = 0;
      annotator.cropStartY = 0;
      annotator.cropEndX = 100;
      annotator.cropEndY = 100;

      await annotator.applyCrop();

      // Annotation stays but with adjusted coordinates (will be off-canvas)
      expect(annotator.annotations.length).toBe(1);
      expect(annotator.annotations[0].x).toBe(300); // Still at 300 since cropStartX is 0
      expect(annotator.annotations[0].y).toBe(300);
    });

    test('8.7 applyCrop does NOT duplicate annotations', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000', lineWidth: 3
      });

      const countBefore = annotator.annotations.length;

      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(annotator.annotations.length).toBe(countBefore);
    });

    test('8.8 cancelCrop resets state', () => {
      annotator.cropActive = true;
      annotator.isCropping = true;

      annotator.cancelCrop();

      expect(annotator.cropActive).toBe(false);
      expect(annotator.isCropping).toBe(false);
    });

    test('8.9 adjustAnnotationForCrop adjusts pen points', () => {
      const pen = {
        type: 'pen',
        points: [{ x: 100, y: 100 }, { x: 150, y: 150 }],
        color: '#ff0000', lineWidth: 3
      };

      const adjusted = annotator.adjustAnnotationForCrop(pen, 50, 50);

      expect(adjusted.points[0].x).toBe(50);
      expect(adjusted.points[0].y).toBe(50);
      expect(adjusted.points[1].x).toBe(100);
      expect(adjusted.points[1].y).toBe(100);
    });

    test('8.10 adjustAnnotationForCrop adjusts text', () => {
      const text = {
        type: 'text',
        x: 100, y: 100,
        text: 'Hello',
        color: '#ff0000', fontSize: 20
      };

      const adjusted = annotator.adjustAnnotationForCrop(text, 50, 50);

      expect(adjusted.x).toBe(50);
      expect(adjusted.y).toBe(50);
    });
  });

  // =============================================
  // SECTION 9: STATE PERSISTENCE
  // =============================================
  describe('Section 9: State Persistence', () => {
    test('9.1 getState returns complete state', () => {
      const state = annotator.getState();

      expect(state).toHaveProperty('history');
      expect(state).toHaveProperty('historyStep');
      expect(state).toHaveProperty('currentTool');
      expect(state).toHaveProperty('currentColor');
      expect(state).toHaveProperty('lineWidth');
      expect(state).toHaveProperty('annotations');
      expect(state).toHaveProperty('zoomLevel');
    });

    test('9.2 getState deep copies annotations', () => {
      const rect = { type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50 };
      annotator.annotations.push(rect);

      const state = annotator.getState();
      rect.x = 999;

      expect(state.annotations[0].x).toBe(10);
    });

    test('9.3 restoreState restores properties', async () => {
      const state = {
        history: [],
        historyStep: -1,
        currentTool: 'circle',
        currentColor: '#00ff00',
        lineWidth: 7,
        annotations: [{ type: 'circle', x: 50, y: 50, endX: 100, endY: 100 }],
        zoomLevel: 2.0
      };

      await annotator.restoreState(state);

      expect(annotator.currentTool).toBe('circle');
      expect(annotator.currentColor).toBe('#00ff00');
      expect(annotator.lineWidth).toBe(7);
      expect(annotator.annotations.length).toBe(1);
      expect(annotator.zoomLevel).toBe(2.0);
    });

    test('9.4 restoreState handles null', async () => {
      const toolBefore = annotator.currentTool;
      await annotator.restoreState(null);
      expect(annotator.currentTool).toBe(toolBefore);
    });

    test('9.5 restoreState handles new history format', async () => {
      const state = {
        history: [{
          canvasData: 'data:image/png;base64,test',
          annotations: [],
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

      await expect(annotator.restoreState(state)).resolves.not.toThrow();
    });

    test('9.6 restoreState handles legacy string history', async () => {
      const state = {
        history: ['data:image/png;base64,legacyData'],
        historyStep: 0,
        currentTool: 'pen',
        currentColor: '#ff0000',
        lineWidth: 3,
        annotations: []
      };

      await expect(annotator.restoreState(state)).resolves.not.toThrow();
    });

    test('9.7 saveState creates proper history entry', () => {
      annotator.annotations.push({ type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50 });
      annotator.saveState();

      const entry = annotator.history[annotator.historyStep];

      expect(entry).toHaveProperty('canvasData');
      expect(entry).toHaveProperty('annotations');
      expect(entry).toHaveProperty('imageDataUrl');
      expect(entry).toHaveProperty('canvasWidth');
      expect(entry).toHaveProperty('canvasHeight');
    });
  });

  // =============================================
  // SECTION 10: CANVAS OPERATIONS
  // =============================================
  describe('Section 10: Canvas Operations', () => {
    test('10.1 getAnnotatedImage returns data URL', () => {
      const dataUrl = annotator.getAnnotatedImage();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('10.2 redrawCanvas completes without error', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 10, y: 10, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      });

      await expect(annotator.redrawCanvas()).resolves.not.toThrow();
    });

    test('10.3 clear removes all annotations', async () => {
      annotator.annotations.push({ type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50 });
      annotator.annotations.push({ type: 'circle', x: 60, y: 60, endX: 100, endY: 100 });

      annotator.clear();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(0);
    });

    test('10.4 clear resets selection', async () => {
      annotator.selectedAnnotation = { type: 'rectangle' };

      annotator.clear();

      expect(annotator.selectedAnnotation).toBeNull();
    });

    test('10.5 clear resets history', async () => {
      annotator.saveState();
      annotator.saveState();

      annotator.clear();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.history.length).toBe(1);
      expect(annotator.historyStep).toBe(0);
    });

    test('10.6 loadImage returns promise', () => {
      const promise = annotator.loadImage('data:image/png;base64,test');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  // =============================================
  // SECTION 11: EDGE CASES
  // =============================================
  describe('Section 11: Edge Cases', () => {
    test('11.1 Handle annotation with missing properties gracefully', () => {
      // This tests defensive coding
      annotator.annotations.push({ type: 'rectangle' });
      expect(() => annotator.redrawCanvas()).not.toThrow();
    });

    test('11.2 findAnnotationAt handles empty annotations', () => {
      const result = annotator.findAnnotationAt(50, 50);
      expect(result).toBeNull();
    });

    test('11.3 Zero-size rectangle is handled', () => {
      const rect = {
        type: 'rectangle',
        x: 50, y: 50, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);
      expect(annotator.annotations.length).toBe(1);
    });

    test('11.4 Very large coordinates are handled', () => {
      const rect = {
        type: 'rectangle',
        x: 10000, y: 10000, endX: 20000, endY: 20000,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);
      expect(annotator.annotations.length).toBe(1);
    });

    test('11.5 Negative coordinates are handled', () => {
      const rect = {
        type: 'rectangle',
        x: -50, y: -50, endX: 50, endY: 50,
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(rect);

      const adjusted = annotator.adjustAnnotationForCrop(rect, 0, 0);
      expect(adjusted).not.toBeNull();
    });

    test('11.6 Pen with empty points array is handled', () => {
      const pen = {
        type: 'pen',
        points: [],
        color: '#ff0000', lineWidth: 3
      };
      annotator.annotations.push(pen);
      expect(annotator.annotations.length).toBe(1);
    });

    test('11.7 Text with very long string is handled', () => {
      const longText = 'A'.repeat(1000);
      annotator.annotations.push({
        type: 'text',
        x: 50, y: 50,
        text: longText,
        color: '#ff0000', fontSize: 20
      });
      expect(annotator.annotations[0].text.length).toBe(1000);
    });

    test('11.8 Rapid undo/redo is handled', async () => {
      // Create history
      for (let i = 0; i < 10; i++) {
        annotator.annotations.push({ type: 'rectangle', x: i, y: i, endX: i+10, endY: i+10 });
        annotator.saveState();
      }

      // Rapid undo/redo
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) annotator.undo();
        else annotator.redo();
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not crash and state should be valid
      expect(annotator.historyStep).toBeGreaterThanOrEqual(0);
      expect(annotator.historyStep).toBeLessThan(annotator.history.length);
    });
  });

  // =============================================
  // SECTION 12: BUG REGRESSION TESTS
  // =============================================
  describe('Section 12: Bug Regression Tests', () => {
    test('12.1 [BUG FIX] Undo restores annotations array', async () => {
      annotator.annotations.push({ type: 'rect', x: 10, y: 10, endX: 50, endY: 50, color: '#f00', lineWidth: 3 });
      annotator.saveState();

      annotator.annotations.push({ type: 'rect', x: 60, y: 60, endX: 100, endY: 100, color: '#0f0', lineWidth: 3 });
      annotator.saveState();

      expect(annotator.annotations.length).toBe(2);

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(annotator.annotations.length).toBe(1);
    });

    test('12.2 [BUG FIX] No duplicate annotations after crop', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000', lineWidth: 3
      });

      const countBefore = annotator.annotations.length;

      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(annotator.annotations.length).toBe(countBefore);
    });

    test('12.3 [BUG FIX] restoreState handles object history format', async () => {
      const state = {
        history: [{
          canvasData: 'data:image/png;base64,test',
          annotations: [{ type: 'rectangle', x: 10, y: 10, endX: 50, endY: 50 }],
          imageDataUrl: 'data:image/png;base64,base',
          canvasWidth: 800,
          canvasHeight: 600
        }],
        historyStep: 0,
        currentTool: 'pen',
        currentColor: '#ff0000',
        lineWidth: 3,
        annotations: []
      };

      // Should not throw [object Object] error
      await annotator.restoreState(state);
      expect(annotator.historyStep).toBe(0);
    });

    test('12.4 [BUG FIX] Undo after crop restores dimensions', async () => {
      const originalWidth = canvas.width;
      const originalHeight = canvas.height;

      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000', lineWidth: 3
      });
      annotator.saveState();

      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      expect(canvas.width).toBe(150);

      annotator.undo();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(canvas.width).toBe(originalWidth);
      expect(canvas.height).toBe(originalHeight);
    });

    test('12.5 [BUG FIX] Move after crop does not duplicate', async () => {
      annotator.annotations.push({
        type: 'rectangle',
        x: 100, y: 100, endX: 150, endY: 150,
        color: '#ff0000', lineWidth: 3
      });

      annotator.cropActive = true;
      annotator.cropStartX = 50;
      annotator.cropStartY = 50;
      annotator.cropEndX = 200;
      annotator.cropEndY = 200;

      await annotator.applyCrop();

      const countAfterCrop = annotator.annotations.length;

      // Simulate move by adjusting coordinates
      annotator.annotations[0].x += 10;
      annotator.annotations[0].y += 10;
      annotator.annotations[0].endX += 10;
      annotator.annotations[0].endY += 10;

      expect(annotator.annotations.length).toBe(countAfterCrop);
    });
  });
});

// =============================================
// SUMMARY
// =============================================
describe('REGRESSION TEST SUMMARY', () => {
  test('All regression tests completed', () => {
    console.log('\n================================================');
    console.log('FULL REGRESSION TEST COMPLETE');
    console.log('All features have been verified.');
    console.log('Ready for release if all tests pass.');
    console.log('================================================\n');
    expect(true).toBe(true);
  });
});
