"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Role } from '@/types/models';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout, redirecting to login');
        router.replace('/login');
      }
    }, 3000);
    
    if (!loading) {
      clearTimeout(timeout);
      if (!user) {
        router.replace('/login');
      } else {
        // Use the first organization's role
        const primaryRole = user.organisations?.[0]?.role;
        switch (primaryRole) {
          case Role.LANDLORD:
            router.replace('/dashboard');
            break;
          case Role.TENANT:
            router.replace('/report-issue');
            break;
          case Role.CONTRACTOR:
            router.replace('/jobs');
            break;
          case Role.OPS:
            router.replace('/queue');
            break;
          default:
            router.replace('/login');
        }
      }
    }
    
    return () => clearTimeout(timeout);
  }, [user, loading, router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{loading ? 'Loading...' : 'Redirecting...'}</p>
      </div>
    </div>
  );
}