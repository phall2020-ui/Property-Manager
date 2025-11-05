import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { complianceApi } from '../../lib/api';
import ComplianceStatusChip from '../../components/compliance/ComplianceStatusChip';
import KPIStatCard from '../../components/compliance/KPIStatCard';
import EmptyState from '../../components/compliance/EmptyState';

interface ComplianceItem {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: string;
  status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'MISSING';
  dueDate: string | null;
  expiryDate: string | null;
  hasEvidence: boolean;
  documentId?: string;
}

interface ComplianceStats {
  overdue: number;
  dueSoon: number;
  ok: number;
  missing: number;
  total: number;
}

export default function ComplianceCentrePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: stats, isLoading: statsLoading } = useQuery<ComplianceStats>({
    queryKey: ['compliance', 'stats'],
    queryFn: complianceApi.getComplianceStats,
  });

  const { data: items, isLoading: itemsLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['compliance', 'portfolio'],
    queryFn: complianceApi.getPortfolioCompliance,
  });

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB');
  };

  // Filter items
  const filteredItems = items?.filter((item) => {
    const matchesSearch = item.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  // Get unique types for filter
  const uniqueTypes = Array.from(new Set(items?.map(item => item.type) || []));

  if (statsLoading || itemsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">🛡️</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Centre</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all regulatory compliance across your portfolio
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPIStatCard
            label="Overdue"
            count={stats.overdue}
            color="red"
            onClick={() => setStatusFilter('OVERDUE')}
          />
          <KPIStatCard
            label="Due Soon"
            count={stats.dueSoon}
            color="amber"
            onClick={() => setStatusFilter('DUE_SOON')}
          />
          <KPIStatCard
            label="OK"
            count={stats.ok}
            color="green"
            onClick={() => setStatusFilter('OK')}
          />
          <KPIStatCard
            label="Missing"
            count={stats.missing}
            color="gray"
            onClick={() => setStatusFilter('MISSING')}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by address or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="OK">OK</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="OVERDUE">Overdue</option>
            <option value="MISSING">Missing</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {(statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Compliance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? (
                      <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">No compliance items found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    ) : (
                      <EmptyState />
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/properties/${item.propertyId}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {item.propertyAddress}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ComplianceStatusChip status={item.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {item.hasEvidence ? (
                        <span className="text-green-600">✓ Uploaded</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/properties/${item.propertyId}#compliance`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      {filteredItems.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredItems.length} of {items?.length || 0} compliance items
        </div>
      )}
    </div>
  );
}
