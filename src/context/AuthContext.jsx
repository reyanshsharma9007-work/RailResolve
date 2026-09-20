import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { translations } from '../utils/translations';
import { authService } from '../services/authService';
import { normalizeRole } from '../constants/roles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Canonical uppercase role from the server: PASSENGER | OFFICER |
  // SENIOR_AUTHORITY | ADMIN. The server is the source of truth.
  const [role, setRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Global Persistent Language state
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('railresolve_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('railresolve_language', language);
  }, [language]);

  // Dark / Light Mode with localStorage persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('railresolve_theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('railresolve_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = useCallback((key, fallback) => {
    if (!key) return '';
    const currentDict = translations[language];
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    const defaultDict = translations['en'];
    if (defaultDict && defaultDict[key] !== undefined) {
      return defaultDict[key];
    }
    if (fallback !== undefined) {
      return fallback;
    }
    // Never show raw camelCase: convert to capitalized human readable English
    return String(key)
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }, [language]);

  // Session state
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authService.me();
          if (response.success) {
            setUser(response.data.user);
            setRole(normalizeRole(response.data.user.role));
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error("Session verification failed", error);
          localStorage.removeItem('token');
        }
      }
      setIsAuthLoading(false);
    };

    verifySession();
  }, []);

  // apiClient dispatches this when any request comes back 401 (expired or
  // revoked token), so a stale session drops cleanly back to the login screen
  // instead of leaving the UI in a half-authenticated state.
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setUser(null);
      setRole(null);
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    if (response.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setRole(normalizeRole(response.data.user.role));
      setIsAuthenticated(true);
      return response.data.user;
    }
    throw response;
  };

  const register = async (userData) => {
    const response = await authService.register(userData);
    if (response.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setRole(normalizeRole(response.data.user.role));
      setIsAuthenticated(true);
      return response.data.user;
    }
    throw response;
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setRole(null);
  };

  const toggleLanguage = (lang) => {
    setLanguage(lang);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAuthLoading,
        language,
        theme,
        t,
        toggleTheme,
        login,
        register,
        logout,
        toggleLanguage
      }}
    >
      {!isAuthLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
