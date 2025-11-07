"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { SearchInput } from '@/components/SearchInput';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { AddPropertyModal } from '@/components/AddPropertyModal';
import { getPropertyAddress1, getPropertyAddress2 } from '@/lib/propertyHelpers';
import { useDebounce } from '@/hooks/useDebounce';
import { CreatePropertyDTO } from '@/lib/schemas';

/**
 * Properties Portfolio List Page
 * Shows all properties owned by the landlord with stats and filters
 */
export default function PropertiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchTerm, debouncedSearchTerm, setSearchTerm } = useDebounce('', 300);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    data: properties,
    isLoading,
    error,
  } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => apiRequest<Property[]>('/properties'),
  });

  // Add property mutation with optimistic updates
  const addPropertyMutation = useMutation({
    mutationFn: async (data: CreatePropertyDTO) => {
      return apiRequest('/properties', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onMutate: async (newProperty) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['properties'] });

      // Snapshot the previous value
      const previousProperties = queryClient.getQueryData(['properties']);

      // Generate a unique temporary ID using crypto API if available, fallback to timestamp + random
      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? `temp-${crypto.randomUUID()}`
        : `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Optimistically update to the new value
      queryClient.setQueryData(['properties'], (old: Property[] | undefined) => [
        ...(old || []),
        {
          id: tempId,
          ...newProperty,
          addressLine1: newProperty.address1,
          addressLine2: newProperty.address2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Property,
      ]);

      // Return a context object with the snapshotted value
      return { previousProperties };
    },
    onError: (_err, _newProperty, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProperties) {
        queryClient.setQueryData(['properties'], context.previousProperties);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsAddModalOpen(false);
    },
  });

  // Filter properties by debounced search query
  const filteredProperties = properties?.filter((property) => {
    if (!debouncedSearchTerm) return true;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return (
      property.addressLine1?.toLowerCase().includes(searchLower) ||
      property.city?.toLowerCase().includes(searchLower) ||
      property.postcode?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-6 w-3/4 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
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
            You haven&apos;t added any properties yet. Let&apos;s get started by adding your first property.
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
          onClick={() => setIsAddModalOpen(true)}
        >
          + Add Property
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by address, city, or postcode..."
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

      {filteredProperties?.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No properties match your search &quot;{searchTerm}&quot;
          </p>
        </div>
      )}

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={(data) => addPropertyMutation.mutate(data)}
        isSubmitting={addPropertyMutation.isPending}
      />
    </div>
  );
}