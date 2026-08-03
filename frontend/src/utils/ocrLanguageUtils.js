const LANGUAGE_ALIASES = {
  en: 'en',
  english: 'en',
    es: 'es',
  spanish: 'es',
  fr: 'fr',
  french: 'fr',
  de: 'de',
  german: 'de',
  it: 'it',
  italian: 'it',
  pt: 'pt',
  portuguese: 'pt',
  he: 'he',
  hebrew: 'he',
  russian: 'ru',
  ru: 'ru',
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
