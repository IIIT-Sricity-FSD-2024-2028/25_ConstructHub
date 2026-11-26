import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, json, qs } from '../../store/helpers';

/**
 * Expense claims: submitted (site engineer) -> pm_verified (project manager) -> approved (finance manager),
 * then reimbursed. Each workflow step answers with the updated claim, which replaces the stored one.
 */
const expensesAdapter = createEntityAdapter({
  sortComparer: (a, b) => String(b.createdAt + b.id).localeCompare(String(a.createdAt + a.id)),
});

const post = (id, step, body) => apiRequest(`expenses/${encodeURIComponent(id)}/${step}`, json('POST', body || {}));

export const fetchExpenseClaims = apiThunk('expenses/fetchAll', (params = {}) => apiRequest(`expenses${qs(params)}`));
export const fetchExpenseClaim = apiThunk('expenses/fetchOne', (id) => apiRequest(`expenses/${encodeURIComponent(id)}`));
export const submitExpense = apiThunk('expenses/submit', (data) => apiRequest('expenses', json('POST', data)));
export const resubmitExpense = apiThunk('expenses/resubmit', ({ id, changes }) =>
  apiRequest(`expenses/${encodeURIComponent(id)}`, json('PATCH', changes)));
export const withdrawExpense = apiThunk('expenses/withdraw', (id) => post(id, 'withdraw'));
export const uploadExpenseReceipts = apiThunk('expenses/uploadReceipts', ({ id, files }) => {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('receipts', f));
  return apiRequest(`expenses/${encodeURIComponent(id)}/receipts`, { method: 'POST', body: form });
});
export const verifyExpense = apiThunk('expenses/verify', ({ id, note }) => post(id, 'verify', { note }));
export const pmReturnExpense = apiThunk('expenses/pmReturn', ({ id, note }) => post(id, 'pm-return', { note }));
export const pmRejectExpense = apiThunk('expenses/pmReject', ({ id, note }) => post(id, 'pm-reject', { note }));
export const approveExpense = apiThunk('expenses/approve', ({ id, note }) => post(id, 'approve', { note }));
export const fmReturnExpense = apiThunk('expenses/fmReturn', ({ id, note }) => post(id, 'return', { note }));
export const fmRejectExpense = apiThunk('expenses/fmReject', ({ id, note }) => post(id, 'reject', { note }));
export const reimburseExpense = apiThunk('expenses/reimburse', ({ id, reference }) => post(id, 'reimburse', { reference }));

const STEPS = [fetchExpenseClaim, submitExpense, resubmitExpense, withdrawExpense, uploadExpenseReceipts, verifyExpense,
  pmReturnExpense, pmRejectExpense, approveExpense, fmReturnExpense, fmRejectExpense, reimburseExpense];

const expensesSlice = createSlice({
  name: 'expenses',
  initialState: listState(expensesAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchExpenseClaims, expensesAdapter);
    // the detail answer carries a budget check: keep it on the claim so the review screen can show it
    addUpsertCases(builder, STEPS, expensesAdapter);
  },
});

export default expensesSlice.reducer;

export const { selectAll: selectAllExpenses, selectById: selectExpenseById } = expensesAdapter.getSelectors((state) => state.expenses);
export const selectExpensesStatus = (state) => state.expenses.status;

export const selectExpensesByStatus = createSelector(
  [selectAllExpenses, (_state, status) => status],
  (claims, status) => claims.filter((c) => c.status === status),
);
