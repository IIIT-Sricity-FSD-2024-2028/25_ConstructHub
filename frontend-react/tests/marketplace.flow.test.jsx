// @vitest-environment jsdom
/**
 * End-to-end UI flow test for the marketplace screens, run against the REAL backend.
 *
 *   1. start the backend on http://localhost:3000 with a fresh data/db
 *   2. cd frontend-react && npm i --no-save vitest jsdom @testing-library/react @testing-library/dom
 *   3. npx vitest run tests/marketplace.flow.test.jsx
 */
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { api } from '../src/services/api';
import RegisterClient from '../src/auth/RegisterClient';
import ClientRequirements from '../src/actors/client/pages/ClientRequirements';
import ClientRequirementDetail from '../src/actors/client/pages/ClientRequirementDetail';
import CompanyMarketplace from '../src/actors/company-admin/pages/CompanyMarketplace';
import CompanyMarketplaceDetail from '../src/actors/company-admin/pages/CompanyMarketplaceDetail';

const TITLE = 'UI flow test duplex house';

// Pages read the signed-in user from the dashboard layout's outlet context.
function Shell() {
  return <Outlet context={{ user: api.getCurrentUser(), setUser: () => {} }} />;
}

function App({ at }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/register-client" element={<RegisterClient />} />
            <Route path="/login" element={<div>LOGIN PAGE</div>} />
            <Route element={<Shell />}>
              <Route path="/client/requirements" element={<ClientRequirements />} />
              <Route path="/client/requirements/:id" element={<ClientRequirementDetail />} />
              <Route path="/client/project-progress" element={<div>PROJECT PROGRESS</div>} />
              <Route path="/company-admin/marketplace" element={<CompanyMarketplace />} />
              <Route path="/company-admin/marketplace/:id" element={<CompanyMarketplaceDetail />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const text = (re, opts) => screen.findByText(re, opts, { timeout: 8000 });
const signInAs = async (email, password = '123456') => {
  sessionStorage.clear();
  const res = await api.login(email, password);
  expect(res.success, JSON.stringify(res)).toBe(true);
};

afterEach(() => cleanup());

/** A company prices a requirement the way the app requires: admin assigns PM+FM, PM plans stages, FM costs them, admin releases. */
async function estimate(reqId, who, internalCost) {
  await signInAs(who.admin);
  const q = await api.assignEstimateTeam(reqId, { pmId: who.pmId, fmId: who.fmId });
  expect(q.error, JSON.stringify(q)).toBeUndefined();
  await signInAs(who.pm);
  const pm = await api.submitPmEstimate(q.id, { milestoneStages: [{ name: 'Turnkey construction', durationDays: 200, materialScope: 'Complete turnkey construction' }] });
  expect(pm.error, JSON.stringify(pm)).toBeUndefined();
  await signInAs(who.fm);
  const fm = await api.submitFmEstimate(q.id, { stages: [{ internalCost }], mobilizationAdvancePercent: 0 });
  expect(fm.error, JSON.stringify(fm)).toBeUndefined();
  await signInAs(who.admin);
  const until = new Date(Date.now() + 20 * 86400000);
  const rel = await api.releaseQuotation(q.id, { markupPercent: 0, validUntil: `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, '0')}-${String(until.getDate()).padStart(2, '0')}`, notes: 'UI flow quote' });
  expect(rel.error, JSON.stringify(rel)).toBeUndefined();
}
const APEX = { admin: 'admin@apex.com', pm: 'pm@apex.com', fm: 'finance@apex.com', pmId: 'U002', fmId: 'U004' };
const LT = { admin: 'admin@ltinfra.com', pm: 'pm@ltinfra.com', fm: 'finance@ltinfra.com', pmId: 'U007', fmId: 'U009' };

describe('marketplace UI flow', () => {
  test('client signs up, posts a requirement, a company quotes, client awards it', async () => {
    // ── 1. Client self-signup ──
    sessionStorage.clear();
    const email = `uiclient${Date.now()}@example.com`;
    const { container, unmount } = render(<App at="/register-client" />);
    const inputs = container.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'Uma Builder' } });
    fireEvent.change(inputs[1], { target: { value: email } });
    fireEvent.change(inputs[2], { target: { value: '9876501234' } });
    fireEvent.change(inputs[3], { target: { value: 'Secret123' } });
    fireEvent.change(inputs[4], { target: { value: 'Secret123' } });
    fireEvent.submit(container.querySelector('form'));
    await text(/My Requirements/);
    expect(api.getCurrentUser().role).toBe('client');
    unmount();

    // weak password is rejected on the form
    const bad = render(<App at="/register-client" />);
    const bi = bad.container.querySelectorAll('input');
    fireEvent.change(bi[0], { target: { value: 'Short Pw' } });
    fireEvent.change(bi[1], { target: { value: 'x@example.com' } });
    fireEvent.change(bi[3], { target: { value: 'abc' } });
    fireEvent.change(bi[4], { target: { value: 'abc' } });
    fireEvent.submit(bad.container.querySelector('form'));
    await text(/at least 8 characters/);
    bad.unmount();

    // ── 2. Client posts a requirement ──
    const client = render(<App at="/client/requirements" />);
    await text(/No requirements yet/);
    fireEvent.click(screen.getByRole('button', { name: /Post requirement/ }));
    const modal = await waitFor(() => {
      const m = document.querySelector('.modal-box');
      expect(m).toBeTruthy();
      return m;
    });
    const mi = modal.querySelectorAll('input');
    fireEvent.change(mi[0], { target: { value: TITLE } });
    fireEvent.change(modal.querySelector('textarea'), { target: { value: 'Duplex house on a corner plot with parking.' } });
    fireEvent.change(mi[1], { target: { value: 'Nashik, Maharashtra' } });
    fireEvent.change(mi[2], { target: { value: '4000000' } });
    fireEvent.change(mi[3], { target: { value: '6000000' } });
    fireEvent.submit(modal.querySelector('form'));
    await text(/Quotations \(0\)/); // landed on the detail page
    expect(screen.getByText(TITLE, { exact: false })).toBeTruthy();
    client.unmount();

    // ── 3. Two companies quote (Apex through the UI, L&T through the API) ──
    await signInAs('admin@apex.com');
    const market = render(<App at="/company-admin/marketplace" />);
    const row = await screen.findByText(TITLE, {}, { timeout: 8000 });
    expect(screen.queryByText(email)).toBeNull(); // client contact details are not shown to companies
    fireEvent.click(row);
    // Companies now price a requirement through the PM -> FM -> admin estimate workflow (covered by the API suites);
    // here the quotation is filed directly and the page must show it back.
    await text(/Assign PM & FM for Estimate/);
    const reqs = await api.getRequirements();
    const target = reqs.find((r) => r.title === TITLE);
    await estimate(target.id, APEX, 4500000);
    market.unmount();
    const again = render(<App at={`/company-admin/marketplace/${target.id}`} />);
    await text(/Your quotation/);
    await waitFor(() => expect(screen.getAllByText(/₹45,00,000/).length).toBeGreaterThan(0), { timeout: 8000 });
    again.unmount();

    await signInAs('admin@ltinfra.com');
    const list = await api.getRequirements();
    const req = list.find((r) => r.title === TITLE);
    await estimate(req.id, LT, 5200000);

    // L&T cannot see Apex's quotation in the UI (it only sees its own)
    const ltView = render(<App at={`/company-admin/marketplace/${req.id}`} />);
    await text(/Your quotation/);
    expect(screen.queryByText(/₹45,00,000/)).toBeNull();
    ltView.unmount();

    // ── 4. Client compares and awards ──
    await signInAs(email, 'Secret123');
    const compare = render(<App at={`/client/requirements/${req.id}`} />);
    await text(/Quotations \(2\)/);
    expect(screen.getByText('Lowest price')).toBeTruthy();
    expect(screen.getAllByText(/Apex Builders/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: /Accept & award/ })[0]); // cheapest is listed first
    const dialog = await waitFor(() => {
      const d = document.querySelector('.modal-box');
      expect(d).toBeTruthy();
      return d;
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Accept & award/ }));
    await text(/Work order WO-/);
    expect(screen.getByText(/Contract CON/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /View project progress/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Close requirement/ })).toBeNull(); // awarded: no more actions
    compare.unmount();

    // the awarded project now exists for the client
    const projects = await api.getProjects();
    expect(projects.some((p) => p.requirementId === req.id && p.companyId === 'COMP001')).toBe(true);
  }, 60000);
});
