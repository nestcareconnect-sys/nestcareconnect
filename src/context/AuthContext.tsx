import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Address } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: (User & { addresses?: Address[] }) | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<(User & { addresses?: Address[] }) | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ncc_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('ncc_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.data?.success && res.data.data) {
        setUser(res.data.data);
      } else {
        localStorage.removeItem('ncc_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('ncc_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.data?.success && res.data.data) {
        const { user: loggedInUser, token: receivedToken } = res.data.data;
        localStorage.setItem('ncc_token', receivedToken);
        setToken(receivedToken);
        setUser(loggedInUser as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      if (res.data?.success && res.data.data) {
        const { user: registeredUser, token: receivedToken } = res.data.data;
        localStorage.setItem('ncc_token', receivedToken);
        setToken(receivedToken);
        setUser(registeredUser as any);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('ncc_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isLoading,
        login,
        register,
        logout,
        refreshUser,
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
