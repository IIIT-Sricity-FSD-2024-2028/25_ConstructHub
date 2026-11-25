// @vitest-environment jsdom
/**
 * Smoke test: signs in as each role and renders every page of the real app against the REAL backend (fresh data),
 * failing on any page that throws, logs a React error, or bounces the user elsewhere.
 *   cd frontend-react && npx vitest run tests/pages.smoke.test.jsx
 */
import { test, expect, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import App from '../src/App';
import { api } from '../src/services/api';

const ROUTES = {
  'super@ch.com': ['/superuser/dashboard', '/superuser/settings'],
  'admin@apex.com': ['/company-admin/dashboard', '/company-admin/marketplace', '/company-admin/marketplace/REQ003', '/company-admin/budget-topups', '/company-admin/subscription', '/company-admin/settings'],
  'proc@apex.com': ['/procurement-storekeeper/dashboard', '/procurement-storekeeper/requests', '/procurement-storekeeper/orders', '/procurement-storekeeper/stock', '/procurement-storekeeper/suppliers', '/procurement-storekeeper/messages', '/procurement-storekeeper/settings'],
  'finance@apex.com': ['/finance-manager/dashboard', '/finance-manager/budget', '/finance-manager/bid-estimates', '/finance-manager/project-budget', '/finance-manager/purchase-orders', '/finance-manager/expenses', '/finance-manager/generate-bills', '/finance-manager/bill-decisions', '/finance-manager/bills/B001', '/finance-manager/bills/B002', '/finance-manager/messages', '/finance-manager/settings'],
  'pm@apex.com': ['/project-manager/dashboard', '/project-manager/projects', '/project-manager/projects/P001', '/project-manager/tasks', '/project-manager/milestones', '/project-manager/bid-estimates', '/project-manager/material-requests', '/project-manager/expenses', '/project-manager/tasks/T001', '/project-manager/reports', '/project-manager/reports/R001', '/project-manager/messages', '/project-manager/settings'],
  'site@apex.com': ['/site-engineer/dashboard', '/site-engineer/my-tasks', '/site-engineer/material-requests', '/site-engineer/expenses', '/site-engineer/tasks/T002', '/site-engineer/update-task?id=T002', '/site-engineer/submit-report', '/site-engineer/messages', '/site-engineer/settings'],
  'client1@gmail.com': ['/client/requirements', '/client/requirements/REQ003', '/client/quotations', '/client/dashboard', '/client/projects', '/client/projects/P001', '/client/project-progress', '/client/reports', '/client/reports/R001', '/client/pending-bills', '/client/bills/B001', '/client/bills/B001/pay', '/client/payment-decisions', '/client/feedback', '/client/messages', '/client/profile', '/client/settings'],
};
const PUBLIC = ['/', '/login', '/register-client', '/contact'];

test('every page renders without crashing', async () => {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {}; // not implemented by jsdom
  const problems = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...a) => { errSpy.last = a.map(String).join(' ').slice(0, 300); errSpy.count = (errSpy.count || 0) + 1; });
  const visit = async (who, path) => {
    errSpy.count = 0; errSpy.last = '';
    window.history.pushState({}, '', path);
    let ui;
    try {
      await act(async () => { ui = render(<App />); });
      await act(async () => { await new Promise((r) => setTimeout(r, 900)); });
      const text = document.body.textContent || '';
      if (/Something went wrong|Cannot read properties|is not a function|undefined is not/i.test(text)) problems.push(`${who} ${path}: error text on page`);
      // Projects come only from awarded quotations: no role may have an "add project" button.
      if ([...document.querySelectorAll('button, a')].some((b) => /(add|new|create)\s+project/i.test(b.textContent || ''))) problems.push(`${who} ${path}: has an add-project button`);
      if (errSpy.count) problems.push(`${who} ${path}: console.error x${errSpy.count}: ${errSpy.last}`);
      if (!window.location.pathname.startsWith(path.split('?')[0].split('/').slice(0, 2).join('/'))) problems.push(`${who} ${path}: redirected to ${window.location.pathname}`);
    } catch (e) {
      problems.push(`${who} ${path}: THREW ${e.message}`);
    } finally {
      ui?.unmount(); cleanup();
    }
  };
  sessionStorage.clear();
  for (const p of PUBLIC) await visit('public', p);
  for (const [email, paths] of Object.entries(ROUTES)) {
    sessionStorage.clear();
    const r = await api.login(email, '123456');
    expect(r.success, email).toBe(true);
    for (const p of paths) await visit(email, p);
  }
  errSpy.mockRestore();
  expect(problems, problems.join('\n')).toEqual([]);
}, 300000);
