'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getTenantInvoice, getTenantReceipt } from '@/lib/financeClient';

export default function TenantInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['tenant-invoice', invoiceId],
    queryFn: () => getTenantInvoice(invoiceId),
  });

  const handleDownloadReceipt = async () => {
    try {
      const receipt = await getTenantReceipt(invoiceId);
      // Simple HTML receipt - in production would generate PDF
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${receipt.invoice.reference}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin: 20px 0; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .table th { background-color: #f2f2f2; }
              .total { font-weight: bold; font-size: 1.2em; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Payment Receipt</h1>
              <p>Invoice: ${receipt.invoice.reference}</p>
            </div>
            <div class="details">
              <p><strong>Property:</strong> ${receipt.property.address}</p>
              <p><strong>Period:</strong> ${new Date(receipt.invoice.periodStart).toLocaleDateString('en-GB')} - ${new Date(receipt.invoice.periodEnd).toLocaleDateString('en-GB')}</p>
              <p><strong>Invoice Amount:</strong> £${receipt.invoice.amount.toFixed(2)}</p>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.payments.map((p: any) => `
                  <tr>
                    <td>${new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                    <td>£${p.amount.toFixed(2)}</td>
                    <td>${p.method}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              <p>Total Paid: £${receipt.paidAmount.toFixed(2)}</p>
              <p>Balance: £${receipt.balance.toFixed(2)}</p>
            </div>
          </body>
        </html>
      `;
      
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receipt.invoice.reference}.html`;
      a.click();
    } catch (error) {
      console.error('Failed to download receipt:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Payments
        </button>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Payments
        </button>
        <div>Invoice not found</div>
      </div>
    );
  }

  const amount = invoice.amountGBP || invoice.amount || 0;

  return (
    <div className="p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:text-blue-800"
      >
        ← Back to Payments
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">{invoice.reference}</h1>
            <div className="text-gray-600">
              {new Date(invoice.periodStart).toLocaleDateString('en-GB')} -{' '}
              {new Date(invoice.periodEnd).toLocaleDateString('en-GB')}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded text-sm ${
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold mb-2">Property</h3>
            <div className="text-gray-600">
              {invoice.tenancy?.property?.addressLine1}
              <br />
              {invoice.tenancy?.property?.city}, {invoice.tenancy?.property?.postcode}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Due Date</h3>
            <div className="text-gray-600">
              {new Date(invoice.dueAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between text-lg mb-2">
            <span>Invoice Amount:</span>
            <span className="font-semibold">£{amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg mb-2">
            <span>Amount Paid:</span>
            <span className="font-semibold text-green-600">
              £{invoice.paidAmount?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-xl font-bold border-t pt-2">
            <span>Balance Due:</span>
            <span className={invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
              £{invoice.balance?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Payment History</h2>
          {invoice.paidAmount > 0 && (
            <button
              onClick={handleDownloadReceipt}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Download Receipt
            </button>
          )}
        </div>
        {invoice.allocations && invoice.allocations.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.allocations.map((alloc: any) => (
                <tr key={alloc.id}>
                  <td className="px-4 py-3 text-sm">
                    {new Date(alloc.payment.paidAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    £{alloc.amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm">{alloc.payment.method}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {alloc.payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-gray-500 py-6">No payments recorded yet</div>
        )}
      </div>

      {/* How to Pay */}
      {invoice.balance > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-semibold mb-3">How to Pay</h2>
          <p className="text-sm text-gray-700 mb-3">
            Pay by bank transfer using the following details:
          </p>
          <div className="bg-white p-4 rounded space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Account Name:</span>
              <span>Acme Properties Ltd</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Sort Code:</span>
              <span>12-34-56</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Account Number:</span>
              <span>12345678</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Reference:</span>
              <span className="font-mono bg-yellow-100 px-2 py-1 rounded">
                {invoice.reference}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Amount:</span>
              <span className="font-bold">£{invoice.balance?.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Important: Please use the reference above so we can match your payment.
          </p>
        </div>
      )}
    </div>
  );
}
