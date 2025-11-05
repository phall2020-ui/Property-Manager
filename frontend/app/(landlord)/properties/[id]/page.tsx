"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Button } from '@/components/Button';
import Link from 'next/link';

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
  if (isLoading) return <p>Loading…</p>;
  if (error || !property) return <p className="text-red-600">Unable to load property</p>;
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">{property.addressLine1}</h2>
      <div className="space-y-2">
        <p>
          <strong>Address line 1:</strong> {property.addressLine1}
        </p>
        {property.addressLine2 && (
          <p>
            <strong>Address line 2:</strong> {property.addressLine2}
          </p>
        )}
        <p>
          <strong>City:</strong> {property.city}
        </p>
        <p>
          <strong>Postcode:</strong> {property.postcode}
        </p>
      </div>
      <div>
        <Link href={`/tenancies/${property.id}`} className="text-primary underline">
          View tenancy
        </Link>
      </div>
    </div>
  );
}