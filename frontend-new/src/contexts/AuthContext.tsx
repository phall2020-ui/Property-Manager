import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  organisations: Array<{
    orgId: string;
    orgName: string;
    role: string;
  }>;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasCheckedAuth = useRef(false);

  useEffect(() => {
    // Only check auth once on mount, not on every render
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // Check if user is logged in on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch (error) {
          console.error('Auth check failed:', error);
          // Only clear token if it's an auth error (401/403), not network errors
          if (error && typeof error === 'object' && 'response' in error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            if (status === 401 || status === 403) {
              localStorage.removeItem('accessToken');
              setUser(null);
            }
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
    } catch (error) {
      console.error('Login failed in AuthContext:', error);
      throw error; // Re-throw to let caller handle it
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const data = await authApi.signup({ email, password, name });
      setUser(data.user);
    } catch (error) {
      console.error('Signup failed in AuthContext:', error);
      throw error; // Re-throw to let caller handle it
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
