import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, addRemoveCase, json, qs } from '../../store/helpers';

const reportsAdapter = createEntityAdapter({
  sortComparer: (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)),
});

export const fetchReports = apiThunk('reports/fetchAll', () => apiRequest('reports'));
export const fetchReportById = apiThunk('reports/fetchOne', (id) => apiRequest(`reports/${encodeURIComponent(id)}`));
export const createReport = apiThunk('reports/create', (data) => apiRequest('reports', json('POST', data)));
export const deleteReport = apiThunk('reports/delete', (id) =>
  apiRequest(`reports/${encodeURIComponent(id)}`, { method: 'DELETE' }));
/** Upload site photos; the answer holds their URLs (nothing is stored in Redux until the report is saved). */
export const uploadReportPhotos = apiThunk('reports/uploadPhotos', (files) => {
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  return apiRequest('reports/upload', { method: 'POST', body: form });
});
/** Material issued to the calling engineer on a project and not yet reported as used. */
export const fetchStockAvailable = apiThunk('reports/fetchStockAvailable', (projectId) =>
  apiRequest(`reports/stock-available${qs({ projectId })}`));

const reportsSlice = createSlice({
  name: 'reports',
  initialState: listState(reportsAdapter, { stockAvailableByProject: {} }),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchReports, reportsAdapter);
    addUpsertCases(builder, [fetchReportById, createReport], reportsAdapter);
    addRemoveCase(builder, deleteReport, reportsAdapter);
    builder.addCase(fetchStockAvailable.fulfilled, (state, action) => {
      state.stockAvailableByProject[action.meta.arg] = Array.isArray(action.payload) ? action.payload : [];
    });
  },
});

export default reportsSlice.reducer;

export const { selectAll: selectAllReports, selectById: selectReportById } = reportsAdapter.getSelectors((state) => state.reports);
export const selectReportsStatus = (state) => state.reports.status;
const NO_STOCK = Object.freeze([]);
/** Material issued to the signed-in engineer on a project and not yet reported as used. */
export const selectStockAvailable = (state, projectId) => state.reports.stockAvailableByProject[projectId] || NO_STOCK;

export const selectReportsByProject = createSelector(
  [selectAllReports, (_state, projectId) => projectId],
  (reports, projectId) => reports.filter((r) => r.projectId === projectId),
);
