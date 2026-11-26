import { createSlice, nanoid } from '@reduxjs/toolkit';

/** App-wide UI state: the toast messages shown in the bottom-right corner. */
const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    toastAdded: {
      reducer(state, action) {
        state.toasts.push(action.payload);
      },
      // prepare callback: the id is generated here so the reducer stays pure
      prepare({ message, type = 'info' }) {
        return { payload: { id: nanoid(), message, type } };
      },
    },
    toastRemoved(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toastAdded, toastRemoved } = uiSlice.actions;
export default uiSlice.reducer;

/** Thunk: show a toast and remove it again after `duration` ms (0 = stays until clicked). Returns the toast id. */
export const showToast = (message, type = 'info', duration = 3500) => (dispatch) => {
  const { payload } = dispatch(toastAdded({ message, type }));
  if (duration > 0) setTimeout(() => dispatch(toastRemoved(payload.id)), duration);
  return payload.id;
};

export const selectToasts = (state) => state.ui.toasts;
