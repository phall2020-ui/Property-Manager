import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import TableSkeleton from '../../components/skeletons/TableSkeleton';

interface Invoice {
  id: string;
  number: string;
  tenancy: {
    id: string;
    property: {
      address1: string;
    };
  };
  status: string;
  amountGBP: number;
  dueAt: string;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  status: string;
}

interface DashboardMetrics {
  totalRevenue: number;
  outstandingAmount: number;
  overdueAmount: number;
  collectionRate: number;
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['finance', 'dashboard'],
    queryFn: () => financeApi.getDashboard(),
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery<{ data: Invoice[] }>({
    queryKey: ['finance', 'invoices', { limit: 5 }],
    queryFn: () => financeApi.listInvoices(),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery<{ data: Payment[] }>({
    queryKey: ['finance', 'payments', { limit: 5 }],
    queryFn: () => financeApi.listPayments(),
  });

  if (!user || !user.organisations || user.organisations.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>No organisation found for this user. Please contact support.</p>
        </div>
      </div>
    );
  }

  const primaryOrg = user.organisations[0];
  const isLandlord = primaryOrg?.role === 'LANDLORD';

  if (!isLandlord) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>Finance dashboard is only available for landlords.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'VOID':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Finance Dashboard</h2>
        <div className="flex gap-3">
          <Link
            to="/finance/invoices"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            All Invoices
          </Link>
          <Link
            to="/finance/payments"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            All Payments
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TableSkeleton rows={1} columns={1} />
          <TableSkeleton rows={1} columns={1} />
          <TableSkeleton rows={1} columns={1} />
          <TableSkeleton rows={1} columns={1} />
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.totalRevenue || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.outstandingAmount || 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(metrics.overdueAmount || 0)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metrics.collectionRate ? `${(metrics.collectionRate * 100).toFixed(1)}%` : '0%'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Recent Invoices */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
          <Link to="/finance/invoices" className="text-blue-600 hover:text-blue-900 text-sm font-medium">
            View All →
          </Link>
        </div>
        {invoicesLoading ? (
          <div className="p-6">
            <TableSkeleton rows={3} columns={5} />
          </div>
        ) : invoices && invoices.data && invoices.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.data.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/finance/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {invoice.number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.tenancy?.property?.address1 || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.amountGBP)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.dueAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
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
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No invoices found
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
          <Link to="/finance/payments" className="text-blue-600 hover:text-blue-900 text-sm font-medium">
            View All →
          </Link>
        </div>
        {paymentsLoading ? (
          <div className="p-6">
            <TableSkeleton rows={3} columns={4} />
          </div>
        ) : payments && payments.data && payments.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.data.slice(0, 5).map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.paidAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No payments found
          </div>
        )}
      </div>
    </div>
  );
}
