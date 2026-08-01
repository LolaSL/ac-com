import { buildEditableRefrigerantLines, normalizeLinePointCoordinates } from './annotationUtils';

describe('normalizeLinePointCoordinates', () => {
  it('keeps percentage-based values unchanged when they are already normalized', () => {
    expect(normalizeLinePointCoordinates([0.2, 0.3, 0.4, 0.5], 800, 600)).toEqual([0.2, 0.3, 0.4, 0.5]);
  });

  it('converts pixel values into percentage coordinates', () => {
    expect(normalizeLinePointCoordinates([160, 120, 320, 240], 800, 600)).toEqual([0.2, 0.2, 0.4, 0.4]);
  });
});

describe('buildEditableRefrigerantLines', () => {
  it('builds a chain topology for ducted VRF and a star topology for ductless VRF', () => {
    const annotations = {
      rectangles: [
        { id: 'cond-1', xPercent: 0.2, yPercent: 0.4, widthPercent: 0.05, heightPercent: 0.05 },
        { id: 'ac-1', xPercent: 0.1, yPercent: 0.1, widthPercent: 0.05, heightPercent: 0.05 },
        { id: 'ac-2', xPercent: 0.3, yPercent: 0.1, widthPercent: 0.05, heightPercent: 0.05 },
      ],
      comments: [
        { rectId: 'cond-1', text: 'Condenser-1' },
        { rectId: 'ac-1', text: 'ac-1' },
        { rectId: 'ac-2', text: 'ac-2' },
      ],
    };

    const ductedLines = buildEditableRefrigerantLines(annotations, 'vrf-ducted');
    const ductlessLines = buildEditableRefrigerantLines(annotations, 'vrf-ductless');

    expect(ductedLines).toHaveLength(4);
    expect(ductedLines.some((line) => line.id.includes('ac-1-ac-2'))).toBe(true);
    expect(ductedLines.some((line) => line.id.includes('ac-2-cond-1'))).toBe(true);
    expect(ductlessLines).toHaveLength(4);
    expect(ductlessLines[0].id).toContain('ac-1');
    expect(ductlessLines[1].id).toContain('ac-2');
    expect(ductlessLines[2].id).toContain('cond-1');
  });
});
