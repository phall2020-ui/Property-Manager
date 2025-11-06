"use client";

import React from 'react';
import Link from 'next/link';
import RoleGate from '@/components/RoleGate';
import { Role } from '@/types/models';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  
  return (
    <RoleGate role={Role.TENANT}>
      <div className="flex min-h-screen flex-col">
        <header className="bg-primary py-4 text-white">
          <div className="container mx-auto flex items-center justify-between px-4">
            <h1 className="text-lg font-semibold">Tenant Portal</h1>
            <nav className="flex items-center space-x-4 text-sm">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/report-issue" className="hover:underline">
                Report Issue
              </Link>
              <Link href="/my-tickets" className="hover:underline">
                My Tickets
              </Link>
              <Link href="/payments" className="hover:underline">
                Payments
              </Link>
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-blue-400">
                <NotificationBell />
                {user && (
                  <span className="text-sm">{user.name}</span>
                )}
                <button
                  onClick={logout}
                  className="text-sm hover:underline"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </header>
        <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
      </div>
    </RoleGate>
  );
}