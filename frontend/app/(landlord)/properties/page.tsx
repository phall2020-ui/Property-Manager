"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Table } from '@/components/Table';
import { Button } from '@/components/Button';

export default function PropertiesPage() {
  const {
    data: properties,
    isLoading,
    error,
  } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => apiRequest<Property[]>('/properties'),
  });
  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-red-600">Error loading properties</p>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Properties</h2>
        <Link href="/" className="">
          <Button variant="primary">Create property</Button>
        </Link>
      </div>
      {properties && properties.length > 0 ? (
        <Table
          data={properties}
          columns={[
            {
              header: 'Address',
              accessor: 'addressLine1',
              render: (property) => (
                <Link
                  href={`/properties/${property.id}`}
                  className="text-primary underline"
                >
                  {property.addressLine1}, {property.city}
                </Link>
              ),
            },
            { header: 'City', accessor: 'city' },
            { header: 'Postcode', accessor: 'postcode' },
          ]}
        />
      ) : (
        <p>No properties yet. Create one above.</p>
      )}
    </div>
  );
}