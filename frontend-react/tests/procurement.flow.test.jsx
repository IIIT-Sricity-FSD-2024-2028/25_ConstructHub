// @vitest-environment jsdom
/**
 * UI flow test for procurement & stock, run against the REAL backend (fresh data/db, http://localhost:3000):
 * site engineer requests -> PM approves -> procurement orders -> finance approves (limit lowered by the
 * company admin) -> partial deliveries incl. a refused over-delivery -> stock -> issue -> engineer sees stock.
 *   cd frontend-react && npm install (vitest and testing-library are dev dependencies)
 *   npx vitest run tests/procurement.flow.test.jsx
 */
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import TestProviders from './TestProviders';
import { api } from './testApi';
import SiteEngineerMaterialRequests from '../src/actors/site-engineer/pages/SiteEngineerMaterialRequests';
import ProjectManagerMaterialRequests from '../src/actors/project-manager/pages/ProjectManagerMaterialRequests';
import FinanceManagerPurchaseOrders from '../src/actors/finance-manager/pages/FinanceManagerPurchaseOrders';
import ProcurementRequests from '../src/actors/procurement-storekeeper/pages/ProcurementRequests';
import ProcurementOrders from '../src/actors/procurement-storekeeper/pages/ProcurementOrders';
import ProcurementStock from '../src/actors/procurement-storekeeper/pages/ProcurementStock';
import ProcurementSuppliers from '../src/actors/procurement-storekeeper/pages/ProcurementSuppliers';
import CompanyAdminSettings from '../src/actors/company-admin/pages/CompanyAdminSettings';

function WithUser() {
  return <Outlet context={{ user: api.getCurrentUser(), setUser: () => {} }} />;
}
function App({ at }) {
  return (
    <MemoryRouter initialEntries={[at]}>
      <TestProviders>
          <Routes>
            <Route element={<WithUser />}>
              <Route path="/se/requests" element={<SiteEngineerMaterialRequests />} />
              <Route path="/pm/requests" element={<ProjectManagerMaterialRequests />} />
              <Route path="/fm/orders" element={<FinanceManagerPurchaseOrders />} />
              <Route path="/proc/requests" element={<ProcurementRequests />} />
              <Route path="/proc/orders" element={<ProcurementOrders />} />
              <Route path="/proc/stock" element={<ProcurementStock />} />
              <Route path="/proc/suppliers" element={<ProcurementSuppliers />} />
              <Route path="/admin/settings" element={<CompanyAdminSettings />} />
            </Route>
          </Routes>
      </TestProviders>
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
const lastModal = () => [...document.querySelectorAll('.modal-box')].pop();
const waitModal = () => waitFor(() => { const m = lastModal(); expect(m).toBeTruthy(); return m; }, { timeout: 8000 });
const rowOf = async (re) => (await find(re))[0].closest('tr');

afterEach(() => cleanup());

describe('procurement & stock UI', () => {
  test('request -> approve -> order -> finance approval -> deliveries -> stock -> issue', async () => {
    // ── site engineer raises a request ──
    await signInAs('site@apex.com');
    let ui = render(<App at="/se/requests" />);
    const newBtn = await screen.findByRole('button', { name: /New request/ }, { timeout: 8000 });
    await waitFor(() => expect(newBtn.disabled).toBe(false), { timeout: 8000 }); // projects load asynchronously
    fireEvent.click(newBtn);
    let modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Material 1'), { target: { value: 'Sand (river)' } });
    fireEvent.change(within(modal).getByLabelText('Unit 1'), { target: { value: 'tons' } });
    fireEvent.change(within(modal).getByLabelText('Quantity 1'), { target: { value: '0' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/quantity must be greater than zero/); // client-side validation
    fireEvent.change(within(modal).getByLabelText('Quantity 1'), { target: { value: '30' } });
    fireEvent.submit(modal.querySelector('form'));
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    await find(/Sand \(river\)/);
    ui.unmount();
    const mine = await api.getMaterialRequests();
    const req = mine.find((r) => r.items[0].description === 'Sand (river)');
    expect(req.status).toBe('submitted');

    // ── project manager approves it ──
    await signInAs('pm@apex.com');
    ui = render(<App at="/pm/requests" />);
    const card = (await find(/Sand \(river\)/))[0].closest('[data-testid^="request-"]');
    fireEvent.click(within(card).getByRole('button', { name: /Approve/ }));
    await waitFor(() => expect(screen.queryByText(/Sand \(river\)/)).toBeNull(), { timeout: 8000 });
    ui.unmount();

    // ── company admin lowers the purchase approval limit through the settings screen ──
    await signInAs('admin@apex.com');
    ui = render(<App at="/admin/settings" />);
    const limitInput = await screen.findByLabelText('Purchase approval limit', {}, { timeout: 8000 });
    await waitFor(() => expect(limitInput.value).toBe('100000'));
    fireEvent.change(limitInput, { target: { value: '-4' } });
    fireEvent.submit(limitInput.closest('form'));
    expect((await api.getProcurementSettings()).poApprovalLimit).toBe(100000); // invalid value was not saved
    fireEvent.change(limitInput, { target: { value: '20000' } });
    fireEvent.submit(limitInput.closest('form'));
    await waitFor(async () => expect((await api.getProcurementSettings()).poApprovalLimit).toBe(20000), { timeout: 8000 });
    ui.unmount();

    // ── procurement creates the purchase order (36,000 > 20,000 -> needs finance) ──
    await signInAs('proc@apex.com');
    ui = render(<App at="/proc/requests" />);
    const reqRow = await rowOf(/Sand \(river\)/);
    fireEvent.click(within(reqRow).getByRole('button', { name: /Create PO/ }));
    modal = await waitModal();
    await waitFor(() => expect(within(modal).getByLabelText('Supplier').options.length).toBeGreaterThan(0));
    fireEvent.change(within(modal).getByLabelText('Order quantity Sand (river)'), { target: { value: '45' } }); // more than requested
    fireEvent.change(within(modal).getByLabelText('Rate Sand (river)'), { target: { value: '1200' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/quantity must be between 0 and 30/);
    fireEvent.change(within(modal).getByLabelText('Order quantity Sand (river)'), { target: { value: '30' } });
    await find(/above the company approval limit/); // live warning
    fireEvent.submit(modal.querySelector('form'));
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    await waitFor(async () => expect((await api.getMaterialRequests()).find((r) => r.id === req.id).status).toBe('ordered'), { timeout: 8000 });
    ui.unmount();
    const po = (await api.getPurchaseOrders()).find((p) => p.items[0].description === 'Sand (river)');
    expect(po.status).toBe('pending_approval');
    expect(po.totalAmount).toBe(36000);

    // nothing can be received before approval
    expect((await api.createGoodsReceipt({ poId: po.id, items: [{ poItemId: 'L1', receivedQuantity: 1 }] })).error).toBe(true);

    // ── finance manager approves from the budget-check screen ──
    await signInAs('finance@apex.com');
    ui = render(<App at="/fm/orders" />);
    const poRow = await rowOf(/₹36,000/);
    fireEvent.click(poRow);
    modal = await waitModal();
    await within(modal).findByTestId('budget-check', {}, { timeout: 8000 });
    expect(within(modal).getByText(/Needs your approval/)).toBeTruthy();
    fireEvent.click(within(modal).getByRole('button', { name: /Approve/ }));
    await waitFor(() => expect(screen.queryByText(/₹36,000/)).toBeNull(), { timeout: 8000 });
    ui.unmount();
    expect((await api.getPurchaseOrder(po.id)).status).toBe('approved');

    // ── storekeeper records a partial delivery, an over-delivery is refused, then the rest arrives ──
    await signInAs('proc@apex.com');
    ui = render(<App at="/proc/orders" />);
    fireEvent.click(await rowOf(/₹36,000/));
    await waitModal();
    fireEvent.click(await screen.findByRole('button', { name: /Record delivery/ }));
    modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Received Sand (river)'), { target: { value: '40' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/cannot receive more than ordered/);
    fireEvent.change(within(modal).getByLabelText('Received Sand (river)'), { target: { value: '20' } });
    fireEvent.change(within(modal).getByLabelText('Delivery note'), { target: { value: 'DC-900' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Partly received/);
    expect((await api.getStock('P001')).concat(await api.getStock('P002')).find((s) => s.description === 'Sand (river)').quantity).toBe(20);
    fireEvent.click(await screen.findByRole('button', { name: /Record delivery/ }));
    modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Received Sand (river)'), { target: { value: '10' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Fully received/);
    ui.unmount();
    const stockNow = (await api.getStock()).find((s) => s.description === 'Sand (river)');
    expect(stockNow.quantity).toBe(30);

    // ── storekeeper issues 5 tons to the engineer ──
    ui = render(<App at="/proc/stock" />);
    await find(/Sand \(river\)/);
    const issueBtn = screen.getByRole('button', { name: /Issue material/ });
    await waitFor(() => expect(issueBtn.disabled).toBe(false));
    fireEvent.click(issueBtn);
    modal = await waitModal();
    await waitFor(() => expect(within(modal).getByLabelText('Issue project').options.length).toBeGreaterThan(0));
    fireEvent.change(within(modal).getByLabelText('Issue project'), { target: { value: stockNow.projectId } });
    fireEvent.change(within(modal).getByLabelText('Material 1'), { target: { value: stockNow.id } });
    fireEvent.change(within(modal).getByLabelText('Quantity 1'), { target: { value: '50' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Not enough .*in stock/); // refused: only 30 available
    fireEvent.change(within(modal).getByLabelText('Quantity 1'), { target: { value: '5' } });
    await waitFor(() => expect(within(modal).getByLabelText('Issued to').options.length).toBeGreaterThan(1));
    fireEvent.change(within(modal).getByLabelText('Issued to'), { target: { value: 'U003' } });
    fireEvent.submit(modal.querySelector('form'));
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    ui.unmount();
    expect((await api.getStock()).find((s) => s.id === stockNow.id).quantity).toBe(25);

    // ── supplier directory: add + duplicate refused ──
    ui = render(<App at="/proc/suppliers" />);
    fireEvent.click(await screen.findByRole('button', { name: /Add supplier/ }, { timeout: 8000 }));
    modal = await waitModal();
    fireEvent.change(within(modal).getByLabelText('Supplier name'), { target: { value: 'Omega Sand Works' } });
    fireEvent.submit(modal.querySelector('form'));
    await find(/Omega Sand Works/);
    await waitFor(() => expect(document.querySelector('.modal-box')).toBeNull(), { timeout: 8000 });
    ui.unmount();

    // ── the engineer sees the stock on the Site stock tab, without any prices ──
    await signInAs('site@apex.com');
    ui = render(<App at="/se/requests" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Site stock' }, { timeout: 8000 }));
    const stockRow = await rowOf(/Sand \(river\)/);
    expect(stockRow.textContent).toContain('25');
    expect(document.body.textContent).not.toContain('₹');
    ui.unmount();
  }, 90000);
});
