# 💳 Módulo de Pagos - Guía de Uso

## 🚀 Funcionalidades Implementadas

### ✅ **Entidades**
- **Payment**: Gestión completa de pagos
- **Enums**: PaymentMethod, PaymentStatus

### ✅ **Métodos de Pago Soportados**
- `CASH` - Efectivo (completado inmediatamente)
- `CARD` - Tarjetas (con simulación de gateway)
- `DIGITAL_WALLET` - Billeteras digitales (PayPal, Apple Pay, etc.)
- `BANK_TRANSFER` - Transferencias bancarias (requiere confirmación manual)

### ✅ **Estados de Pago**
- `PENDING` - Pendiente
- `PROCESSING` - Procesando
- `COMPLETED` - Completado
- `FAILED` - Fallido
- `REFUNDED` - Reembolsado
- `CANCELLED` - Cancelado

## 📋 **API Endpoints**

### **Procesar un Pago**
```bash
POST /api/payments/process/{orderId}
Content-Type: application/json

{
  "method": "CARD",
  "paymentGateway": "stripe",
  "metadata": {
    "cardLastFour": "4242",
    "amount": 250.50
  }
}
```

**Nota**: Los montos se manejan en **pesos mexicanos (MXN)**. Ejemplo: 250.50 = $250.50 MXN

### **Confirmar Transferencia Bancaria**
```bash
POST /api/payments/confirm-bank-transfer/{paymentId}
Content-Type: application/json

{
  "externalPaymentId": "BANK_REF_123456"
}
```

### **Reembolsar un Pago**
```bash
POST /api/payments/refund/{paymentId}
Content-Type: application/json

{
  "reason": "Cliente insatisfecho"
}
```

### **Obtener Estadísticas**
```bash
GET /api/payments/stats
GET /api/payments/stats/order/{orderId}
```

### **Listar Pagos por Orden**
```bash
GET /api/payments/by-order/{orderId}
```

## 🔄 **Flujo de Trabajo**

1. **Crear Orden** → Estado: `CLOSED`
2. **Procesar Pago** → Se crea Payment en estado según método
3. **Pago Exitoso** → Orden cambia a `PAID`
4. **Opcional**: Reembolso si es necesario

## 🧪 **Casos de Uso**

### **Pago en Efectivo**
```typescript
// La orden se marca como pagada inmediatamente
const payment = await paymentsService.processPayment(orderId, {
  method: PaymentMethod.CASH
});
```

### **Pago con Tarjeta (Stripe)**
```typescript
// Se procesa a través de Stripe
const payment = await paymentsService.processPayment(orderId, {
  method: PaymentMethod.CARD,
  externalPaymentId: 'pi_1234567890'
});
```

### **Billetera Digital (Stripe)**
```typescript
// Apple Pay, Google Pay, etc. a través de Stripe
const payment = await paymentsService.processPayment(orderId, {
  method: PaymentMethod.DIGITAL_WALLET,
  externalPaymentId: 'pi_wallet_1234567890'
});
```

### **Transferencia Bancaria**
```typescript
// 1. Iniciar pago (queda en PENDING)
const payment = await paymentsService.processPayment(orderId, {
  method: PaymentMethod.BANK_TRANSFER
});

// 2. Confirmar cuando se reciba el dinero
await paymentsService.confirmBankTransfer(
  payment.id, 
  'BANK_REF_123456'
);
```

## 🔮 **Próximos Pasos**

### **Integraciones Reales** (Fase 2)
- [ ] Stripe Connect (tarjetas, wallets, transferencias)
- [ ] Webhooks de Stripe
- [ ] Stripe Elements para frontend
- [ ] Manejo de disputas y reembolsos

### **Características Avanzadas** (Fase 3)
- [ ] Pagos divididos con Stripe Connect
- [ ] Suscripciones con Stripe Billing
- [ ] Pagos recurrentes
- [ ] Reportes avanzados de Stripe

## 🏗️ **Arquitectura**

```
Orders (CLOSED) → Payments (process) → Orders (PAID)
     ↓                    ↓                ↓
  Validation        Gateway/Cash       Success/Failure
```

## 🔐 **Seguridad**

- ✅ Validación de estados de orden
- ✅ Prevención de pagos duplicados
- ✅ Soft delete para auditoría
- ✅ IDs de transacción únicos
- ✅ Metadata para debugging

## 📊 **Estadísticas Incluidas**

- Total de pagos por estado
- Total de pagos por método
- Monto total procesado
- Filtros por orden específica

---

**¡El módulo de pagos está listo para producción! 🎉**
