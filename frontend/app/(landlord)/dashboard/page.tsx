"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function LandlordDashboardPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Welcome{user ? `, ${user.name}` : ''}!</h2>
      <p className="text-gray-700">
        Manage your properties and oversee maintenance tickets. Use the navigation above to get
        started.
      </p>
      <Link href="/properties" className="text-primary underline">
        View your properties
      </Link>
    </div>
  );
}