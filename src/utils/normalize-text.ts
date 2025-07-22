import didYouMean from 'didyoumean2';

const dictionary = ['Muffin', 'Buffalo'];

export const normalizeText = (text: string): string => {
  let cleaned = text
    .replace(/\s+/g, ' ') // múltiples espacios a uno
    .trim();

  // Corrección de palabras sin eliminar tildes ni caracteres especiales
  const correctedWords = cleaned.split(' ').map((word) => {
    const suggestion = didYouMean(word, dictionary, { threshold: 0.5 });
    return suggestion ?? word;
  });

  cleaned = correctedWords.join(' ');

  // Inserta '(' si falta
  if (cleaned.includes(')') && !cleaned.includes('(')) {
    const indexClose = cleaned.indexOf(')');
    const words = cleaned.slice(0, indexClose).split(' ');
    const start = Math.max(words.length - 3, 0);
    const before = words.slice(0, start).join(' ');
    const inside = words.slice(start).join(' ');

    cleaned =
      (before ? before + ' ' : '') +
      '(' +
      inside +
      ')' +
      cleaned.slice(indexClose + 1);
  }

  return cleaned;
};
