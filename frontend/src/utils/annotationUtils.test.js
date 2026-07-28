import { normalizeLinePointCoordinates } from './annotationUtils';

describe('normalizeLinePointCoordinates', () => {
  it('keeps percentage-based values unchanged when they are already normalized', () => {
    expect(normalizeLinePointCoordinates([0.2, 0.3, 0.4, 0.5], 800, 600)).toEqual([0.2, 0.3, 0.4, 0.5]);
  });

  it('converts pixel values into percentage coordinates', () => {
    expect(normalizeLinePointCoordinates([160, 120, 320, 240], 800, 600)).toEqual([0.2, 0.2, 0.4, 0.4]);
  });
});
