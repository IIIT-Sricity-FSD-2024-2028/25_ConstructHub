import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, json } from '../../store/helpers';

/**
 * Company-level money views: the role dashboard (one summary per signed-in role), budget top-up requests
 * (FM asks, Company Admin releases margin into the site budget) and client feedback.
 */
const topupsAdapter = createEntityAdapter({ sortComparer: (a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }) });
const feedbackAdapter = createEntityAdapter({ sortComparer: (a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')) });

export const fetchDashboard = apiThunk('finance/fetchDashboard', () => apiRequest('dashboard'));
export const fetchPayments = apiThunk('finance/fetchPayments', () => apiRequest('payments'));

export const fetchBudgetTopups = apiThunk('finance/fetchTopups', () => apiRequest('budget-topups'));
export const requestBudgetTopup = apiThunk('finance/requestTopup', (data) => apiRequest('budget-topups', json('POST', data)));
export const approveBudgetTopup = apiThunk('finance/approveTopup', ({ id, note }) =>
  apiRequest(`budget-topups/${encodeURIComponent(id)}/approve`, json('POST', { note })));
export const rejectBudgetTopup = apiThunk('finance/rejectTopup', ({ id, note }) =>
  apiRequest(`budget-topups/${encodeURIComponent(id)}/reject`, json('POST', { note })));

export const fetchFeedback = apiThunk('finance/fetchFeedback', () => apiRequest('feedback'));
export const submitFeedback = apiThunk('finance/submitFeedback', (data) => apiRequest('feedback', json('POST', data)));

const financeSlice = createSlice({
  name: 'finance',
  initialState: {
    dashboard: { status: 'idle', error: null, data: null },
    payments: [],
    topups: topupsAdapter.getInitialState({ status: 'idle', error: null }),
    feedback: feedbackAdapter.getInitialState({ status: 'idle', error: null }),
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (s) => { s.dashboard.status = 'loading'; s.dashboard.error = null; })
      .addCase(fetchDashboard.fulfilled, (s, a) => { s.dashboard = { status: 'succeeded', error: null, data: a.payload }; })
      .addCase(fetchDashboard.rejected, (s, a) => { s.dashboard.status = 'failed'; s.dashboard.error = a.payload || a.error.message; })
      .addCase(fetchPayments.fulfilled, (s, a) => { s.payments = Array.isArray(a.payload) ? a.payload : []; })
      .addCase(fetchBudgetTopups.pending, (s) => { s.topups.status = 'loading'; })
      .addCase(fetchBudgetTopups.fulfilled, (s, a) => { s.topups.status = 'succeeded'; topupsAdapter.setAll(s.topups, Array.isArray(a.payload) ? a.payload : []); })
      .addCase(fetchBudgetTopups.rejected, (s, a) => { s.topups.status = 'failed'; s.topups.error = a.payload || a.error.message; })
      .addCase(fetchFeedback.pending, (s) => { s.feedback.status = 'loading'; })
      .addCase(fetchFeedback.fulfilled, (s, a) => { s.feedback.status = 'succeeded'; feedbackAdapter.setAll(s.feedback, Array.isArray(a.payload) ? a.payload : []); })
      .addCase(fetchFeedback.rejected, (s) => { s.feedback.status = 'failed'; })
      .addCase(submitFeedback.fulfilled, (s, a) => { if (a.payload?.id) feedbackAdapter.upsertOne(s.feedback, a.payload); });
    [requestBudgetTopup, approveBudgetTopup, rejectBudgetTopup].forEach((t) => builder.addCase(t.fulfilled, (s, a) => {
      if (a.payload?.id) topupsAdapter.upsertOne(s.topups, a.payload);
    }));
  },
});

export default financeSlice.reducer;

export const selectDashboard = (state) => state.finance.dashboard;
export const selectPayments = (state) => state.finance.payments;
export const { selectAll: selectAllBudgetTopups } = topupsAdapter.getSelectors((state) => state.finance.topups);
export const selectBudgetTopupsStatus = (state) => state.finance.topups.status;
export const { selectAll: selectAllFeedback } = feedbackAdapter.getSelectors((state) => state.finance.feedback);
