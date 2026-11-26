import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, addRemoveCase, json } from '../../store/helpers';

const tasksAdapter = createEntityAdapter();

export const fetchTasks = apiThunk('tasks/fetchAll', () => apiRequest('tasks'));
export const fetchTaskById = apiThunk('tasks/fetchOne', (id) => apiRequest(`tasks/${encodeURIComponent(id)}`));
export const createTask = apiThunk('tasks/create', (data) => apiRequest('tasks', json('POST', data)));
export const updateTask = apiThunk('tasks/update', ({ id, changes }) =>
  apiRequest(`tasks/${encodeURIComponent(id)}`, json('PATCH', changes)));
export const deleteTask = apiThunk('tasks/delete', (id) =>
  apiRequest(`tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }));
/** The people working on a project (PM, FM and engineers with tasks there). Kept per project: it scopes the project chat. */
export const fetchProjectTeam = apiThunk('tasks/fetchTeam', (projectId) =>
  apiRequest(`tasks/team/${encodeURIComponent(projectId)}`));

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: listState(tasksAdapter, { teamByProject: {} }),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchTasks, tasksAdapter);
    addUpsertCases(builder, [fetchTaskById, createTask, updateTask], tasksAdapter);
    addRemoveCase(builder, deleteTask, tasksAdapter);
    builder.addCase(fetchProjectTeam.fulfilled, (state, action) => {
      state.teamByProject[action.meta.arg] = Array.isArray(action.payload) ? action.payload.map((m) => m.id).sort() : [];
    });
  },
});

export default tasksSlice.reducer;

export const { selectAll: selectAllTasks, selectById: selectTaskById } = tasksAdapter.getSelectors((state) => state.tasks);
export const selectTasksStatus = (state) => state.tasks.status;
/** Ids of the people on a project's team, or null until loaded. */
export const selectProjectTeamIds = (state, projectId) => state.tasks.teamByProject[projectId] || null;

export const isTaskOpen = (t) => t.status !== 'Completed';

/** Tasks of one project. */
export const selectTasksByProject = createSelector(
  [selectAllTasks, (_state, projectId) => projectId],
  (tasks, projectId) => tasks.filter((t) => t.projectId === projectId),
);

/** Tasks assigned to one person. */
export const selectTasksAssignedTo = createSelector(
  [selectAllTasks, (_state, userId) => userId],
  (tasks, userId) => tasks.filter((t) => t.assignedTo === userId),
);

/**
 * Projects where a site engineer still has unfinished work. The API enforces the same rule: expenses, material
 * requests, site reports and stock issues are only accepted on these projects.
 */
export const selectOpenWorkProjectIds = createSelector(
  [selectAllTasks, (_state, userId) => userId],
  (tasks, userId) => new Set(tasks.filter((t) => t.assignedTo === userId && isTaskOpen(t)).map((t) => t.projectId)),
);
