import { createSlice } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, qs, json } from '../../store/helpers';

/**
 * Milestone progress per project, as calculated by the server (weighted physical progress, approvals, delays).
 * Kept by project id: `progressByProject[projectId] = { status, error, data }`.
 * Every change to a milestone re-reads that project's progress, because one change moves several numbers.
 */
export const fetchProjectProgress = apiThunk('milestones/fetchProgress', (projectId) =>
  apiRequest(`milestones/progress/${encodeURIComponent(projectId)}`));
/** Milestones across the user's projects (used for pickers and company-wide lists). */
export const fetchMilestones = apiThunk('milestones/fetchAll', (projectId) => apiRequest(`milestones${qs({ projectId })}`));

const refresh = (projectId, dispatch) => (projectId ? dispatch(fetchProjectProgress(projectId)) : null);

export const createMilestone = apiThunk('milestones/create', async (data, { dispatch }) => {
  const res = await apiRequest('milestones', json('POST', data));
  if (!res?.error) await refresh(data.projectId, dispatch);
  return res;
});
export const updateMilestone = apiThunk('milestones/update', async ({ id, projectId, changes }, { dispatch }) => {
  const res = await apiRequest(`milestones/${encodeURIComponent(id)}`, json('PATCH', changes));
  if (!res?.error) await refresh(projectId, dispatch);
  return res;
});
export const deleteMilestone = apiThunk('milestones/delete', async ({ id, projectId }, { dispatch }) => {
  const res = await apiRequest(`milestones/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res?.error) await refresh(projectId, dispatch);
  return res;
});
export const approveMilestone = apiThunk('milestones/approve', async ({ id, projectId }, { dispatch }) => {
  const res = await apiRequest(`milestones/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  if (!res?.error) await refresh(projectId, dispatch);
  return res;
});
export const reopenMilestone = apiThunk('milestones/reopen', async ({ id, projectId }, { dispatch }) => {
  const res = await apiRequest(`milestones/${encodeURIComponent(id)}/reopen`, { method: 'POST' });
  if (!res?.error) await refresh(projectId, dispatch);
  return res;
});

const milestonesSlice = createSlice({
  name: 'milestones',
  initialState: { progressByProject: {}, list: [], listStatus: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjectProgress.pending, (state, action) => {
        const id = action.meta.arg;
        state.progressByProject[id] = { ...(state.progressByProject[id] || { data: null }), status: 'loading', error: null };
      })
      .addCase(fetchProjectProgress.fulfilled, (state, action) => {
        state.progressByProject[action.meta.arg] = { status: 'succeeded', error: null, data: action.payload };
      })
      .addCase(fetchProjectProgress.rejected, (state, action) => {
        const id = action.meta.arg;
        state.progressByProject[id] = { data: null, ...(state.progressByProject[id] || {}), status: 'failed', error: action.payload || action.error.message };
      })
      .addCase(fetchMilestones.pending, (state) => { state.listStatus = 'loading'; })
      .addCase(fetchMilestones.fulfilled, (state, action) => {
        state.listStatus = 'succeeded';
        state.list = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMilestones.rejected, (state) => { state.listStatus = 'failed'; });
  },
});

export default milestonesSlice.reducer;

const EMPTY = Object.freeze({ status: 'idle', error: null, data: null });
export const selectProgressEntry = (state, projectId) => state.milestones.progressByProject[projectId] || EMPTY;
export const selectProjectProgress = (state, projectId) => selectProgressEntry(state, projectId).data;
export const selectMilestoneList = (state) => state.milestones.list;
export const selectMilestoneListStatus = (state) => state.milestones.listStatus;
