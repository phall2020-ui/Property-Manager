'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  getPropertyRentSummary,
  createInvoice,
  recordPayment,
  exportRentRoll,
  exportPayments,
} from '@/lib/financeClient';

export default function PropertyRentPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const queryClient = useQueryClient();

  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Fetch property rent summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ['rent:summary', { propertyId }],
    queryFn: () => getPropertyRentSummary(propertyId),
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent:summary', { propertyId }] });
      setShowCreateInvoice(false);
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent:summary', { propertyId }] });
      setShowRecordPayment(false);
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Rent Management</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rent Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateInvoice(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Invoice
          </button>
          <button
            onClick={async () => {
              const data = await exportRentRoll();
              // Download CSV
              const blob = new Blob([data.content], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = data.filename;
              a.click();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Export Rent Roll
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Next Due</div>
          <div className="text-2xl font-bold">
            {summary?.nextDueAt
              ? new Date(summary.nextDueAt).toLocaleDateString('en-GB')
              : 'N/A'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Arrears</div>
          <div className="text-2xl font-bold text-red-600">
            £{summary?.arrearsAmount?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Collected This Month</div>
          <div className="text-2xl font-bold text-green-600">
            £{summary?.collectedThisMonth?.toFixed(2) || '0.00'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Collection Rate</div>
          <div className="text-2xl font-bold">
            {summary?.collectionRate?.toFixed(1) || '0'}%
          </div>
          <div className="text-xs text-gray-500">
            £{summary?.collectedThisMonth?.toFixed(2) || '0.00'} / £
            {summary?.expectedThisMonth?.toFixed(2) || '0.00'}
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Balance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary?.invoices?.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{invoice.reference}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(invoice.periodStart).toLocaleDateString('en-GB')} -{' '}
                    {new Date(invoice.periodEnd).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(invoice.dueAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-sm">£{invoice.amount?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">£{invoice.paidAmount?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    £{invoice.balance?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
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
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {invoice.balance > 0 && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setShowRecordPayment(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Record Payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Ledger */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Payments</h2>
          <button
            onClick={async () => {
              const data = await exportPayments();
              const blob = new Blob([data.content], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = data.filename;
              a.click();
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {summary?.payments?.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {new Date(payment.paidAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-sm">{payment.invoiceReference}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    £{payment.amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">{payment.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateInvoice && (
        <CreateInvoiceModal
          propertyId={propertyId}
          onClose={() => setShowCreateInvoice(false)}
          onSubmit={(data) => createInvoiceMutation.mutate(data)}
        />
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowRecordPayment(false);
            setSelectedInvoice(null);
          }}
          onSubmit={(data) => recordPaymentMutation.mutate(data)}
        />
      )}
    </div>
  );
}

// Create Invoice Modal Component
function CreateInvoiceModal({
  propertyId,
  onClose,
  onSubmit,
}: {
  propertyId: string;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    tenancyId: '',
    periodStart: '',
    periodEnd: '',
    dueAt: '',
    amountGBP: '',
    reference: '',
    notes: '',
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Create Invoice</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              ...formData,
              amountGBP: parseFloat(formData.amountGBP),
            });
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="tenancy-id" className="block text-sm font-medium mb-1">Tenancy ID</label>
              <input
                id="tenancy-id"
                type="text"
                value={formData.tenancyId}
                onChange={(e) => setFormData({ ...formData, tenancyId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="period-start" className="block text-sm font-medium mb-1">Period Start</label>
              <input
                id="period-start"
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="period-end" className="block text-sm font-medium mb-1">Period End</label>
              <input
                id="period-end"
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="due-date" className="block text-sm font-medium mb-1">Due Date</label>
              <input
                id="due-date"
                type="date"
                value={formData.dueAt}
                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="amount-gbp" className="block text-sm font-medium mb-1">Amount (£)</label>
              <input
                id="amount-gbp"
                type="number"
                step="0.01"
                value={formData.amountGBP}
                onChange={(e) => setFormData({ ...formData, amountGBP: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="reference" className="block text-sm font-medium mb-1">Reference (optional)</label>
              <input
                id="reference"
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., 2025-01 Rent"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Record Payment Modal Component
function RecordPaymentModal({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    amountGBP: invoice.balance?.toString() || '',
    paidAt: new Date().toISOString().split('T')[0],
    method: 'BANK_TRANSFER',
    providerRef: `manual_${Date.now()}`,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Record Payment</h2>
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="text-sm text-gray-600">Invoice: {invoice.reference}</div>
          <div className="text-sm text-gray-600">
            Balance Due: £{invoice.balance?.toFixed(2)}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              invoiceId: invoice.id,
              ...formData,
              amountGBP: parseFloat(formData.amountGBP),
            });
          }}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="payment-amount" className="block text-sm font-medium mb-1">Amount (£)</label>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                value={formData.amountGBP}
                onChange={(e) => setFormData({ ...formData, amountGBP: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="payment-date" className="block text-sm font-medium mb-1">Payment Date</label>
              <input
                id="payment-date"
                type="date"
                value={formData.paidAt}
                onChange={(e) => setFormData({ ...formData, paidAt: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="payment-method" className="block text-sm font-medium mb-1">Method</label>
              <select
                id="payment-method"
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="DD">Direct Debit</option>
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
