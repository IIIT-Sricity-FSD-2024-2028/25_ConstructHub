import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';

/**
 * Who is signed in. The token and user also live in sessionStorage (per browser tab), so a page refresh keeps the
 * login; the store is initialised from it lazily, once per store.
 */
const readSession = () => {
  try {
    return { user: api.getCurrentUser(), token: api.getToken() };
  } catch {
    return { user: null, token: null };
  }
};

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  const res = await api.login(email, password);
  if (res && res.success) return { user: res.user, token: res.token };
  return rejectWithValue(res?.message || 'Login failed');
});

/** A client creates their own account, then is signed in straight away. */
export const registerClient = createAsyncThunk('auth/registerClient', async (data, { dispatch, rejectWithValue }) => {
  const res = await api.registerClient(data);
  if (res && res.error) return rejectWithValue(Array.isArray(res.message) ? res.message.join(', ') : res.message);
  return dispatch(loginUser({ email: data.email.toLowerCase(), password: data.password })).unwrap();
});

/** Clears the tab's session and returns to the login page (a full page load also empties the store). */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  api.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: () => ({ ...readSession(), status: 'idle', error: null }),
  reducers: {
    /** Profile changes of the signed-in user (name, phone...). Persisted to the session by a listener. */
    currentUserUpdated(state, action) {
      state.user = { ...state.user, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
      });
  },
});

export const { currentUserUpdated } = authSlice.actions;
export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => Boolean(state.auth.user && state.auth.token);
export const selectAuthStatus = (state) => state.auth.status;
export const selectRole = (state) => state.auth.user?.role || null;
