import { createSlice, createEntityAdapter, createSelector } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import { apiThunk, listState, addListCases, json } from '../../store/helpers';

/** The bell menu: the signed-in user's own notifications (the server never returns anyone else's). */
const notificationsAdapter = createEntityAdapter({
  sortComparer: (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.id).localeCompare(String(a.id)),
});

export const fetchNotifications = apiThunk('notifications/fetchAll', () => apiRequest('notifications'));
export const markNotificationRead = apiThunk('notifications/markRead', (id) =>
  apiRequest(`notifications/${encodeURIComponent(id)}`, json('PATCH', { read: true })));
export const deleteNotification = apiThunk('notifications/delete', (id) =>
  apiRequest(`notifications/${encodeURIComponent(id)}`, { method: 'DELETE' }));
export const clearNotifications = apiThunk('notifications/clearAll', () => apiRequest('notifications/clear/all', { method: 'DELETE' }));
/** Tell a colleague (or the project's client) about something. Not stored: it is their notification, not ours. */
export const sendNotification = apiThunk('notifications/send', (data) => apiRequest('notifications', json('POST', data)));

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: listState(notificationsAdapter),
  reducers: {},
  extraReducers: (builder) => {
    addListCases(builder, fetchNotifications, notificationsAdapter);
    builder
      // optimistic: the badge drops at once; a failed call puts it back
      .addCase(markNotificationRead.pending, (state, action) => {
        notificationsAdapter.updateOne(state, { id: action.meta.arg, changes: { read: true } });
      })
      .addCase(markNotificationRead.rejected, (state, action) => {
        notificationsAdapter.updateOne(state, { id: action.meta.arg, changes: { read: false } });
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        notificationsAdapter.removeOne(state, action.meta.arg);
      })
      .addCase(clearNotifications.fulfilled, (state) => {
        // the server keeps client feedback items; re-read to show exactly what is left
        state.status = 'idle';
      });
  },
});

export default notificationsSlice.reducer;

export const { selectAll: selectAllNotifications } = notificationsAdapter.getSelectors((state) => state.notifications);
export const selectUnreadCount = createSelector([selectAllNotifications], (list) => list.filter((n) => !n.read).length);
