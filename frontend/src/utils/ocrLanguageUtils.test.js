import { resolveOcrLanguageSelection } from './ocrLanguageUtils';

describe('resolveOcrLanguageSelection', () => {
  it('defaults to English when no language is provided', () => {
    expect(resolveOcrLanguageSelection()).toBe('eng');
  });

  it('normalizes a combined language selection for Tesseract', () => {
    expect(resolveOcrLanguageSelection('eng+spa')).toBe('eng+spa');
  });

  it('maps friendly labels to Tesseract language codes', () => {
    expect(resolveOcrLanguageSelection('English + Spanish')).toBe('eng+spa');
    expect(resolveOcrLanguageSelection('French')).toBe('fra');
  });
});
