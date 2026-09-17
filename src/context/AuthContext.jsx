import React, { createContext, useState, useContext, useEffect } from 'react';
import { initialUser, initialComplaints, initialTickets } from '../utils/mockData';
import { translations } from '../utils/translations';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initialUser);
  const [role, setRole] = useState('passenger'); // 'passenger' | 'admin'
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const t = (key, fallback) => {
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
  };

  const [complaints, setComplaints] = useState(initialComplaints);
  const [tickets, setTickets] = useState(initialTickets);

  const login = (selectedRole, customUser) => {
    const cleanRole = selectedRole === 'admin' ? 'admin' : 'passenger';
    setRole(cleanRole);
    setIsAuthenticated(true);
    if (customUser) {
      setUser(customUser);
    } else {
      setUser({
        name: cleanRole === 'admin' ? 'System Admin' : 'Rajesh Kumar',
        role: cleanRole,
        email: cleanRole === 'admin' ? 'admin@railresolve.gov.in' : 'rajesh.kumar@example.com',
        phone: '+91 98765 43210',
        pnr: '2489-1058-39',
        tier: cleanRole === 'admin' ? 'System Administrator' : 'Verified Passenger',
        avatar: cleanRole === 'admin'
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuByXgmf2t_ZjweU5On_-g0VjyP_66LFe4L-YDf5OPTOc-24PcROX3ZGxMk1JDmkIFfP65hZ8QTOEMLSbbNFSG1A3rIoNezFM-lSpkcrtAf-SBIILWBxwCCQ41cA5S3Q6P0pOZxrBFKqnABzv6TUpjyc6xP1Z6LPYqNIriAoWLWfoHBluyetuMnqF-kemegnvNFnJIq-30ZeCP1Q4J3ZJXQo2psVy9c3KmSTwgPnSF7Xvt6IjBZyiiwmQBnN6nbxOQPvwQ'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBikO5Q8O6sJKFRh2TyU_yIecJEbNSt2V5Bhvpfk-LMP2L1BwRgK-t0Tx2j2c8JH4A9rcKSQsKpZS37oFtWFqhFBWCqrJBxHbe_An59ILWQgpEKaTt_yBWGjAPnyLRhHhwCSXRBqTa0tJBLlQ5sJlhWxzZIXIO4WDhS9m2oTjVowIB1kvLZFSHTzi6I1tvbvhX6rcD5EHMY3cMgQeLROo1bXgeyN_5BdsqNByeMAPzXdvRkagVO38Wxjm2-Vj_cdKetmA'
      });
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const toggleLanguage = (lang) => {
    setLanguage(lang);
  };

  const addComplaint = (newComplaint) => {
    setComplaints((prev) => [newComplaint, ...prev]);
  };

  const updateComplaintStatus = (id, newStatus, assignedTo) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: newStatus || c.status,
              assignedTo: assignedTo || c.assignedTo,
              timeline: c.timeline.map((step) => {
                if (newStatus === 'IN_PROGRESS' && step.stage === 'Onboard Action') {
                  return { ...step, completed: true, current: true };
                }
                if (newStatus === 'RESOLVED' && step.stage === 'Resolved & Closed') {
                  return { ...step, completed: true, current: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                }
                return step;
              })
            }
          : c
      )
    );
  };

  const addChatMessage = (complaintId, msg) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === complaintId
          ? {
              ...c,
              chatMessages: [...c.chatMessages, msg]
            }
          : c
      )
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        language,
        theme,
        t,
        toggleTheme,
        login,
        logout,
        toggleLanguage,
        complaints,
        tickets,
        addComplaint,
        updateComplaintStatus,
        addChatMessage
      }}
    >
      {children}
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
