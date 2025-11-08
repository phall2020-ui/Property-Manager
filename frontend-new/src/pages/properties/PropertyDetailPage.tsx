import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { enhancedPropertiesApi, complianceApi, financeApi } from '../../lib/api';
import { fmtGBP, grossYieldPct, annualisedRentGBP } from '../../lib/calculations';
import Header from '../../components/Header';
import MetricCard from '../../components/properties/MetricCard';
import PropertyMiniMap from '../../components/properties/PropertyMiniMap';
import TabBar from '../../components/properties/TabBar';
import ComplianceCard from '../../components/compliance/ComplianceCard';
import EmptyState from '../../components/compliance/EmptyState';
import type { Property } from '../../lib/types';

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

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ['enhanced-properties', id],
    queryFn: () => enhancedPropertiesApi.getById(id!),
    enabled: !!id,
  });

  const { data: complianceItems, isLoading: complianceLoading } = useQuery<ComplianceItem[]>({
    queryKey: ['compliance', 'property', id],
    queryFn: () => complianceApi.getPropertyCompliance(id!),
    enabled: !!id && activeTab === 'compliance',
  });

  const { data: rentSummary, isLoading: rentLoading } = useQuery({
    queryKey: ['finance', 'property', id, 'rent-summary'],
    queryFn: () => financeApi.getPropertyRentSummary(id!),
    enabled: !!id && activeTab === 'finance',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading property: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Property not found
        </div>
      </div>
    );
  }

  const grossYield = grossYieldPct(property.monthlyRent, property.estimatedValue);
  const overdueCount = complianceItems?.filter(item => item.status === 'OVERDUE').length || 0;
  const dueSoonCount = complianceItems?.filter(item => item.status === 'DUE_SOON').length || 0;

  return (
    <div className="space-y-6">
      <Header />
      
      <div>
        <button
          onClick={() => navigate('/properties')}
          className="text-blue-600 hover:text-blue-900 text-sm mb-2 hover:underline"
        >
          ← Back to Properties
        </button>
        <h2 className="text-3xl font-bold text-brand-text">{property.name || property.address.line1}</h2>
        <p className="text-brand-subtle mt-1">
          {property.address.line1}, {property.address.city && `${property.address.city}, `}{property.address.postcode}
        </p>
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

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && (
        <>
          {/* Metrics Section */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard label="Monthly Rent" value={fmtGBP(property.monthlyRent)} />
            <MetricCard label="Annualised Rent" value={fmtGBP(annualisedRentGBP(property.monthlyRent))} />
            <MetricCard
              label="Gross Yield"
              value={grossYield == null ? '—' : `${grossYield.toFixed(2)}%`}
            />
          </section>

          {/* Details & Map Section */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-xl bg-white p-6 shadow-card">
              <div className="mb-4 font-medium text-lg text-brand-text">Key Details</div>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <dt className="text-brand-subtle">Status</dt>
                <dd className="font-medium text-brand-text">{property.status ?? '—'}</dd>
                
                <dt className="text-brand-subtle">Bedrooms</dt>
                <dd className="font-medium text-brand-text">{property.bedrooms ?? '—'}</dd>
                
                <dt className="text-brand-subtle">Bathrooms</dt>
                <dd className="font-medium text-brand-text">{property.bathrooms ?? '—'}</dd>
                
                <dt className="text-brand-subtle">Floor Area</dt>
                <dd className="font-medium text-brand-text">
                  {property.floorAreaM2 ? `${property.floorAreaM2} m²` : '—'}
                </dd>
                
                <dt className="text-brand-subtle">Estimated Value</dt>
                <dd className="font-medium text-brand-text">
                  {property.estimatedValue ? fmtGBP(property.estimatedValue) : '—'}
                </dd>
                
                <dt className="text-brand-subtle">Occupancy Rate</dt>
                <dd className="font-medium text-brand-text">
                  {property.occupancyRate == null ? '—' : `${Math.round(property.occupancyRate * 100)}%`}
                </dd>

                {property.annualInsurance && (
                  <>
                    <dt className="text-brand-subtle">Annual Insurance</dt>
                    <dd className="font-medium text-brand-text">{fmtGBP(property.annualInsurance)}</dd>
                  </>
                )}

                {property.annualServiceCharge && (
                  <>
                    <dt className="text-brand-subtle">Service Charge</dt>
                    <dd className="font-medium text-brand-text">{fmtGBP(property.annualServiceCharge)}</dd>
                  </>
                )}
              </dl>
            </div>
            
            {property.lat && property.lng && (
              <div className="rounded-xl bg-white p-6 shadow-card">
                <div className="mb-4 font-medium text-lg text-brand-text">Location</div>
                <PropertyMiniMap lat={property.lat} lng={property.lng} />
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {complianceLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : complianceItems && complianceItems.length > 0 ? (
            <>
              {(overdueCount > 0 || dueSoonCount > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {complianceItems.map((item) => (
                  <ComplianceCard
                    key={item.id}
                    type={item.type}
                    status={item.status}
                    dueDate={item.dueDate}
                    hasEvidence={item.hasEvidence}
                    onUpload={() => console.log('Upload evidence for:', item.type)}
                    onMarkDone={() => console.log('Mark done:', item.type)}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title="All Up to Date!"
              message="No compliance items are currently set for this property."
            />
          )}
        </div>
      )}

      {activeTab === 'tenancies' && (
        <div className="rounded-xl bg-white p-6 shadow-card">
          <p className="text-brand-subtle">Tenancies tab - Coming soon</p>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="rounded-xl bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          {rentLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : rentSummary ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {fmtGBP(rentSummary.monthlyRent || property?.monthlyRent || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Total Received</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {fmtGBP(rentSummary.totalReceived || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-amber-600 mt-2">
                    {fmtGBP(rentSummary.outstanding || 0)}
                  </p>
                </div>
              </div>

              {rentSummary.lastPaymentDate && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Last payment received:{' '}
                    <span className="font-medium text-gray-900">
                      {new Date(rentSummary.lastPaymentDate).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <Link
                  to={`/finance/invoices?propertyId=${property?.id}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View All Invoices
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-brand-subtle">No financial data available for this property.</p>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="rounded-xl bg-white p-6 shadow-card">
          <div className="space-y-4">
            <p className="text-brand-subtle">Maintenance tickets for this property</p>
            <Link
              to={`/tickets?propertyId=${property.id}`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View All Tickets
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="rounded-xl bg-white p-6 shadow-card">
          <p className="text-brand-subtle">Documents tab - Coming soon</p>
        </div>
      )}
    </div>
  );
}
