"use client";

import React from 'react';
import Link from 'next/link';
import RoleGate from '@/components/RoleGate';
import { Role } from '@/types/models';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate role={Role.OPS}>
      <div className="flex min-h-screen flex-col">
        <header className="bg-primary py-4 text-white">
          <div className="container mx-auto flex items-center justify-between px-4">
            <h1 className="text-lg font-semibold">Ops Portal</h1>
            <nav className="space-x-4 text-sm">
              <Link href="/queue" className="hover:underline">
                Queue
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto flex-1 px-4 py-6">{children}</main>
      </div>
    </RoleGate>
  );
}