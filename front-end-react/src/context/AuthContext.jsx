import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('ch_user');
    const storedToken = sessionStorage.getItem('ch_token');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.removeItem('ch_user');
      }
    }

    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const login = ({ user, token }) => {
    sessionStorage.setItem('ch_user', JSON.stringify(user));

    if (token) {
      sessionStorage.setItem('ch_token', token);
    }

    setUser(user);
    setToken(token ?? null);
  };

  const logout = () => {
    sessionStorage.removeItem('ch_user');
    sessionStorage.removeItem('ch_token');

    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}