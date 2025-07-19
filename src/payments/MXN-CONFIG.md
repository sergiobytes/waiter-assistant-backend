# 🇲🇽 Configuración para Pesos Mexicanos

## 💰 **Moneda Configurada: MXN (Pesos Mexicanos)**

### **Ejemplos de Montos:**
- Tacos: $45.00 MXN
- Torta: $85.50 MXN  
- Refresco: $25.00 MXN
- Comida completa: $150.75 MXN

### **Formatos Aceptados:**
```json
{
  "amount": 45.00,     // ✅ Válido
  "amount": 85.5,      // ✅ Válido (se redondea a 85.50)
  "amount": 150.75,    // ✅ Válido
  "amount": 0.50,      // ✅ Válido (50 centavos)
  "amount": 0.01       // ✅ Válido (1 centavo)
}
```

### **Ejemplos de API:**

**Pago en Efectivo - Tacos ($45.00)**
```bash
POST /api/payments/process/order-uuid
{
  "method": "CASH",
  "amount": 45.00
}
```

**Pago con Tarjeta - Stripe ($150.75)**
```bash
POST /api/payments/process/order-uuid
{
  "method": "CARD",
  "amount": 150.75,
  "metadata": {
    "description": "Comida completa - 2 personas"
  }
}
```

**Apple Pay/Google Pay - Stripe ($85.50)**
```bash
POST /api/payments/process/order-uuid
{
  "method": "DIGITAL_WALLET",
  "amount": 85.50,
  "metadata": {
    "walletType": "apple_pay"
  }
}
```

### **Respuesta Formateada:**
```json
{
  "id": "payment-uuid",
  "amount": 150.75,
  "amountFormatted": "$150.75",
  "method": "CARD",
  "status": "COMPLETED",
  "currency": "MXN"
}
```

### **Gateway de Pago para México:**
- **Stripe**: 
  - ✅ Soporta MXN nativamente
  - ✅ Tarjetas mexicanas (Visa, Mastercard, American Express)
  - ✅ Apple Pay y Google Pay
  - ✅ OXXO (pagos en efectivo)
  - ✅ Transferencias SPEI
  - ✅ Tarifas competitivas para México

### **Variables de Entorno:**
```bash
DEFAULT_CURRENCY=MXN
STRIPE_ENABLED=true
STRIPE_API_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**¡Todo listo para manejar pesos mexicanos! 🌮💰**
