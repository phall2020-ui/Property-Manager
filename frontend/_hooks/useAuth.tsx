'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getMe, logout } from '@/lib/auth';
import { Role, User } from '@/types/models';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Provide authentication state and helper methods to children. This component
 * also instantiates a global `QueryClient` for React Query. It should wrap
 * your entire app inside `app/layout.tsx`.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInner>{children}</AuthInner>
    </QueryClientProvider>
  );
};

const AuthInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: Infinity,
  });
  const queryClient = useQueryClient();
  const signOut = async () => {
    await logout();
    // Force refetch of user
    void queryClient.invalidateQueries({ queryKey: ['me'] });
  };
  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Helper hook to check if the authenticated user has a given role.
 */
export function useRole(role: Role): boolean {
  const { user } = useAuth();
  return user?.role === role;
}