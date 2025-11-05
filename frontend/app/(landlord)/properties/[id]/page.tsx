"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Tabs, Tab } from '@/components/Tabs';

/**
 * Property Detail Page with Tabbed Interface
 * Shows comprehensive property information across multiple tabs
 */
export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const propertyId = params?.id;

  const {
    data: property,
    isLoading,
    error,
  } = useQuery<Property | null>({
    queryKey: ['property', propertyId],
    queryFn: () => apiRequest<Property>(`/properties/${propertyId}`),
    enabled: typeof propertyId === 'string',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading property…</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6">
        <p className="text-red-600">Unable to load property</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          ← Back to Properties
        </Button>
      </div>
    );
  }

  const tabs: Tab[] = [
    {
      id: 'overview',
      label: 'Overview',
      content: <OverviewTab property={property} />,
    },
    {
      id: 'tenancy',
      label: 'Tenancy',
      content: <TenancyTab property={property} />,
    },
    {
      id: 'compliance',
      label: 'Compliance',
      badge: 0, // TODO: Add count of overdue items
      content: <ComplianceTab property={property} />,
    },
    {
      id: 'documents',
      label: 'Documents',
      content: <DocumentsTab property={property} />,
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      content: <MaintenanceTab property={property} />,
    },
    {
      id: 'contacts',
      label: 'Contacts',
      content: <ContactsTab property={property} />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back to Properties
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            {property.address1 || property.addressLine1}
          </h1>
          {(property.address2 || property.addressLine2) && (
            <p className="text-gray-600">{property.address2 || property.addressLine2}</p>
          )}
          <p className="text-gray-600">
            {property.city}, {property.postcode}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge color="success">Active</Badge>
            {/* TODO: Add dynamic badges */}
          </div>
        </div>

        <Button variant="primary" onClick={() => alert('Edit property (TODO)')}>
          Edit Property
        </Button>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Next Rent Due</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">-</div>
          <div className="text-xs text-gray-500 mt-1">No active tenancy</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Open Tickets</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">0</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Compliance</div>
          <div className="text-2xl font-bold text-green-600 mt-1">OK</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Documents</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">0</div>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Card className="p-6">
        <Tabs tabs={tabs} />
      </Card>
    </div>
  );
}

// Tab Components
function OverviewTab({ property }: { property: Property }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Property Details</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Address</dt>
            <dd className="text-sm font-medium text-gray-900">
              {property.address1 || property.addressLine1}
              {(property.address2 || property.addressLine2) && <>, {property.address2 || property.addressLine2}</>}
              <br />
              {property.city}, {property.postcode}
            </dd>
          </div>
          {/* Bedrooms will be available after schema update */}
        </dl>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost">Add Tenancy</Button>
          <Button variant="ghost">Upload Document</Button>
          <Button variant="ghost">Create Ticket</Button>
        </div>
      </div>
    </div>
  );
}

function TenancyTab({ property }: { property: Property }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Current Tenancy</h3>
        <Button variant="primary">Add Tenancy</Button>
      </div>
      <Card className="p-4 bg-gray-50">
        <p className="text-gray-600">No active tenancy for this property.</p>
        <p className="text-sm text-gray-500 mt-2">
          Add a tenancy to track rent, tenants, and legal requirements.
        </p>
      </Card>
    </div>
  );
}

function ComplianceTab({ property }: { property: Property }) {
  const complianceItems = [
    { name: 'Gas Safety Certificate', status: 'Missing', dueDate: null },
    { name: 'EICR', status: 'Missing', dueDate: null },
    { name: 'EPC', status: 'Missing', dueDate: null },
    { name: 'Smoke Alarms', status: 'Not Checked', dueDate: null },
    { name: 'CO Alarms', status: 'Not Checked', dueDate: null },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compliance Tracker</h3>
        <Button variant="primary">Upload Certificate</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Item
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {complianceItems.map((item) => (
              <tr key={item.name}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Badge color="default">{item.status}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.dueDate || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-800">
                    Upload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab({ property }: { property: Property }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Button variant="primary">Upload Document</Button>
      </div>
      <Card className="p-4 bg-gray-50">
        <p className="text-gray-600">No documents uploaded yet.</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload certificates, agreements, and other property documents.
        </p>
      </Card>
    </div>
  );
}

function MaintenanceTab({ property }: { property: Property }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Maintenance Tickets</h3>
        <Button variant="primary">Create Ticket</Button>
      </div>
      <Card className="p-4 bg-gray-50">
        <p className="text-gray-600">No maintenance tickets.</p>
      </Card>
    </div>
  );
}

function ContactsTab({ property }: { property: Property }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Landlord</h3>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Your contact information</p>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Tenants</h3>
        <Card className="p-4 bg-gray-50">
          <p className="text-gray-600">No tenants assigned to this property.</p>
        </Card>
      </div>
    </div>
  );
}