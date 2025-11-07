"use client";

import React from 'react';
import Link from 'next/link';
import RoleGate from '@/components/RoleGate';
import { Role } from '@/types/models';
import { NotificationBell } from '@/components/NotificationBell';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/Badge';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut: logout } = useAuth();
  
  return (
    <RoleGate role={Role.OPS}>
      <div className="flex min-h-screen flex-col">
        <header className="bg-primary py-4 text-white">
          <div className="container mx-auto flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <Link href="/queue" className="hover:opacity-90">
                <h1 className="text-lg font-semibold">Ops Portal</h1>
              </Link>
              <Badge color="danger">Operations</Badge>
            </div>
            <nav className="flex items-center space-x-4 text-sm">
              <Link href="/queue" className="hover:underline">
                Queue
              </Link>
              <Link href="/job-queues" className="hover:underline">
                Job Queues
              </Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-blue-400">
                <NotificationBell />
                {user && (
                  <span className="text-sm font-medium">{user.name}</span>
                )}
                <button
                  onClick={logout}
                  className="text-sm hover:underline font-medium"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </header>
        <main className="container mx-auto flex-1 px-4 py-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </RoleGate>
  );
}