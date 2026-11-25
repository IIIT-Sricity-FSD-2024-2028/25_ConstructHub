/**
 * Route audit - run after `npm run build`:   node scripts/audit-routes.js
 *
 *  1. Lists every route with the roles allowed by @Roles (routes without roles accept ANY signed-in user).
 *  2. Calls every route WITHOUT a token and reports the ones that answer something other than 401
 *     (these are public: they must be on the intended list below, otherwise a route was forgotten in app.module.ts).
 * Exit code 1 when an unexpected public route or a route without @Roles is found.
 */
require('@nestjs/common').Logger.overrideLogger(false);
process.env.DATA_DIR = require('os').tmpdir() + '/ch-audit-' + Date.now(); // never touch real data
const { NestFactory, ModulesContainer } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

// Routes that are public ON PURPOSE.
const INTENDED_PUBLIC = [
  'POST /auth/login', 'POST /auth/register-client', 'POST /companies/register',
  'GET /plans', 'GET /', 'GET /health', 'POST /inquiries',
];

(async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const server = app.getHttpServer();
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const routes = [];
  for (const mod of app.get(ModulesContainer).values()) {
    for (const [, wrapper] of mod.controllers) {
      const cls = wrapper.metatype;
      if (!cls) continue;
      const basePath = Reflect.getMetadata('path', cls) || '';
      const classRoles = Reflect.getMetadata('roles', cls);
      for (const name of Object.getOwnPropertyNames(cls.prototype)) {
        const handler = cls.prototype[name];
        if (typeof handler !== 'function' || name === 'constructor') continue;
        const method = Reflect.getMetadata('method', handler);
        if (method === undefined) continue;
        const sub = Reflect.getMetadata('path', handler) || '';
        const verb = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL', 'OPTIONS', 'HEAD'][method] || 'GET';
        const roles = Reflect.getMetadata('roles', handler) || classRoles;
        const path = ('/' + [basePath, sub].filter(Boolean).join('/')).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        routes.push({ verb, path, roles, controller: cls.name });
      }
    }
  }
  routes.sort((a, b) => a.path.localeCompare(b.path) || a.verb.localeCompare(b.verb));

  let problems = 0;
  const publicRoutes = [];
  const noRoles = [];
  for (const r of routes) {
    const url = base + r.path.replace(/:[A-Za-z]+/g, 'x');
    let status = 0;
    try {
      const res = await fetch(url, { method: r.verb === 'ALL' ? 'GET' : r.verb, headers: { 'Content-Type': 'application/json' }, body: ['GET', 'HEAD'].includes(r.verb) ? undefined : '{}' });
      status = res.status;
    } catch (e) { status = -1; }
    r.status = status;
    if (status !== 401) publicRoutes.push(r);
    if (!r.roles) noRoles.push(r);
  }

  console.log(`\n${routes.length} routes found\n`);
  console.log('ROUTE'.padEnd(52), 'UNAUTHENTICATED'.padEnd(16), 'ROLES');
  for (const r of routes) {
    console.log(`${r.verb.padEnd(7)}${r.path}`.padEnd(52), String(r.status === 401 ? '401 (protected)' : `${r.status} PUBLIC`).padEnd(16), r.roles ? r.roles.join(', ') : '(any signed-in user)');
  }

  console.log('\n--- public routes ---');
  for (const r of publicRoutes) {
    const key = `${r.verb} ${r.path}`;
    const ok = INTENDED_PUBLIC.includes(key);
    if (!ok) problems++;
    console.log(`${ok ? 'ok      ' : 'UNEXPECTED'} ${key} -> ${r.status}`);
  }
  console.log('\n--- routes without @Roles (any signed-in role, including clients) ---');
  for (const r of noRoles) {
    const isPublic = publicRoutes.includes(r);
    if (!isPublic) problems++;
    console.log(`${isPublic ? 'public  ' : 'REVIEW  '} ${r.verb} ${r.path}  (${r.controller})`);
  }
  // 3. Every role that is NOT listed in @Roles must be refused with 403 (checks that the role guard really runs on each route).
  const logins = {
    superuser: 'super@ch.com', company_admin: 'admin@apex.com', project_manager: 'pm@apex.com', finance_manager: 'finance@apex.com',
    site_engineer: 'site@apex.com', procurement_storekeeper: 'proc@apex.com', client: 'client1@gmail.com',
  };
  const tokens = {};
  for (const [role, email] of Object.entries(logins)) {
    const res = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: '123456' }) });
    tokens[role] = (await res.json()).accessToken;
  }
  let probes = 0;
  console.log('\n--- forbidden-role probe (roles not listed in @Roles must get 403) ---');
  for (const r of routes) {
    if (!r.roles || publicRoutes.includes(r)) continue;
    for (const [role, token] of Object.entries(tokens)) {
      if (!token || r.roles.includes(role)) continue;
      probes++;
      const url = base + r.path.replace(/:[A-Za-z]+/g, 'x');
      const res = await fetch(url, { method: r.verb === 'ALL' ? 'GET' : r.verb, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: ['GET', 'HEAD'].includes(r.verb) ? undefined : '{}' });
      if (res.status !== 403) { problems++; console.log(`LEAK  ${role} -> ${r.verb} ${r.path} answered ${res.status} instead of 403`); }
    }
  }
  console.log(`${probes} forbidden-role probes sent`);
  console.log(problems ? `\n${problems} problem(s) found` : '\nAudit clean: every route is protected or intentionally public, and every protected route names its roles.');
  await app.close();
  process.exit(problems ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
