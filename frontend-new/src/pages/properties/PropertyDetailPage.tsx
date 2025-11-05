import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { propertiesApi, complianceApi } from '../../lib/api';
import ComplianceCard from '../../components/compliance/ComplianceCard';
import EmptyState from '../../components/compliance/EmptyState';

interface Property {
  id: string;
  address1: string;
  address2?: string;
  city?: string;
  postcode?: string;
  bedrooms?: number;
  createdAt: string;
  updatedAt: string;
}

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

type TabType = 'details' | 'compliance' | 'actions';

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ['properties', id],
    queryFn: () => propertiesApi.getById(id!),
    enabled: !!id,
  });

  const { data: complianceItems, isLoading: complianceLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['compliance', 'property', id],
    queryFn: () => complianceApi.getPropertyCompliance(id!),
    enabled: !!id && activeTab === 'compliance',
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading property: {(error as Error).message}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        Property not found
      </div>
    );
  }

  const overdueCount = complianceItems?.filter(item => item.status === 'OVERDUE').length || 0;
  const dueSoonCount = complianceItems?.filter(item => item.status === 'DUE_SOON').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/properties')}
            className="text-blue-600 hover:text-blue-900 text-sm mb-2"
          >
            ← Back to Properties
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            {property.address1}
            {property.city && `, ${property.city}`}
          </h2>
          {(overdueCount > 0 || dueSoonCount > 0) && (
            <div className="mt-2 flex gap-2">
              {overdueCount > 0 && (
                <span className="text-sm font-medium text-red-600">
                  {overdueCount} overdue
                </span>
              )}
              {dueSoonCount > 0 && (
                <span className="text-sm font-medium text-amber-600">
                  {dueSoonCount} due soon
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`${
              activeTab === 'compliance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
          >
            Compliance
            {(overdueCount > 0 || dueSoonCount > 0) && (
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {overdueCount + dueSoonCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`${
              activeTab === 'actions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Quick Actions
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Address Line 1</label>
              <p className="mt-1 text-sm text-gray-900">{property.address1}</p>
            </div>

            {property.address2 && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Address Line 2</label>
                <p className="mt-1 text-sm text-gray-900">{property.address2}</p>
              </div>
            )}

            {property.city && (
              <div>
                <label className="block text-sm font-medium text-gray-500">City</label>
                <p className="mt-1 text-sm text-gray-900">{property.city}</p>
              </div>
            )}

            {property.postcode && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Postcode</label>
                <p className="mt-1 text-sm text-gray-900">{property.postcode}</p>
              </div>
            )}

            {property.bedrooms != null && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Bedrooms</label>
                <p className="mt-1 text-sm text-gray-900">{property.bedrooms}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {complianceLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : complianceItems && complianceItems.length > 0 ? (
            <>
              {/* Summary Banner */}
              {(overdueCount > 0 || dueSoonCount > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div>
                      <h3 className="text-amber-900 font-semibold">Attention Required</h3>
                      <p className="text-amber-800 text-sm mt-1">
                        {overdueCount > 0 && `${overdueCount} overdue item${overdueCount > 1 ? 's' : ''}`}
                        {overdueCount > 0 && dueSoonCount > 0 && ' and '}
                        {dueSoonCount > 0 && `${dueSoonCount} due soon`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {complianceItems.map((item) => (
                  <ComplianceCard
                    key={item.id}
                    type={item.type}
                    status={item.status}
                    dueDate={item.dueDate}
                    hasEvidence={item.hasEvidence}
                    onUpload={() => {
                      // TODO: Implement upload modal
                      console.log('Upload evidence for:', item.type);
                    }}
                    onMarkDone={() => {
                      // TODO: Implement mark done functionality
                      console.log('Mark done:', item.type);
                    }}
                  />
                ))}
              </div>

              {/* Next Due Soon List */}
              {dueSoonCount > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Coming Up</h3>
                  <ul className="space-y-2">
                    {complianceItems
                      .filter(item => item.status === 'DUE_SOON')
                      .map(item => (
                        <li key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{item.type}</span>
                          <span className="text-gray-600">
                            {item.dueDate && new Date(item.dueDate).toLocaleDateString('en-GB')}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="All Up to Date!"
              message="No compliance items are currently set for this property."
            />
          )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to={`/tenancies?propertyId=${property.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
              >
                <h4 className="font-medium text-gray-900">View Tenancies</h4>
                <p className="text-sm text-gray-600 mt-1">Manage tenancy agreements</p>
              </Link>

              <Link
                to={`/tickets?propertyId=${property.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
              >
                <h4 className="font-medium text-gray-900">View Tickets</h4>
                <p className="text-sm text-gray-600 mt-1">Maintenance requests</p>
              </Link>

              <Link
                to={`/tenancies/new?propertyId=${property.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
              >
                <h4 className="font-medium text-gray-900">Create Tenancy</h4>
                <p className="text-sm text-gray-600 mt-1">Add new tenant</p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
