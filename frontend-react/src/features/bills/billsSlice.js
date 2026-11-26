import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, addRemoveCase, json } from '../../store/helpers';

/** Client bills (stage bills and the mobilization advance) and the payments received against them. */
const billsAdapter = createEntityAdapter({
  sortComparer: (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)),
});

export const fetchBills = apiThunk('bills/fetchAll', () => apiRequest('bills'));
export const fetchBillById = apiThunk('bills/fetchOne', (id) => apiRequest(`bills/${encodeURIComponent(id)}`));
export const createBill = apiThunk('bills/create', (data) => apiRequest('bills', json('POST', data)));
/** Staff edit wording / due date; a client sends `{ status: 'Accepted' | 'Declined' }`. */
export const updateBill = apiThunk('bills/update', ({ id, changes }) =>
  apiRequest(`bills/${encodeURIComponent(id)}`, json('PATCH', changes)));
export const deleteBill = apiThunk('bills/delete', (id) =>
  apiRequest(`bills/${encodeURIComponent(id)}`, { method: 'DELETE' }));
export const fetchBillPayments = apiThunk('bills/fetchPayments', (billId) =>
  apiRequest(`bills/${encodeURIComponent(billId)}/payments`));
/** Record a payment. The answer carries the updated bill, so its paid / outstanding figures refresh at once. */
export const payBill = apiThunk('bills/pay', ({ billId, payment }) =>
  apiRequest(`bills/${encodeURIComponent(billId)}/payments`, json('POST', payment)));
/** Stage-billing sheet of a project (milestones, quoted amounts, proof, billed state). */
export const fetchBillableSheet = apiThunk('bills/fetchBillable', (projectId) =>
  apiRequest(`bills/billable/${encodeURIComponent(projectId)}`));

const billsSlice = createSlice({
  name: 'bills',
  initialState: listState(billsAdapter, { paymentsByBill: {}, billableByProject: {} }),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchBills, billsAdapter);
    addUpsertCases(builder, [fetchBillById, createBill, updateBill], billsAdapter);
    addUpsertCases(builder, [payBill], billsAdapter, (payload) => payload?.bill);
    addRemoveCase(builder, deleteBill, billsAdapter);
    builder
      .addCase(fetchBillPayments.fulfilled, (state, action) => {
        state.paymentsByBill[action.meta.arg] = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchBillableSheet.fulfilled, (state, action) => {
        state.billableByProject[action.meta.arg] = action.payload;
      })
      // createBill and payBill already have a case above (the upsert), so these extra steps are matchers
      .addMatcher(createBill.fulfilled.match, (state, action) => {
        delete state.billableByProject[action.payload?.projectId]; // stale: that milestone is billed now
      })
      .addMatcher(payBill.fulfilled.match, (state, action) => {
        const { billId } = action.meta.arg;
        const payment = action.payload?.payment;
        if (payment) state.paymentsByBill[billId] = [payment, ...(state.paymentsByBill[billId] || [])];
      });
  },
});

export default billsSlice.reducer;

export const { selectAll: selectAllBills, selectById: selectBillById } = billsAdapter.getSelectors((state) => state.bills);
export const selectBillsStatus = (state) => state.bills.status;
const NO_PAYMENTS = Object.freeze([]);
/** Stage-billing sheet of a project, or null until loaded. */
export const selectBillableSheet = (state, projectId) => state.bills.billableByProject[projectId] || null;
export const selectBillPayments = (state, billId) => state.bills.paymentsByBill[billId] || NO_PAYMENTS;

/** Normalised decision of a bill: approved/accepted/paid -> Accepted, rejected/declined -> Declined. */
export function billDecision(status) {
  const s = String(status || '').trim().toLowerCase();
  if (['approved', 'accepted', 'paid'].includes(s)) return 'Accepted';
  if (['rejected', 'declined'].includes(s)) return 'Declined';
  return 'Pending Decision';
}

export const selectBillsOfProject = createSelector(
  [selectAllBills, (_state, projectId) => projectId],
  (bills, projectId) => bills.filter((b) => b.projectId === projectId),
);

/** Total the client has been invoiced on a project (declined bills do not count). */
export const selectBilledToDate = createSelector(
  [selectBillsOfProject],
  (bills) => bills.filter((b) => billDecision(b.status) !== 'Declined').reduce((sum, b) => sum + (Number(b.amount) || 0), 0),
);

export const selectPendingBills = createSelector([selectAllBills], (bills) =>
  bills.filter((b) => billDecision(b.status) === 'Pending Decision'));
