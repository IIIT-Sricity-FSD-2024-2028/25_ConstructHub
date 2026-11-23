// @vitest-environment jsdom
/**
 * UI flow test for expenses, bill payments and live dashboards, run against the REAL backend
 * (fresh data/db, http://localhost:3000):
 *   engineer submits (receipt missing) -> PM returns -> engineer corrects with receipt -> PM verifies ->
 *   finance approves (counts as spend) -> reimbursed;  client accepts a bill and pays it in two demo payments,
 *   finance records an offline payment on another bill;  dashboards show the real numbers.
 *   cd frontend-react && npm i --no-save vitest jsdom @testing-library/react @testing-library/dom
 *   npx vitest run tests/expenses-payments.flow.test.jsx
 */
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { FormData as NodeFormData } from 'undici';
import { File as NodeFile } from 'node:buffer';
import { AuthProvider } from '../src/context/AuthContext';
import { ToastProvider } from '../src/context/ToastContext';
import { api } from '../src/services/api';
import SiteEngineerExpenses from '../src/actors/site-engineer/pages/SiteEngineerExpenses';
import ProjectManagerExpenses from '../src/actors/project-manager/pages/ProjectManagerExpenses';
import FinanceManagerExpenses from '../src/actors/finance-manager/pages/FinanceManagerExpenses';
import ClientBillDetail from '../src/actors/client/pages/ClientBillDetail';
import FinanceManagerBillDetail from '../src/actors/finance-manager/pages/FinanceManagerBillDetail';
import LiveSummary from '../src/components/dashboard/LiveSummary';

function WithUser() {
  return <Outlet context={{ user: api.getCurrentUser(), setUser: () => {} }} />;
}
function App({ at }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<WithUser />}>
              <Route path="/se/expenses" element={<SiteEngineerExpenses />} />
              <Route path="/pm/expenses" element={<ProjectManagerExpenses />} />
              <Route path="/fm/expenses" element={<FinanceManagerExpenses />} />
              <Route path="/client/bill/:id" element={<ClientBillDetail />} />
              <Route path="/fm/bill/:id" element={<FinanceManagerBillDetail />} />
              <Route path="/summary" element={<LiveSummary />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

const signInAs = async (email, password = '123456') => {
  sessionStorage.clear();
  localStorage.clear();
  const res = await api.login(email, password);
  expect(res.success, JSON.stringify(res)).toBe(true);
};
const find = (re) => screen.findAllByText(re, {}, { timeout: 8000 });
const waitModal = () => waitFor(() => { const m = [...document.querySelectorAll('.modal-box')].pop(); expect(m).toBeTruthy(); return m; }, { timeout: 8000 });
const modalClosed = () => waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
// read straight from the server (api.getProjects() may answer from its local cache)
const serverProject = async (id) =>
  (await fetch(`http://localhost:3000/projects/${id}`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('ch_token')}` } })).json();
const receipt = () => new NodeFile(['%PDF-1.4 ui test receipt'], 'diesel-bill.pdf', { type: 'application/pdf' });

afterEach(() => cleanup());

describe('expenses, payments and dashboards UI', () => {
  test('expense approval chain and bill payments end to end', async () => {
    // jsdom's FormData cannot be sent by Node's fetch: use the native one for uploads
    globalThis.FormData = NodeFormData;
    globalThis.File = NodeFile;

    // ── engineer submits an expense above ₹1,000 WITHOUT a receipt ──
    await signInAs('site@apex.com');
    let ui = render(<App at="/se/expenses" />);
    const newBtn = await screen.findByRole('button', { name: /New expense/ }, { timeout: 8000 });
    await waitFor(() => expect(newBtn.disabled).toBe(false), { timeout: 8000 });
    fireEvent.click(newBtn);
    let modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Amount'), { target: { value: '0' } });
    fireEvent.change(within(modal).getByLabelText('Description'), { target: { value: 'Diesel for the concrete mixer' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Enter the amount spent/);
    fireEvent.change(within(modal).getByLabelText('Amount'), { target: { value: '4500' } });
    fireEvent.submit(modal.querySelector('form'));
    await modalClosed();
    await find(/Diesel for the concrete mixer/);
    ui.unmount();
    const claim = (await api.getExpenseClaims()).find((e) => e.description === 'Diesel for the concrete mixer');
    expect(claim.status).toBe('submitted');
    const spentBefore = (await serverProject(claim.projectId)).spent;

    // ── PM cannot verify without a receipt, so returns it ──
    await signInAs('pm@apex.com');
    ui = render(<App at="/pm/expenses" />);
    let card = (await find(/Diesel for the concrete mixer/))[0].closest('[data-testid^="expense-"]');
    fireEvent.click(within(card).getByRole('button', { name: /Verify/ }));
    await find(/receipt is required/i); // refused by the server, shown as a message
    expect((await api.getExpenseClaim(claim.id)).status).toBe('submitted');
    fireEvent.click(within(card).getByRole('button', { name: /Return/ }));
    modal = await waitModal();
    fireEvent.click(within(modal).getByRole('button', { name: /Return expense/ })); // reason is required
    await find(/Please give a reason/);
    fireEvent.change(within(modal).getByLabelText('Reason'), { target: { value: 'Attach the diesel bill' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Return expense/ }));
    await modalClosed();
    ui.unmount();
    expect((await api.getExpenseClaim(claim.id)).status).toBe('returned');

    // ── engineer sees it returned, corrects it and attaches the receipt ──
    await signInAs('site@apex.com');
    ui = render(<App at="/se/expenses" />);
    await find(/were returned to you/);
    fireEvent.click((await find(/Diesel for the concrete mixer/))[0].closest('tr'));
    await waitModal();
    expect((await screen.findAllByText(/Attach the diesel bill/)).length).toBeGreaterThan(0); // the PM's reason is visible
    fireEvent.click(await screen.findByRole('button', { name: /Correct & resubmit/ }));
    modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Amount'), { target: { value: '4400' } });
    const input = within(modal).getByTestId('receipt-input');
    fireEvent.change(input, { target: { files: [receipt()] } });
    fireEvent.submit(modal.querySelector('form'));
    await modalClosed();
    ui.unmount();
    const fixed = await api.getExpenseClaim(claim.id);
    expect(fixed.status).toBe('submitted');
    expect(fixed.amount).toBe(4400);
    expect(fixed.receipts.length).toBe(1);
    expect(fixed.history.map((h) => h.step)).toEqual(['submitted', 'returned', 'resubmitted']);

    // ── PM verifies ──
    await signInAs('pm@apex.com');
    ui = render(<App at="/pm/expenses" />);
    card = (await find(/Diesel for the concrete mixer/))[0].closest('[data-testid^="expense-"]');
    expect(within(card).getByText('diesel-bill.pdf')).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: /Verify/ }));
    await waitFor(() => expect(screen.queryByTestId(`expense-${claim.id}`)).toBeNull(), { timeout: 8000 });
    ui.unmount();

    // ── finance approves; only now does it count as project spend ──
    expect((await serverProject(claim.projectId)).spent).toBe(spentBefore);
    await signInAs('finance@apex.com');
    ui = render(<App at="/fm/expenses" />);
    fireEvent.click((await find(/Diesel for the concrete mixer/))[0].closest('tr'));
    modal = await waitModal();
    await within(modal).findByTestId('budget-check', {}, { timeout: 8000 });
    fireEvent.click(within(modal).getByRole('button', { name: /Approve/ }));
    await modalClosed();
    expect((await serverProject(claim.projectId)).spent).toBe(spentBefore + 4400);

    // ── reimbursement is a separate step ──
    fireEvent.click(await screen.findByRole('button', { name: /To reimburse/ }));
    fireEvent.click((await find(/Diesel for the concrete mixer/))[0].closest('tr'));
    modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Payment reference'), { target: { value: 'UPI-5551' } });
    fireEvent.click(within(modal).getByRole('button', { name: /Mark as reimbursed/ }));
    await modalClosed();
    ui.unmount();
    expect((await api.getExpenseClaim(claim.id)).reimbursement.reference).toBe('UPI-5551');

    // ── client accepts bill B001 and pays it in two demo payments ──
    await signInAs('client@apex.com');
    ui = render(<App at="/client/bill/B001" />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Accept Payment/ }, { timeout: 8000 }))[0]);
    await screen.findByTestId('bill-payments');
    const payAmount = await screen.findByLabelText('Payment amount', {}, { timeout: 8000 });
    fireEvent.change(payAmount, { target: { value: '9999999999' } });
    fireEvent.submit(payAmount.closest('form'));
    await find(/cannot be more than the outstanding/);
    fireEvent.change(payAmount, { target: { value: '1000000' } });
    fireEvent.submit(payAmount.closest('form'));
    await waitFor(async () => expect((await api.getBillPayments('B001')).length).toBe(1), { timeout: 8000 });
    await find(/Partially Paid/);
    fireEvent.click(screen.getByRole('button', { name: /Full balance/ }));
    fireEvent.submit(screen.getByLabelText('Payment amount').closest('form'));
    await waitFor(async () => expect((await api.getBill?.('B001') ?? (await api.getBills()).find((b) => b.id === 'B001')).paymentStatus).toBe('Paid'), { timeout: 8000 });
    ui.unmount();
    const pays = await api.getBillPayments('B001');
    expect(pays.reduce((s, p) => s + p.amount, 0)).toBe(4500000);
    expect(pays.every((p) => p.method === 'Online payment (demo)' && p.reference.startsWith('DEMO-'))).toBe(true);

    // ── finance records an offline payment on B002 (already partly paid) ──
    await signInAs('finance@apex.com');
    ui = render(<App at="/fm/bill/B002" />);
    const amt = await screen.findByLabelText('Payment amount', {}, { timeout: 8000 });
    fireEvent.change(amt, { target: { value: '200000' } });
    fireEvent.submit(amt.closest('form')); // bank transfer needs a reference
    await find(/Enter the payment reference/);
    fireEvent.change(screen.getByLabelText('Payment reference'), { target: { value: 'NEFT-4242' } });
    fireEvent.submit(amt.closest('form'));
    await waitFor(async () => expect((await api.getBillPayments('B002')).length).toBe(2), { timeout: 8000 });
    ui.unmount();

    // ── dashboards show the real numbers ──
    const fmData = await api.getDashboard();
    expect(fmData.receivables.paid).toBe(4500000 + 3000000 + 200000);
    ui = render(<App at="/summary" />);
    await screen.findByTestId('live-summary', {}, { timeout: 8000 });
    expect((await find(new RegExp(inr(fmData.budget.spent).replace(/[₹.]/g, '\\$&'))))[0]).toBeTruthy();
    expect(screen.getByText('Spent (approved)')).toBeTruthy();
    expect(screen.getByTestId('project-row-P001')).toBeTruthy();
    ui.unmount();

    await signInAs('client@apex.com');
    ui = render(<App at="/summary" />);
    await screen.findByTestId('live-summary', {}, { timeout: 8000 });
    await find(/Contract value/);
    expect(screen.queryByText(/Spent \(approved\)/)).toBeNull(); // clients never see the contractor's costs
    expect((await find(/Collected|Paid/))[0]).toBeTruthy();
    ui.unmount();
  }, 120000);
});
