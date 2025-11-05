import '@/styles/globals.css';
import React from 'react';
import { AuthProvider } from '@/hooks/useAuth';

export const metadata = {
  title: 'Property Management Platform',
  description: 'Multi‑tenant onboarding and maintenance ticketing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}