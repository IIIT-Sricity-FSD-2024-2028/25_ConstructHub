import React, { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize from sessionStorage so there is no hydration delay
  const [user, setUserState] = useState(() => {
    try {
      return api.getCurrentUser();
    } catch (e) {
      return null;
    }
  });

  const [token, setTokenState] = useState(() => {
    try {
      return api.getToken();
    } catch (e) {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync state if sessionStorage changes externally
  useEffect(() => {
    function syncAuth() {
      const u = api.getCurrentUser();
      const t = api.getToken();
      setUserState(u);
      setTokenState(t);
    }
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    const res = await api.login(email, password);
    setIsLoading(false);

    if (res && res.success && res.user) {
      setUserState(res.user);
      setTokenState(res.token);
      return { success: true, user: res.user, token: res.token };
    }
    return { success: false, message: res?.message || 'Login failed' };
  }, []);

  const logout = useCallback(() => {
    setUserState(null);
    setTokenState(null);
    api.logout();
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUserState(updatedUser);
    api.setCurrentUser(updatedUser);
  }, []);

  const value = {
    user,
    setUser: updateUser,
    token,
    isLoading,
    isAuthenticated: Boolean(user && token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
