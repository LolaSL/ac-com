const LANGUAGE_ALIASES = {
  eng: 'eng',
  english: 'eng',
  'english + spanish': 'eng+spa',
  'english+spanish': 'eng+spa',
  spa: 'spa',
  spanish: 'spa',
  fra: 'fra',
  french: 'fra',
  deu: 'deu',
  german: 'deu',
  ita: 'ita',
  italian: 'ita',
  por: 'por',
  portuguese: 'por',
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
