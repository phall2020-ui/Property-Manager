"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { getPropertyAddress1, getPropertyAddress2 } from '@/lib/propertyHelpers';

/**
 * Properties Portfolio List Page
 * Shows all properties owned by the landlord with stats and filters
 */
export default function PropertiesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: properties,
    isLoading,
    error,
  } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => apiRequest<Property[]>('/properties'),
  });

  // Filter properties by search query
  const filteredProperties = properties?.filter((property) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      property.addressLine1?.toLowerCase().includes(searchLower) ||
      property.city?.toLowerCase().includes(searchLower) ||
      property.postcode?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading properties…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Error loading properties</p>
      </div>
    );
  }

  // If no properties, show onboarding prompt
  if (!properties || properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to Your Property Portfolio
          </h2>
          <p className="text-gray-600 mb-6">
            You haven't added any properties yet. Let's get started by adding your first property.
          </p>
          <Button
            variant="primary"
            onClick={() => router.push('/onboarding')}
          >
            Add Your First Property
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Properties</h1>
          <p className="text-gray-600 mt-1">{properties.length} properties</p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/onboarding')}
        >
          + Add Property
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search by address, city, or postcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProperties?.map((property) => (
          <Card
            key={property.id}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(`/properties/${property.id}`)}
          >
            <div className="space-y-3">
              {/* Address */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {getPropertyAddress1(property)}
                </h3>
                {getPropertyAddress2(property) && (
                  <p className="text-sm text-gray-600">{getPropertyAddress2(property)}</p>
                )}
                <p className="text-sm text-gray-600">
                  {property.city}, {property.postcode}
                </p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge color="success">Active</Badge>
                {/* TODO: Add dynamic badges based on tenancy/compliance status */}
              </div>

              {/* Stats placeholder */}
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Rent:</span>
                    <span className="ml-1 font-medium">-</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Tickets:</span>
                    <span className="ml-1 font-medium">-</span>
                  </div>
                </div>
              </div>

              {/* View link */}
              <Link
                href={`/properties/${property.id}`}
                className="block text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                View details →
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {filteredProperties?.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No properties match your search "{searchQuery}"
          </p>
        </div>
      )}
    </div>
  );
}