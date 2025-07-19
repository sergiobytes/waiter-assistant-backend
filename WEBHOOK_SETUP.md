# Configuración de Webhooks para Desarrollo Local

## Opción 1: ngrok (Recomendado)
1. Instalar ngrok: https://ngrok.com/download
2. Ejecutar: `ngrok http 3000`
3. Usar la URL HTTPS que te da ngrok
4. Configurar en Stripe: `https://abc123.ngrok.io/api/webhooks/stripe`

## Opción 2: Stripe CLI (Alternativa)
1. Instalar Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Escuchar webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Esto te dará un webhook secret temporal

## Variables necesarias en .env:
```
STRIPE_ENABLED=true
STRIPE_SECRET_KEY=sk_test_...  # Tu clave secreta de Stripe
STRIPE_WEBHOOK_SECRET=whsec_... # El secret del webhook configurado
```

## Pasos para configurar webhook en Stripe Dashboard:
1. Ir a https://dashboard.stripe.com/webhooks
2. Crear nuevo endpoint
3. URL: Tu URL pública + /api/webhooks/stripe
4. Eventos a escuchar:
   - checkout.session.completed
   - payment_intent.succeeded
   - payment_intent.payment_failed
5. Copiar el signing secret y agregarlo al .env
