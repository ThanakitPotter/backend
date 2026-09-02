import '@js-temporal/polyfill';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend integration
  app.enableCors();

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,            // Auto-transform payloads to DTO instances
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
