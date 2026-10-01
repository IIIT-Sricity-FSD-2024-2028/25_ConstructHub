"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const all_exceptions_filter_1 = require("./filters/all-exceptions.filter");
const http_exception_filter_1 = require("./filters/http-exception.filter");
const upload_config_1 = require("./middleware/upload.config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'x-role', 'x-request-id'],
        exposedHeaders: ['x-request-id', 'x-response-time', 'x-ratelimit-remaining'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(), new http_exception_filter_1.HttpExceptionFilter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('ConstructHub API')
        .setDescription('ConstructHub Construction Management Platform API.\n\n' +
        '**How to use:** Click "Try it out" on any endpoint, fill in the `x-role` header field ' +
        'with one of: `superuser`, `project_manager`, `site_engineer`, `finance_manager`, `client`, ' +
        'then click Execute.\n\n' +
        '**Middleware active:**\n' +
        '- 🔒 Security headers + Rate Limiting (120 req/min per IP)\n' +
        '- 📝 Request logging to `logs/access-YYYY-MM-DD.log`\n' +
        '- ❌ Error logging to `logs/error-YYYY-MM-DD.log`\n' +
        '- 🆔 Request ID tracing (`x-request-id` header)\n' +
        '- 📁 File uploads via `POST /reports/upload`\n' +
        '- 🛡️ Auth middleware on all protected routes')
        .setVersion('1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const docsDir = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(docsDir))
        fs.mkdirSync(docsDir);
    fs.writeFileSync(path.join(docsDir, 'swagger.json'), JSON.stringify(document, null, 2));
    const expressStatic = require('express').static;
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use('/uploads', expressStatic(upload_config_1.UPLOADS_DIR));
    const frontendPath = path.join(__dirname, '..', '..', 'front-end');
    if (fs.existsSync(frontendPath)) {
        httpAdapter.use(expressStatic(frontendPath));
    }
    httpAdapter.use('/assets/fonts', (req, res) => {
        res.status(200).type('application/font-woff2').send('');
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`\n========================================`);
    console.log(`  ConstructHub is running!`);
    console.log(`========================================`);
    console.log(`  🌐  App (Login):   http://localhost:${port}/login.html`);
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
}
bootstrap();
//# sourceMappingURL=main.js.map