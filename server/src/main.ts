import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
// Load server/.env regardless of where the process was launched from.
loadEnv({ path: resolve(__dirname, '..', '.env') });
loadEnv(); // also pick up any .env in cwd, without overriding

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  // Validation is handled per-route via ZodValidationPipe (see controllers).

  const origin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: origin.split(','), credentials: true });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
