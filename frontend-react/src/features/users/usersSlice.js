import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, addUpsertCases, addRemoveCase, json } from '../../store/helpers';

/** People the signed-in user may see: their company's staff and the clients of its projects. */
const usersAdapter = createEntityAdapter({ sortComparer: (a, b) => String(a.name).localeCompare(String(b.name)) });

export const fetchUsers = apiThunk('users/fetchAll', () => apiRequest('users'));
export const createUser = apiThunk('users/create', (data) => apiRequest('users', json('POST', data)));
export const updateUser = apiThunk('users/update', ({ id, changes }) =>
  apiRequest(`users/${encodeURIComponent(id)}`, json('PATCH', changes)));
export const deleteUser = apiThunk('users/delete', (id) =>
  apiRequest(`users/${encodeURIComponent(id)}`, { method: 'DELETE' }));

const usersSlice = createSlice({
  name: 'users',
  initialState: listState(usersAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchUsers, usersAdapter);
    addUpsertCases(builder, [createUser, updateUser], usersAdapter);
    addRemoveCase(builder, deleteUser, usersAdapter);
  },
});

export default usersSlice.reducer;

export const { selectAll: selectAllUsers, selectById: selectUserById } = usersAdapter.getSelectors((state) => state.users);
export const selectUsersStatus = (state) => state.users.status;

/** Users with a given role (memoised per role). */
export const selectUsersByRole = createSelector(
  [selectAllUsers, (_state, role) => role],
  (users, role) => users.filter((u) => u.role === role),
);

/** Active users of a company plus the clients the server lets this user see. */
export const selectCompanyPeople = createSelector(
  [selectAllUsers, (_state, companyId) => companyId],
  (users, companyId) => users.filter((u) => u.companyId === companyId || u.role === 'client'),
);
