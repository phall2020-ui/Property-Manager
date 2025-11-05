"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getArrears } from '@/_lib/financeClient';
import { AlertCircle } from 'lucide-react';

export default function ArrearsPage() {
  const [bucket, setBucket] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'arrears', bucket],
    queryFn: () => getArrears(bucket || undefined),
  });

  const buckets = [
    { value: '', label: 'All' },
    { value: '0-30', label: '0-30 days' },
    { value: '31-60', label: '31-60 days' },
    { value: '61-90', label: '61-90 days' },
    { value: '90+', label: '90+ days' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Arrears & Collections</h1>
        <p className="text-gray-600 mt-1">Manage overdue rent and late payments</p>
      </div>

      {/* Bucket Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {buckets.map((b) => (
            <button
              key={b.value}
              onClick={() => setBucket(b.value)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                bucket === b.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {b.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Arrears List */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading arrears...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No arrears found</p>
            <p className="text-sm text-gray-500 mt-1">All tenancies are up to date</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Oldest Due Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Arrears Amount
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Age Bucket
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item.tenancyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {item.propertyAddress}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.tenantName}</div>
                    {item.tenantEmail && (
                      <div className="text-xs text-gray-500">{item.tenantEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.oldestInvoiceDueDate
                      ? new Date(item.oldestInvoiceDueDate).toLocaleDateString('en-GB')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                    £{item.arrearsAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        item.daysBucket === '0-30'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.daysBucket === '31-60'
                          ? 'bg-orange-100 text-orange-800'
                          : item.daysBucket === '61-90'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-red-200 text-red-900'
                      }`}
                    >
                      {item.daysBucket} days
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">
                      Send Reminder
                    </button>
                    <button className="text-blue-600 hover:text-blue-800">View Account</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      {data && data.length > 0 && (
        <div className="rounded-lg border bg-yellow-50 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium text-yellow-900">
                Total Arrears: £
                {data.reduce((sum, item) => sum + item.arrearsAmount, 0).toFixed(2)}
              </p>
              <p className="text-sm text-yellow-800">
                Across {data.length} tenancies with overdue payments
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
