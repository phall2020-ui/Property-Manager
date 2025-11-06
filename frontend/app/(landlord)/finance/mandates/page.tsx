"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMandates } from '@/lib/financeClient';
import { CreditCard } from 'lucide-react';

export default function MandatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'mandates'],
    queryFn: () => listMandates({}),
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Direct Debit Mandates</h1>
        <p className="text-gray-600 mt-1">Manage recurring payment methods</p>
      </div>

      {/* Mandates List */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading mandates...</div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No mandates found</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a mandate to enable Direct Debit payments
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Activated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.data.map((mandate: any) => (
                <tr key={mandate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {mandate.tenantUser?.name || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {mandate.tenantUser?.email || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mandate.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {mandate.reference || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                        mandate.status
                      )}`}
                    >
                      {mandate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(mandate.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {mandate.activatedAt
                      ? new Date(mandate.activatedAt).toLocaleDateString('en-GB')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-lg border bg-blue-50 p-4">
        <div className="flex items-start">
          <CreditCard className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">About Direct Debit Mandates</p>
            <p className="text-sm text-blue-800 mt-1">
              Direct Debit mandates allow automatic collection of rent payments. Tenants must
              authorize mandates through their payment provider (GoCardless or Stripe).
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Mock Mode:</strong> Currently in development mode. Real provider integration
              coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
