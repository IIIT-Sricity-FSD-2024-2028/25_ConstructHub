# ConstructHub web app (React + Vite)

See the main [README](../README.md) for the overview, demo accounts and walkthrough.

```bash
npm install
npm run dev        # http://localhost:5173 (expects the API on http://localhost:3000)
npm run build      # production build in dist/
npm run lint
```

All data comes from the API through `src/services/api.js`; nothing is cached or invented in the browser.
UI tests run against a live API with fresh demo data; the easiest way is `npm run check` in `../back-end`.
