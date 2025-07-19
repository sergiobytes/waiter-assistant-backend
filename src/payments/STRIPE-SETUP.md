# 🔵 Configuración Stripe para México

## 🚀 **Setup Simplificado - Solo Stripe**

### **1. Instalación (cuando sea necesario)**
```bash
npm install stripe
npm install @types/stripe --save-dev
```

### **2. Variables de Entorno**
```bash
# .env
DEFAULT_CURRENCY=MXN
STRIPE_ENABLED=true
STRIPE_API_KEY=pk_test_51ABC...  # Clave pública
STRIPE_SECRET_KEY=sk_test_51ABC... # Clave secreta
STRIPE_WEBHOOK_SECRET=whsec_ABC... # Para webhooks
```

### **3. Métodos de Pago Soportados en México**
- ✅ **Tarjetas**: Visa, Mastercard, American Express
- ✅ **Wallets**: Apple Pay, Google Pay
- ✅ **OXXO**: Pagos en efectivo en tiendas
- ✅ **SPEI**: Transferencias bancarias

### **4. Flujo de Integración**
```typescript
// 1. Frontend crea PaymentIntent
const paymentIntent = await stripeService.createPaymentIntent(150.75, orderId);

// 2. Cliente confirma pago
const result = await stripeService.confirmPayment(paymentIntent.id, paymentMethodId);

// 3. Webhook confirma el pago
// POST /webhooks/stripe
```

### **5. Configuración del Dashboard de Stripe**
1. **Activar MXN** en el dashboard
2. **Configurar OXXO** para pagos en efectivo
3. **Configurar webhooks** para eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`

### **6. Tarifas Stripe México (2024)**
- **Tarjetas mexicanas**: 3.6% + $3 MXN
- **Tarjetas internacionales**: 4.4% + $3 MXN
- **OXXO**: 1.8% + $8 MXN
- **Apple/Google Pay**: 3.6% + $3 MXN

### **7. Límites y Consideraciones**
- **Mínimo OXXO**: $20 MXN
- **Máximo OXXO**: $10,000 MXN
- **Tiempo OXXO**: 3 días para pagar
- **Moneda**: Solo MXN para OXXO

### **8. Configuración Lista**
```typescript
// El StripeService ya está configurado y listo
// Solo necesita activar STRIPE_ENABLED=true
// y agregar las claves reales
```

### **9. Testing**
```bash
# Tarjetas de prueba Stripe
4242424242424242  # Visa exitosa
4000000000000002  # Tarjeta declinada
4000000000009995  # Fondos insuficientes
```

### **10. Webhooks de Producción**
```bash
# URL del webhook
https://tu-dominio.com/api/webhooks/stripe

# Eventos a escuchar
payment_intent.succeeded
payment_intent.payment_failed
invoice.payment_succeeded
```

**¡Todo listo para implementar Stripe cuando sea necesario! 💳🇲🇽**
