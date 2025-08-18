export const similarityMatch = (str1: string, str2: string): boolean => {
  // Implementación simple de similitud
  const minLength = Math.min(str1.length, str2.length);
  const maxLength = Math.max(str1.length, str2.length);

  if (minLength < 3) return false; // Muy corto para comparar

  // Si una string está contenida en la otra y tiene al menos 70% de similitud
  if (minLength / maxLength >= 0.7) {
    return str1.includes(str2) || str2.includes(str1);
  }

  return false;
};
