'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { listTenantInvoices } from '@/_lib/financeClient';

export default function TenantPaymentsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-invoices', { status: statusFilter }],
    queryFn: () => listTenantInvoices({ status: statusFilter || undefined }),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Payments</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const invoices = data?.data || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Payments</h1>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filter by Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All</option>
          <option value="DUE">Due</option>
          <option value="PART_PAID">Part Paid</option>
          <option value="PAID">Paid</option>
          <option value="LATE">Late</option>
        </select>
      </div>

      {/* Payment Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">How to Pay</h2>
        <p className="text-sm text-gray-700 mb-2">
          You can pay your rent by bank transfer using the following details:
        </p>
        <div className="bg-white p-3 rounded text-sm space-y-1">
          <div>
            <span className="font-medium">Account Name:</span> Acme Properties Ltd
          </div>
          <div>
            <span className="font-medium">Sort Code:</span> 12-34-56
          </div>
          <div>
            <span className="font-medium">Account Number:</span> 12345678
          </div>
          <div>
            <span className="font-medium">Reference:</span> Use your invoice reference (e.g.,
            2025-01 Rent)
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Direct Debit setup coming soon!
        </p>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Invoices</h2>
        </div>
        <div className="divide-y">
          {invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices found</div>
          ) : (
            invoices.map((invoice: any) => (
              <div
                key={invoice.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/payments/${invoice.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{invoice.reference}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(invoice.periodStart).toLocaleDateString('en-GB')} -{' '}
                      {new Date(invoice.periodEnd).toLocaleDateString('en-GB')}
                    </div>
                    <div className="text-sm text-gray-600">
                      Property: {invoice.tenancy?.property?.addressLine1}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      £{invoice.balance?.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Due: {new Date(invoice.dueAt).toLocaleDateString('en-GB')}
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                        invoice.status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'LATE'
                          ? 'bg-red-100 text-red-800'
                          : invoice.status === 'PART_PAID'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
                {invoice.paidAmount > 0 && (
                  <div className="text-sm text-gray-600">
                    Paid: £{invoice.paidAmount?.toFixed(2)} of £
                    {(invoice.amountGBP || invoice.amount)?.toFixed(2)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Due</div>
          <div className="text-2xl font-bold">
            £
            {invoices
              .filter((inv: any) => ['DUE', 'PART_PAID', 'LATE'].includes(inv.status))
              .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0)
              .toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="text-2xl font-bold text-red-600">
            £
            {invoices
              .filter((inv: any) => inv.status === 'LATE')
              .reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0)
              .toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Paid This Year</div>
          <div className="text-2xl font-bold text-green-600">
            £
            {invoices
              .filter((inv: any) => inv.status === 'PAID')
              .reduce((sum: number, inv: any) => sum + (inv.amountGBP || inv.amount || 0), 0)
              .toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
