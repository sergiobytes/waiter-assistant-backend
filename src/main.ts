import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('MainLogger');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configurar raw body parser específicamente para webhooks de Stripe
  app.use('/api/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));
  
  // Body parser para el resto de endpoints
  app.use(bodyParser.json({ limit: '10MB' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const PORT = process.env.PORT ?? 3000;

  await app.listen(PORT);
  logger.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
