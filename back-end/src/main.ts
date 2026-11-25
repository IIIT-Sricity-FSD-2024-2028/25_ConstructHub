import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Global exception filters
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Upload directory
import { UPLOADS_DIR } from './middleware/upload.config';
import { flushAll, installPersistenceHooks } from './utils/json-store';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Persistence ─────────────────────────────────────────────────────────────
  // Repositories keep data in memory and save to data/db/*.json after each write request,
  // every few seconds, and on shutdown.
  installPersistenceHooks();
  app.use((req: any, res: any, next: any) => {
    if (req.method !== 'GET' && req.method !== 'OPTIONS') res.on('finish', flushAll);
    next();
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: true,          // reflect request origin (fine for demo/dev)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'x-response-time', 'x-ratelimit-remaining'],
  });

  // ── Global Validation Pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,           // strip unknown properties
      forbidNonWhitelisted: false, // allow extra properties without throwing 400 Bad Request
    }),
  );

  // ── Global Exception Filters ────────────────────────────────────────────────
  // AllExceptionsFilter must be registered BEFORE HttpExceptionFilter.
  // NestJS applies them in reverse order, so HttpExceptionFilter catches
  // HttpExceptions first, and AllExceptionsFilter handles everything else.
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // ── Swagger Documentation ───────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('ConstructHub API')
    .setDescription(
      'ConstructHub Construction Management Platform API.\n\n' +
      '**How to use:** call `POST /auth/login` with a demo account (e.g. `admin@apex.com` / `123456`), copy the ' +
      '`accessToken`, click **Authorize** and paste it. Every protected route then runs as that user.\n\n' +
      '**Middleware active:**\n' +
      '- 🔒 Security headers + Rate Limiting (120 req/min per IP)\n' +
      '- 📝 Request logging to `logs/access-YYYY-MM-DD.log`\n' +
      '- ❌ Error logging to `logs/error-YYYY-MM-DD.log`\n' +
      '- 🆔 Request ID tracing (`x-request-id` header)\n' +
      '- 📁 File uploads via `POST /reports/upload`\n' +
      '- 🛡️ Auth middleware on all protected routes',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ bearer: [] }]; // the Authorize button applies the token to every call
  SwaggerModule.setup('api/docs', app, document);

  // Write swagger.json to disk
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir);
  fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));

  // ── Static Files ─────────────────────────────────────────────────────────────
  const expressStatic = require('express').static;
  const httpAdapter   = app.getHttpAdapter().getInstance();

  // Serve uploaded photos at /uploads
  httpAdapter.use('/uploads', expressStatic(UPLOADS_DIR));

  // Gracefully handle browser font fallback requests so they do not log 404
  httpAdapter.use('/assets/fonts', (req: any, res: any) => {
    res.status(200).type('application/font-woff2').send('');
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n========================================`);
  console.log(`  ConstructHub is running!`);
  console.log(`========================================`);
  console.log(`  🌐  Frontend:      run "npm run dev" in frontend-react (http://localhost:5173)`);
  console.log(`  🚀  Backend API:   http://localhost:${port}`);
  console.log(`  📚  Swagger Docs:  http://localhost:${port}/api/docs`);
  console.log(`  📁  Uploads:       http://localhost:${port}/uploads`);
  console.log(`  📋  Logs folder:   ${path.join(process.cwd(), 'logs')}`);
  console.log(`========================================\n`);
  console.log(`  Middleware stack:`);
  console.log(`    ✅ Request ID      → all routes`);
  console.log(`    ✅ Security        → all routes`);
  console.log(`    ✅ Logger          → all routes (→ logs/access-*.log)`);
  console.log(`    ✅ Auth            → protected API routes`);
  console.log(`    ✅ File Upload     → POST /reports/upload`);
  console.log(`    ✅ Error Handling  → global (→ logs/error-*.log)`);
  console.log(`========================================\n`);
  if (!process.env.JWT_SECRET) {
    console.warn('  ⚠  JWT_SECRET is not set: using the built-in development secret. Set it (see .env.example) before any real deployment.\n');
  }
}
bootstrap();
