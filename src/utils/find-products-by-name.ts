import { Logger } from '@nestjs/common';
import { Product } from '../products/entities/product.entity';
import { similarityMatch } from './similarity-match';

export const findProductByName = (
  products: Product[],
  searchName: string,
  logger: Logger,
): Product | null => {
  const normalized = searchName.toLowerCase().trim();

  logger.log(
    `Searching for product: "${searchName}" in ${products.length} products`,
  );

  // 1. Búsqueda exacta
  let found = products.find((p) => p.name.toLowerCase().trim() === normalized);

  if (found) {
    logger.log(`Found exact match: ${found.name}`);
    return found;
  }

  // 2. Búsqueda por inclusión simple
  found = products.find(
    (p) =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase()),
  );

  if (found) {
    logger.log(`Found by inclusion: ${found.name}`);
    return found;
  }

  // 3. **NUEVO: Búsqueda específica para productos con variantes**
  // Buscar en contenido de paréntesis: "Refrescos (Cola, fresa)" -> buscar "cola"
  found = products.find((p) => {
    const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
    if (parenthesisMatch) {
      const variants = parenthesisMatch[1].toLowerCase();
      // Dividir por comas y limpiar espacios
      const variantList = variants.split(',').map((v) => v.trim());

      // Verificar si el término buscado coincide con alguna variante
      return variantList.some(
        (variant) =>
          variant.includes(normalized) ||
          normalized.includes(variant) ||
          similarityMatch(variant, normalized),
      );
    }
    return false;
  });

  if (found) {
    logger.log(`Found by variant match: ${found.name}`);
    return found;
  }

  // 4. **NUEVO: Búsqueda por palabras clave mejorada**
  const searchWords = normalized.split(' ').filter((word) => word.length > 2);

  found = products.find((p) => {
    const productText = p.name.toLowerCase();

    // Verificar si alguna palabra clave coincide
    return searchWords.some((word) => {
      // Buscar en el nombre principal
      if (productText.includes(word)) return true;

      // Buscar en las variantes (contenido de paréntesis)
      const parenthesisMatch = p.name.match(/\(([^)]+)\)/);
      if (parenthesisMatch) {
        const variants = parenthesisMatch[1].toLowerCase();
        return variants.includes(word);
      }

      return false;
    });
  });

  if (found) {
    logger.log(`Found by keyword match: ${found.name}`);
    return found;
  }

  // 5. **NUEVO: Mapeo de sinónimos comunes**
  const synonymMap = {
    refresco: ['refrescos', 'bebida', 'soda'],
    cola: ['coca', 'cocacola', 'coca cola', 'pepsi'],
    fresa: ['strawberry', 'frutilla'],
    toronja: ['pomelo', 'grapefruit'],
    torta: ['sandwich', 'sándwich', 'emparedado'],
    jamón: ['jamon', 'ham'],
  };

  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (
      normalized.includes(key) ||
      synonyms.some((syn) => normalized.includes(syn))
    ) {
      found = products.find((p) => {
        const productText = p.name.toLowerCase();
        return (
          productText.includes(key) ||
          synonyms.some((syn) => productText.includes(syn))
        );
      });

      if (found) {
        logger.log(`Found by synonym match (${key}): ${found.name}`);
        return found;
      }
    }
  }

  logger.warn(`No product found for: "${searchName}"`);
  return null;
};
