"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listInvoices, type Invoice } from '@/lib/financeClient';
import { FileText, Filter } from 'lucide-react';

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: Invoice[], total: number, page: number, limit: number, totalPages: number }>({
    queryKey: ['finance', 'invoices', statusFilter, page],
    queryFn: () => listInvoices({ status: statusFilter || undefined, page, limit: 20 }),
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      ISSUED: 'bg-blue-100 text-blue-800',
      PART_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      VOID: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-gray-600 mt-1">Manage rental invoices and charges</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PART_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="VOID">Void</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading invoices...</div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No invoices found</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Issue Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Paid
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data?.data.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.issueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      £{invoice.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                      £{(invoice.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      £{(invoice.balance || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="border-t bg-gray-50 px-6 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {data.page} of {data.totalPages} ({data.total} total)
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
