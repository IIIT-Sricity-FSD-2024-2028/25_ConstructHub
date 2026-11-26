# ConstructHub

A multi-company construction management platform. Clients post construction requirements, companies price them
through an internal estimate workflow, the client awards a contract, and the project then runs end to end:
milestones and tasks, site reports, materials and stock, expense claims, stage billing and payments, with a
dashboard per role.

| Part | Stack | Folder |
| --- | --- | --- |
| API | NestJS 11 (TypeScript), JWT auth, class-validator, Swagger | `back-end/` |
| Web app | React 19 + Vite, React Router 7 | `frontend-react/` |
| Storage | In-memory repositories saved to JSON files (`back-end/data/db`) | created on first run |

## Run it

Needs Node.js 20+ (and Python 3 only for the API test suites).

```bash
# 1. API on http://localhost:3000  (Swagger docs at /api/docs)
cd back-end
npm install
npm run start:demo        # resets the demo data, builds and starts

# 2. Web app on http://localhost:5173  (second terminal)
cd frontend-react
npm install
npm run dev
```

`npm run reset-data` (in `back-end`) puts the demo data back to the original seed at any time.
Copy `back-end/.env.example` to `.env` (or set the variables) before any real deployment: without `JWT_SECRET`
the API uses a built-in development secret and prints a warning.

## Demo accounts

All passwords are `123456`.

| Role | Email | Company |
| --- | --- | --- |
| Platform superuser | `super@ch.com` | platform |
| Company admin | `admin@apex.com` · `admin@ltinfra.com` | Apex Builders · L&T Infrastructure |
| Project manager | `pm@apex.com` · `pm@ltinfra.com` | |
| Site engineer | `site@apex.com` · `site@ltinfra.com` | |
| Finance manager | `finance@apex.com` · `finance@ltinfra.com` | |
| Procurement / storekeeper | `proc@apex.com` · `proc@ltinfra.com` | |
| Client | `client1@gmail.com` (P001) · `client2@gmail.com` (P003, P004) · `client3@gmail.com` (P002) | platform-level |

## How it fits together

```
Client ──requirement──▶ Company admin ──assigns──▶ PM (stages) ──▶ FM (costs, advance %) ──▶ Admin (markup, release)
   ▲                                                                                              │
   └──────────────────────────── compares quotations and awards ◀──────────────────────────────────┘
                                         │
                       contract ─▶ project "Awaiting Advance" ─▶ Bill #1 (mobilization advance)
                                         │ paid
                                         ▼
   PM: milestones + tasks ─▶ Site engineer: work, site reports, petty expenses, material requests
   Storekeeper: purchase orders ─▶ FM approval above the limit ─▶ goods receipts ─▶ site stock ─▶ issues
   PM verifies expenses ─▶ FM approves (only approved spend counts) ─▶ reimbursement
   PM approves a milestone (all tasks done + a site report) ─▶ FM raises the stage bill (amount from the quote,
   less advance recovery) ─▶ client accepts or declines ─▶ client / FM record payments
```

Business rules are enforced by the API, never only in the browser. The main ones:

- Projects are never added by hand: a project is created only when a client awards a company's quotation, which
  also creates its contract, milestones and the mobilization-advance bill. Company admins and project managers
  can edit their projects but have no "add project" option.
- Every request is re-checked against the database: a locked user or suspended company loses access at once.
- A site engineer works on a project only while he has an unfinished task there: no expense claims, material
  requests or site reports otherwise (except the proof report for a milestone still awaiting approval).
- Each role can only change what its job needs (for example a site engineer reports task progress, a finance
  manager edits the budget split of their own projects, only the client accepts or declines a bill).
- A stage bill's amount comes from the accepted quotation; once the client accepts a bill it can no longer be
  edited or deleted, and a milestone that was billed is locked (its tasks and site reports too).
- Approved spend can never exceed the project budget; purchase orders above the company limit need the FM.
- Records with money attached (projects with bills, payments, expenses, POs) cannot be deleted.
- All dates are business dates in India time (`APP_TIMEZONE`, default `Asia/Kolkata`).

## State management (Redux Toolkit)

The web app keeps all shared and server data in one Redux store (`@reduxjs/toolkit` + `react-redux`).
Pages never call the API themselves: they **dispatch thunks** and **read selectors**.

```
 page / component                     Redux store (src/store)                          NestJS API
 ────────────────                     ───────────────────────                          ──────────
 useLoad([fetchProjects])  ─dispatch─▶ thunk  projects/fetchAll  ──apiRequest()────▶  GET /projects
                                       │ pending   → status 'loading'
                                       │ fulfilled → projectsAdapter.setAll(...)  ◀──  [ ...projects ]
                                       │ rejected  → error = server message
 useAppSelector(selectProjectsManagedBy) ◀── memoised selector (createSelector) ◀── state.projects
 dispatch(updateProject(...)).unwrap() ─▶ thunk → PATCH → upsertOne → every page showing it re-renders
```

| Where | What |
| --- | --- |
| `src/store/index.js` | `makeStore()` with `configureStore`; `rootReducer` (signing out empties every slice); listener middleware that saves profile edits to the session |
| `src/store/helpers.js` | `apiThunk` (createAsyncThunk that turns `{error}` answers into rejected actions with the server's message), list/upsert/remove reducer helpers |
| `src/store/hooks.js` | `useAppDispatch`, `useAppSelector`, `useLoad` (dispatch thunks when a page opens), `isFirstLoad`, `errorText` |
| `src/features/<area>/<area>Slice.js` | one slice per business area: `auth`, `ui` (toasts), `projects`, `users`, `tasks`, `milestones`, `reports`, `bills`, `expenses`, `procurement`, `marketplace`, `notifications`, `messages`, `platform`, `finance` |

Rules followed throughout:

- Server records are normalised with `createEntityAdapter` (`ids` + `entities`), each list has a request
  `status` and `error`, and records changed by an action are upserted, so a change shows on every screen at once.
- Derived data comes from memoised selectors (`createSelector`): for example `selectProjectsManagedBy`,
  `selectOpenWorkProjectIds`, `selectBilledToDate`, `selectQuotationsOfRequirement`, `selectUnreadCount`.
- What a user may do with a project comes from the API (`project.allowed`), so a button is only offered when the
  API would accept the action (no "Add milestone" on contract stages, no tasks or stage bills before the advance
  is paid, "Delete" only on a project with no work or money on it).
- Form inputs, open dialogs and filters stay in component state (`useState`): they belong to one screen only.
- `src/services/api.js` is the only file that talks HTTP; besides `apiRequest` it keeps the session
  (login / logout) and file downloads, which produce a file and not state.
- The Redux DevTools browser extension shows every action and the state after it (development builds).

## Tests

```bash
cd frontend-react && npm install      # once (vitest and testing-library are dev dependencies)
cd ../back-end && npm run check
cd ../frontend-react && npm run test:store   # Redux unit tests only, no server needed
```

`npm run check` builds the API and runs, each against fresh demo data:

| Suite | What it covers |
| --- | --- |
| `tests/api/step1` … `step7` | platform admin, marketplace, signup, milestones, procurement, expenses and payments, the full project lifecycle |
| `tests/api/step8-regression-tests.py` | one check per bug fixed in the logic review (see `CHANGES.md`) |
| `scripts/audit-routes.js` | every route is either authenticated or intentionally public, and refuses roles it does not list |
| Jest unit tests | users and companies services |
| `frontend-react/tests/store/store.test.js` | Redux layer: reducers, selectors, thunks with a mocked API, the sign-out reset and the session listener |
| `frontend-react/tests/*.flow.test.jsx` | four UI flows driven through the real pages against the real API |
| `frontend-react/tests/pages.smoke.test.jsx` | signs in as every role and renders all 70 pages, failing on any crash or React error |

## Demo walkthrough (about 10 minutes)

The lifecycle suite (`tests/api/step7-e2e-lifecycle.py`) follows the same story.

1. **Client** `client1@gmail.com`: *Requirements* → open REQ003 to see the quotations it was awarded on, then
   *Projects* → Apex Skyline Tower: progress by milestone, bills and payments. Note the client sees what was
   billed, never the contractor's internal costs.
2. **Project manager** `pm@apex.com`: *Milestones* → P001 shows Foundation approved (and billed) and Structure
   overdue. Try *Reopen* on Foundation: it is refused because it is already billed.
3. **Site engineer** `site@apex.com`: submit an expense against Structure, raise a material request.
4. **Project manager**: verify the expense; approve the material request.
5. **Storekeeper** `proc@apex.com`: create the purchase order; above the limit it waits for finance.
6. **Finance manager** `finance@apex.com`: approve the PO and the expense; open *Bill decisions*.
7. **Client**: accept INV-APEX-001 and pay part of it in the demo payment portal.
8. Each role's dashboard now shows the same numbers.

## Project layout

```
back-end/
  src/<module>/        controllers (routes + who may call them), services (business rules), repositories (data)
  src/middleware/      request id, security headers + rate limit, logging, auth
  scripts/             reset-data, audit-routes, run-all-checks
  tests/api/           API test suites
frontend-react/
  src/actors/<role>/   pages of each role
  src/components/      shared UI (billing, milestones, procurement, marketplace, layout)
  src/store/           Redux store, thunk helper, typed hooks
  src/features/        one Redux slice per business area (thunks, reducers, selectors)
  src/services/api.js  the only place that talks HTTP (used by the thunks)
  tests/               UI flow tests, the page smoke test and the Redux unit tests (tests/store)
```

## Known limitations

- Data lives in JSON files, which is fine for a demo but has no transactions or concurrent-writer safety. A real
  deployment would use a database such as PostgreSQL with foreign keys.
- Payments are a demo gateway: nothing is charged, and card or bank details are never sent anywhere.
- The web app ships as one 1 MB JavaScript bundle; splitting it per role with `React.lazy` would speed up the first load.
