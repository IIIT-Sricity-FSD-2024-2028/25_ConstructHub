import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, addRemoveCase, json } from '../../store/helpers';

/**
 * Projects visible to the signed-in user. The server already limits the list by role, and every project carries
 * `allowed`: what this user may do with it right now (add tasks, delete, raise a bill...). Screens read those
 * flags through the selectors below instead of re-implementing the rules.
 */
const projectsAdapter = createEntityAdapter();

export const fetchProjects = apiThunk('projects/fetchAll', () => apiRequest('projects'));
export const fetchProjectById = apiThunk('projects/fetchOne', (id) => apiRequest(`projects/${encodeURIComponent(id)}`));
export const updateProject = apiThunk('projects/update', ({ id, changes }) =>
  apiRequest(`projects/${encodeURIComponent(id)}`, json('PATCH', changes)));
export const deleteProject = apiThunk('projects/delete', (id) =>
  apiRequest(`projects/${encodeURIComponent(id)}`, { method: 'DELETE' }));

const projectsSlice = createSlice({
  name: 'projects',
  initialState: listState(projectsAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchProjects, projectsAdapter);
    addUpsertCases(builder, [fetchProjectById, updateProject], projectsAdapter);
    addRemoveCase(builder, deleteProject, projectsAdapter);
  },
});

export default projectsSlice.reducer;

export const {
  selectAll: selectAllProjects,
  selectById: selectProjectById,
  selectEntities: selectProjectEntities,
} = projectsAdapter.getSelectors((state) => state.projects);

export const selectProjectsStatus = (state) => state.projects.status;
export const selectProjectsError = (state) => state.projects.error;

/** Projects managed by a project manager (memoised per user id). */
export const selectProjectsManagedBy = createSelector(
  [selectAllProjects, (_state, userId) => userId],
  (projects, userId) => projects.filter((p) => p.managerId === userId),
);

/** Projects whose finance manager is this user. */
export const selectProjectsFinancedBy = createSelector(
  [selectAllProjects, (_state, userId) => userId],
  (projects, userId) => projects.filter((p) => p.financeManagerId === userId),
);

/**
 * Projects where the signed-in site engineer may log site work (expenses, material requests, reports, stock use):
 * they still have an unfinished task there and the project is running. The server computes the flag.
 */
export const selectSiteWorkProjects = createSelector([selectAllProjects], (projects) =>
  projects.filter((p) => p.allowed?.canDoSiteWork));

/** Projects an engineer may file a site report for: open work, or a finished milestone still awaiting approval (proof). */
export const selectReportProjects = createSelector([selectAllProjects], (projects) =>
  projects.filter((p) => p.allowed?.canDoSiteWork || p.allowed?.canSubmitProofReport));

/** Projects of a client. */
export const selectProjectsOfClient = createSelector(
  [selectAllProjects, (_state, clientId) => clientId],
  (projects, clientId) => projects.filter((p) => p.clientId === clientId),
);

const NONE = Object.freeze({});
/** What the signed-in user may do with a project (flags computed by the API). Empty object while unknown. */
export const selectProjectAllowed = (state, id) => selectProjectById(state, id)?.allowed || NONE;

/**
 * Status to show for a project. The API sends `displayStatus`: a project stored as "On Track" or "In Progress" that
 * has an overdue milestone is shown as "Delayed", so every screen tells the same story. The optional count is a
 * fallback for records that do not carry it.
 */
export function projectDisplayStatus(project, delayedMilestones = 0) {
  if (!project) return '';
  if (project.displayStatus) return project.displayStatus;
  if (delayedMilestones > 0 && (project.status === 'On Track' || project.status === 'In Progress')) return 'Delayed';
  return project.status;
}
