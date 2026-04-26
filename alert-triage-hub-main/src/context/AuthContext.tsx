import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type UserRole = 'junior_analyst' | 'soc_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isDuplicateTab: boolean;
  isVerifyingSession: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sentinel_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (!user) {
      setIsDuplicateTab(false);
      setIsVerifyingSession(false);
      return;
    }

    const channel = new BroadcastChannel('sentinel_security_sync');
    
    // Check if this specific tab was the one that logged in
    const isTabAuthorized = sessionStorage.getItem('sentinel_active_session') === user.role;
    
    if (!isTabAuthorized) {
      // SUSPECT: This is a new tab or pasted link.
      // We MUST verify if another tab is active before showing any content.
      setIsVerifyingSession(true);
      channel.postMessage({ type: 'PING_ROLE', role: user.role });

      // Give it 250ms to hear a PONG. If nothing, assume we are safe (e.g. previous tab closed)
      const timeout = setTimeout(() => {
        setIsVerifyingSession(false);
        sessionStorage.setItem('sentinel_active_session', user.role);
      }, 300);

      channel.onmessage = (event) => {
        const { type, role } = event.data;
        if (type === 'PONG_ROLE' && role === user.role) {
          clearTimeout(timeout);
          setIsVerifyingSession(false);
          setIsDuplicateTab(true); 
          // Logout this tab's in-memory state and redirect
          setUser(null); 
          localStorage.removeItem('sentinel_user');
          window.location.href = '/'; // Hard redirect to clear any state
        }
      };
    } else {
      setIsVerifyingSession(false);
      // We are the authorized tab. Listen for probes.
      channel.onmessage = (event) => {
        const { type, role } = event.data;
        if (type === 'PING_ROLE' && role === user.role) {
          channel.postMessage({ type: 'PONG_ROLE', role: user.role });
        }
      };
    }

    return () => channel.close();
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('sentinel_user', JSON.stringify(userData));
    // Mark THIS tab as the authorized one for this role
    sessionStorage.setItem('sentinel_active_session', userData.role);
    setIsVerifyingSession(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sentinel_user');
    sessionStorage.removeItem('sentinel_active_session');
    setIsVerifyingSession(false);
    setIsDuplicateTab(false);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, ...updates };
      localStorage.setItem('sentinel_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isDuplicateTab, isVerifyingSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
