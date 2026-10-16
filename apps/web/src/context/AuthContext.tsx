import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { UserDTO } from '@reachinbox/shared';

interface AuthContextType {
  user: UserDTO | null;
  loading: boolean;
  loginWithDev: (email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const data = await apiRequest<{ user: UserDTO }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const loginWithDev = async (email?: string) => {
    setLoading(true);
    try {
      const data = await apiRequest<{ user: UserDTO }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithDev,
        logout,
        refreshUser
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
