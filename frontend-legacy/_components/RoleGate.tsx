"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/models';

interface RoleGateProps {
  role: Role;
  children: React.ReactNode;
}

/**
 * Guards a section of the UI for a specific role. If the user is loading
 * authentication state, nothing is rendered; if the user is not authenticated
 * or does not have the required role, they are redirected to the login page.
 */
export default function RoleGate({ role, children }: RoleGateProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        // Check the first organisation's role (primary role)
        const primaryRole = user.organisations?.[0]?.role;
        if (primaryRole !== role) {
          router.replace('/login');
        }
      }
    }
  }, [loading, user, role, router]);
  
  if (loading) return null;
  if (!user) return null;
  
  // Check the first organisation's role (primary role)
  const primaryRole = user.organisations?.[0]?.role;
  if (primaryRole !== role) return null;
  
  return <>{children}</>;
}