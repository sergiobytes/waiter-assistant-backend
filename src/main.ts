import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('MainLogger');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Body parser para el resto de endpoints
  app.use(bodyParser.json({ limit: '10MB' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  const PORT = process.env.PORT ?? 3000;

  await app.listen(PORT);
  logger.log(`App running on port ${process.env.PORT}`);
}
bootstrap();
