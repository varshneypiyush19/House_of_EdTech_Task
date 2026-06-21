import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY, clearTokens } from '../api/client';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  avatar: {
    url: string;
    localPath: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-login check on app restart
  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await SecureStore.getItemAsync(AUTH_ACCESS_TOKEN_KEY);
        if (token) {
          // Verify token by fetching current user details
          const userData = await apiRequest<User>('/users/current-user', { method: 'GET' });
          setUser(userData);
        }
      } catch (err) {
        await clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const payload: Record<string, string> = { password };
      if (usernameOrEmail.includes('@')) {
        payload.email = usernameOrEmail;
      } else {
        payload.username = usernameOrEmail;
      }

      const data = await apiRequest<{
        user: User;
        accessToken: string;
        refreshToken: string;
      }>('/users/login', {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuth: true,
      });

      // Save tokens securely
      await SecureStore.setItemAsync(AUTH_ACCESS_TOKEN_KEY, data.accessToken);
      await SecureStore.setItemAsync(AUTH_REFRESH_TOKEN_KEY, data.refreshToken);

      setUser(data.user);
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await apiRequest<User>('/users/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
        skipAuth: true,
      });
      // Automatically login after successful registration
      await login(username, password);
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiRequest('/users/logout', { method: 'POST', skipRefresh: true });
    } catch (err: any) {
      if (err.statusCode !== 401) {
        throw err;
      }
    } finally {
      await clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateAvatar = async (avatarUri: string) => {
    // FreeAPI expects avatar file as a multipart/form-data upload to /users/avatar
    try {
      const formData = new FormData();
      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('avatar', {
        uri: avatarUri,
        name: filename,
        type,
      } as any);

      const updatedUser = await apiRequest<User>('/users/avatar', {
        method: 'PATCH',
        body: formData,
      });

      setUser(updatedUser);
    } catch (err) {
      throw err;
    }
  };

  const refreshProfile = async () => {
    try {
      const userData = await apiRequest<User>('/users/current-user', { method: 'GET' });
      setUser(userData);
    } catch (err) {
      // Failed to refresh profile
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
