import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/** App-wide hooks: always use these instead of the plain react-redux ones, so the store API lives in one place. */
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;

/**
 * Load data when a screen opens: dispatches every given thunk action creator (with its argument) once,
 * and again whenever one of `deps` changes. Returns nothing: read the data with useAppSelector.
 *
 *   useLoad([fetchProjects, fetchTasks]);
 *   useLoad([[fetchProjectProgress, projectId]], [projectId]);
 */
export function useLoad(thunks, deps = []) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    thunks.forEach((entry) => {
      const [thunk, arg] = Array.isArray(entry) ? entry : [entry, undefined];
      if (thunk) dispatch(thunk(arg));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, ...deps]);
}

/** True while a list has never arrived yet (a background refresh of data already on screen does not count). */
export function isFirstLoad(status, hasData) {
  return !hasData && (status === 'idle' || status === 'loading');
}

/** Text of a failed `dispatch(thunk).unwrap()`: our thunks reject with the server's message string. */
export function errorText(err, fallback = 'Something went wrong. Please try again.') {
  if (typeof err === 'string') return err;
  return err?.message || fallback;
}
