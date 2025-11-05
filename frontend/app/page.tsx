"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Role } from '@/types/models';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        switch (user.role) {
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
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}