'use strict';

/**
 * Netlify Function — NestJS API adapter
 *
 * This file wraps the pre-compiled NestJS server (server/dist/) with
 * serverless-http so it runs as an AWS Lambda function on Netlify.
 *
 * The Netlify build command runs `npm --workspace server run build` which
 * compiles TypeScript → server/dist/ (CommonJS, decorator metadata preserved).
 * Those compiled files are then bundled with this function via NFT.
 *
 * Required env vars (set in Netlify → Site settings → Environment variables):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY
 *   CORS_ORIGIN  (your Netlify site URL, e.g. https://your-site.netlify.app)
 *   NODE_ENV     production
 */

const serverlessHttp = require('serverless-http');

// reflect-metadata must be imported before any NestJS module
require('reflect-metadata');

let cachedHandler = null;

async function getHandler() {
  if (cachedHandler) return cachedHandler;

  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../../server/dist/app.module');
  const { HttpExceptionFilter } = require(
    '../../server/dist/common/filters/http-exception.filter',
  );

  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS startup logs in Lambda
    logger: process.env.NODE_ENV === 'development' ? undefined : false,
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  const origin = process.env.CORS_ORIGIN ?? '*';
  app.enableCors({ origin: origin.split(','), credentials: true });

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  cachedHandler = serverlessHttp(expressApp);
  return cachedHandler;
}

exports.handler = async (event, context) => {
  // Keep the Lambda container warm between invocations
  context.callbackWaitsForEmptyEventLoop = false;
  const handler = await getHandler();
  return handler(event, context);
};
