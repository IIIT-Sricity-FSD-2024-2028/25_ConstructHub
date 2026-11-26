import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, logoutUser, currentUserUpdated, selectCurrentUser, selectIsAuthenticated, selectAuthStatus } from '../features/auth/authSlice';

/**
 * Signed-in user and the login / logout actions, read from the Redux store.
 * `login` resolves to `{ success, user }` or `{ success: false, message }` for the login forms.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthStatus) === 'loading';

  const login = useCallback(async (email, password) => {
    try {
      const { user: signedIn, token } = await dispatch(loginUser({ email, password })).unwrap();
      return { success: true, user: signedIn, token };
    } catch (message) {
      return { success: false, message: typeof message === 'string' ? message : 'Login failed' };
    }
  }, [dispatch]);

  const logout = useCallback(() => { dispatch(logoutUser()); }, [dispatch]);
  const setUser = useCallback((changes) => { dispatch(currentUserUpdated(changes)); }, [dispatch]);

  return { user, isAuthenticated, isLoading, login, logout, setUser };
}
