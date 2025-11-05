"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Tenancy } from '@/types/models';
import { Button } from '@/components/Button';

export default function TenancyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tenancyId = params?.id;
  const {
    data: tenancy,
    isLoading,
    error,
  } = useQuery<Tenancy>({
    queryKey: ['tenancy', tenancyId],
    queryFn: () => apiRequest<Tenancy>(`/tenancies/${tenancyId}`),
    enabled: typeof tenancyId === 'string',
  });
  if (isLoading) return <p>Loading…</p>;
  if (error || !tenancy) return <p className="text-red-600">Unable to load tenancy</p>;
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => router.back()}>
        ← Back
      </Button>
      <h2 className="text-xl font-semibold">Tenancy</h2>
      <div className="space-y-2">
        <p>
          <strong>Start date:</strong> {new Date(tenancy.startDate).toLocaleDateString()}
        </p>
        <p>
          <strong>End date:</strong> {new Date(tenancy.endDate).toLocaleDateString()}
        </p>
        <p>
          <strong>Rent:</strong> £{tenancy.rent.toFixed(2)}
        </p>
        <p>
          <strong>Deposit scheme:</strong> {tenancy.depositScheme}
        </p>
      </div>
    </div>
  );
}