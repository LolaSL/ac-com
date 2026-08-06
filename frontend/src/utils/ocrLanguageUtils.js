// Values are Tesseract.js traineddata codes (ISO 639-2/B), not the 2-letter
// dropdown option values — Tesseract fetches "<code>.traineddata.gz" from
// tessdata.projectnaptha.com, which only hosts 3-letter codes (e.g. "heb", not "he").
const LANGUAGE_ALIASES = {
  en: 'eng',
  english: 'eng',
  es: 'spa',
  spanish: 'spa',
  fr: 'fra',
  french: 'fra',
  de: 'deu',
  german: 'deu',
  it: 'ita',
  italian: 'ita',
  pt: 'por',
  portuguese: 'por',
  he: 'heb',
  hebrew: 'heb',
  ru: 'rus',
  russian: 'rus',
};

export const resolveOcrLanguageSelection = (selection) => {
  if (!selection || typeof selection !== 'string') {
    return 'eng';
  }

  const normalized = selection.trim().toLowerCase();
  if (normalized.includes('+')) {
    const parts = normalized
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      return parts.map((part) => LANGUAGE_ALIASES[part] || part).join('+');
    }
  }

  return LANGUAGE_ALIASES[normalized] || normalized;
};
