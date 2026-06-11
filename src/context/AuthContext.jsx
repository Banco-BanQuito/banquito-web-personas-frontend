import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContextObject';
import { loginCustomer } from '../api/partyApi';

const STORAGE_KEY = 'banquito_web_personas_auth';

const DEFAULT_AUTH = {
  isAuthenticated: false,
  portal: null,
  user: null,
};

function loadStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_AUTH;
  } catch {
    return DEFAULT_AUTH;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth);

  const login = useCallback(async (username, password) => {
    try {
      const response = await loginCustomer(username, password);
      const data = response.data;

      const userData = {
        customerId: data.customerId,
        username: data.username,
        fullName: data.fullName,
        customerType: data.customerType,
        customerStatus: data.customerStatus,
        credentialStatus: data.credentialStatus,
        mustChangePassword: data.mustChangePassword ?? false,
      };

      const newAuth = {
        isAuthenticated: true,
        mustChangePassword: userData.mustChangePassword,
        portal: 'web-personas',
        user: userData,
      };

      setAuth(newAuth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
      localStorage.setItem('customer', JSON.stringify(userData));

      return userData;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Error en login de cliente:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          message: err.response?.data?.message,
          data: err.response?.data,
          url: err.config?.url,
        });
      }

      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    const newAuth = {
      isAuthenticated: false,
      portal: null,
      user: null,
    };

    setAuth(newAuth);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('customer');
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('logout', handleLogout);
    return () => window.removeEventListener('logout', handleLogout);
  }, [logout]);

  const contextValue = useMemo(() => ({
    ...auth,
    login,
    logout,
  }), [auth, login, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}