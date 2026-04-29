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
  
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('sentinel_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isVerifyingSession, setIsVerifyingSession] = useState(() => {
    if (!user) return false;
    const isTabAuthorized = sessionStorage.getItem('sentinel_active_session') === user.id;
    return !isTabAuthorized;
  });

  useEffect(() => {
    if (!user) {
      setIsDuplicateTab(false);
      setIsVerifyingSession(false);
      return;
    }

    const channel = new BroadcastChannel('sentinel_security_sync');
    const isTabAuthorized = sessionStorage.getItem('sentinel_active_session') === user.id;
    
    if (!isTabAuthorized) {
      setIsVerifyingSession(true);
      channel.postMessage({ type: 'PING_SESSION', userId: user.id, email: user.email });

      const timeout = setTimeout(() => {
        setIsVerifyingSession(false);
        sessionStorage.setItem('sentinel_active_session', user.id);
      }, 400);

      channel.onmessage = (event) => {
        const { type, userId, email } = event.data;
        if (type === 'PONG_SESSION' && (userId === user.id || email === user.email)) {
          clearTimeout(timeout);
          setIsVerifyingSession(false);
          setIsDuplicateTab(true); 
          setUser(null); 
          sessionStorage.removeItem('sentinel_user');
          sessionStorage.removeItem('sentinel_active_session');
        }
      };

      return () => {
        clearTimeout(timeout);
        channel.close();
      };
    } else {
      setIsVerifyingSession(false);
      channel.onmessage = (event) => {
        const { type, userId, email } = event.data;
        if (type === 'PING_SESSION' && (userId === user.id || email === user.email)) {
          channel.postMessage({ type: 'PONG_SESSION', userId: user.id, email: user.email });
        }
      };
      return () => channel.close();
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
    sessionStorage.setItem('sentinel_user', JSON.stringify(userData));
    sessionStorage.setItem('sentinel_active_session', userData.id);
    setIsVerifyingSession(false);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('sentinel_user');
    sessionStorage.removeItem('sentinel_active_session');
    setIsVerifyingSession(false);
    setIsDuplicateTab(false);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const newUser = { ...prev, ...updates };
      sessionStorage.setItem('sentinel_user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isDuplicateTab, isVerifyingSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
