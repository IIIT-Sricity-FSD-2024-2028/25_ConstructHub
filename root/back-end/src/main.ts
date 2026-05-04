import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Swagger Documentation Setup
  // The 'Authorize' button and lock icon are added via addApiKey + addSecurityRequirement.
  // Click 'Authorize' in the Swagger UI, type a role (e.g. superuser, project_manager)
  // and click 'Authorize' — every request will then send that role in the x-role header.
  const config = new DocumentBuilder()
    .setTitle('ConstructHub API')
    .setDescription(
      'ConstructHub Construction Management Platform API.\n\n' +
      '**How to use:** Click "Try it out" on any endpoint, fill in the `x-role` header field ' +
      'with one of: `superuser`, `project_manager`, `site_engineer`, `finance_manager`, `client`, ' +
      'then click Execute.',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Write swagger.json to disk (back-end/docs/swagger.json)
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir);
  }
  fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));

  // ─── Serve Frontend Static Files ────────────────────────────────────────────
  // No need to run "node server.js" separately.
  // After "npm run start", just open http://localhost:3000/login.html in your browser.
  // __dirname in dev = back-end/src, in prod = back-end/dist — go two levels up to root.
  const frontendPath = path.join(__dirname, '..', '..', 'front-end');
  if (fs.existsSync(frontendPath)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expressStatic = require('express').static;
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use(expressStatic(frontendPath));
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n========================================`);
  console.log(`  ConstructHub is running!`);
  console.log(`========================================`);
  console.log(`  🌐  App (Login):   http://localhost:${port}/login.html`);
  console.log(`  🚀  Backend API:   http://localhost:${port}`);
  console.log(`  📚  Swagger Docs:  http://localhost:${port}/api/docs`);
  console.log(`========================================\n`);
}
bootstrap();
