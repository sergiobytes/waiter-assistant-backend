import didYouMean from 'didyoumean2';

const dictionary = ['Muffin', 'Buffalo'];

export const normalizeText = (text: string): string => {
  let cleaned = text
    .replace(/[^\x00-\x7F]/g, '') // caracteres no ASCII
    .replace(/\s+/g, ' ') // múltiples espacios
    .trim();

  // Paso 1: corrección por similitud
  const correctedWords = cleaned.split(' ').map((word) => {
    const suggestion = didYouMean(word, dictionary, { threshold: 0.5 });
    return suggestion ?? word;
  });

  cleaned = correctedWords.join(' ');

  // Paso 2: si hay ')' pero no hay '(', insertar '(' antes de la primera palabra entre paréntesis
  if (cleaned.includes(')') && !cleaned.includes('(')) {
    const indexClose = cleaned.indexOf(')');
    const words = cleaned.slice(0, indexClose).split(' ');
    const lastN = 3; // máximo 3 palabras antes del ')' a considerar como contenido

    // Detectar desde dónde puede iniciar la frase entre paréntesis
    const start = Math.max(words.length - lastN, 0);
    const prefix = words.slice(0, start).join(' ');
    const parenContent = words.slice(start).join(' ');

    cleaned =
      (prefix ? prefix + ' ' : '') +
      '(' +
      parenContent +
      cleaned.slice(indexClose);
  }

  return cleaned;
};
