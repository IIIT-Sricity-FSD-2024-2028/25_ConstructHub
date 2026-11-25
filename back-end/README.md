# ConstructHub API (NestJS)

See the main [README](../README.md) for the overview, demo accounts and walkthrough.

```bash
npm install
npm run start:demo     # reset demo data, build, start on http://localhost:3000
npm run start:dev      # watch mode (keeps the current data)
npm run reset-data     # back to the original seed
npm run check          # build + every test suite (API, route audit, unit, UI) on fresh data
```

- Swagger: http://localhost:3000/api/docs. Log in with `POST /auth/login`, click **Authorize**, paste the token.
- Saved data: `data/db/*.json` (created on first run). Uploads: `uploads/` (site photos), `private-uploads/` (receipts, documents).
- Logs: `logs/access-YYYY-MM-DD.log`, `logs/error-YYYY-MM-DD.log`; every response carries an `x-request-id`.
- Settings (`.env.example`): `JWT_SECRET`, `PORT`, `DATA_DIR`, `APP_TIMEZONE` (default `Asia/Kolkata`).
