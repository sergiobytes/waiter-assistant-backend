/**
 * Utilidades para formatear monedas
 */

export class CurrencyUtils {
  /**
   * Formatea un monto en pesos mexicanos
   * @param amount - El monto a formatear
   * @param includeSymbol - Si incluir el símbolo $ o no
   * @returns String formateado
   */
  static formatMXN(amount: number, includeSymbol: boolean = true): string {
    const formatted = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    if (!includeSymbol) {
      return formatted.replace('$', '').trim();
    }

    return formatted;
  }

  /**
   * Formatea un monto en cualquier moneda
   * @param amount - El monto a formatear
   * @param currency - Código de moneda (MXN, USD, EUR, etc.)
   * @param locale - Locale para formateo (default: es-MX)
   * @returns String formateado
   */
  static formatCurrency(
    amount: number, 
    currency: string = 'MXN', 
    locale: string = 'es-MX'
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'MXN' ? 2 : 2,
      maximumFractionDigits: currency === 'MXN' ? 2 : 2,
    }).format(amount);
  }

  /**
   * Convierte un string de monto a número
   * @param amountString - String con formato de dinero
   * @returns Número
   */
  static parseAmount(amountString: string): number {
    // Remover símbolos de moneda y espacios, pero mantener decimales
    const cleaned = amountString
      .replace(/[$\s,]/g, '')
      .replace(/(\d+)\.(\d{2})$/, '$1.$2'); // Mantener decimales válidos
    
    return parseFloat(cleaned) || 0;
  }

  /**
   * Valida si un monto es válido para MXN
   * @param amount - Monto a validar
   * @returns boolean
   */
  static isValidAmount(amount: number): boolean {
    return !isNaN(amount) && amount >= 0.01 && isFinite(amount);
  }

  /**
   * Redondea un monto a centavos válidos para MXN
   * @param amount - Monto a redondear
   * @returns Número redondeado a 2 decimales
   */
  static roundToMXN(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}
