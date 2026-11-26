import { createAsyncThunk } from '@reduxjs/toolkit';

/**
 * createAsyncThunk wrapper for our API calls.
 * The API client resolves with `{ error: true, message }` instead of throwing, so this turns such an answer into a
 * rejected action (`rejectWithValue(message)`). Components can then `await dispatch(thunk(arg)).unwrap()` and catch
 * the server's message, and reducers see the usual pending / fulfilled / rejected lifecycle.
 */
export function apiThunk(type, call, options) {
  return createAsyncThunk(
    type,
    async (arg, thunkApi) => {
      const res = await call(arg, thunkApi);
      if (res && res.error) {
        const message = Array.isArray(res.message) ? res.message.join(', ') : res.message;
        return thunkApi.rejectWithValue(message || 'Request failed');
      }
      return res;
    },
    options,
  );
}

/** Initial state of a normalised list: the adapter's `{ ids, entities }` plus the request status of its last fetch. */
export function listState(adapter, extra = {}) {
  return adapter.getInitialState({ status: 'idle', error: null, ...extra });
}

/** Reducer cases for "fetch the whole list": pending -> loading, fulfilled -> replace the list, rejected -> keep the error. */
export function addListCases(builder, thunk, adapter) {
  builder
    .addCase(thunk.pending, (state) => {
      state.status = 'loading';
      state.error = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      state.status = 'succeeded';
      adapter.setAll(state, Array.isArray(action.payload) ? action.payload : []);
    })
    .addCase(thunk.rejected, (state, action) => {
      state.status = 'failed';
      state.error = action.payload || action.error.message;
    });
}

/** Reducer cases for thunks whose answer is one record: insert or update it in the list. */
export function addUpsertCases(builder, thunks, adapter, pick = (payload) => payload) {
  thunks.forEach((thunk) => {
    builder.addCase(thunk.fulfilled, (state, action) => {
      const record = pick(action.payload, action);
      if (record && record.id !== undefined) adapter.upsertOne(state, record);
    });
  });
}

/** Reducer case for a delete thunk whose argument is the id. */
export function addRemoveCase(builder, thunk, adapter) {
  builder.addCase(thunk.fulfilled, (state, action) => {
    adapter.removeOne(state, action.meta.arg);
  });
}

/** Query string from an object, skipping empty values. */
export function qs(params = {}) {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString();
  return s ? `?${s}` : '';
}

export const json = (method, body) => ({ method, body: JSON.stringify(body) });
