"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdatePropertySchema, UpdatePropertyDTO } from '@/lib/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Property } from '@/types/models';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

export default function EditPropertyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const propertyId = params?.id;

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch current property data
  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: ['property', propertyId],
    queryFn: () => apiRequest<Property>(`/properties/${propertyId}`),
    enabled: typeof propertyId === 'string',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdatePropertyDTO>({
    resolver: zodResolver(UpdatePropertySchema),
    values: property ? {
      addressLine1: property.addressLine1 || property.address1,
      address2: property.address2,
      city: property.city,
      postcode: property.postcode,
      bedrooms: property.bedrooms,
      attributes: {
        propertyType: property.propertyType as 'House' | 'Flat' | 'HMO' | 'Maisonette' | 'Bungalow' | 'Other' | undefined,
        furnished: property.furnished as 'Unfurnished' | 'Part' | 'Full' | undefined,
        epcRating: property.epcRating as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Unknown' | undefined,
      },
    } : undefined,
  });

  const mutation = useMutation<Property, any, UpdatePropertyDTO>({
    mutationFn: async (data: UpdatePropertyDTO) => {
      return apiRequest<Property>(`/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (updatedProperty) => {
      setSuccessMessage('Property updated successfully!');
      setGeneralError(null);

      // Invalidate queries to refresh property data
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err: any) => {
      setGeneralError(err.detail || err.title || 'Failed to update property');
      setSuccessMessage(null);
    },
  });

  // Navigate back after success message is shown
  React.useEffect(() => {
    if (successMessage && !mutation.isPending) {
      const timer = setTimeout(() => {
        router.push(`/properties/${propertyId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [successMessage, mutation.isPending, propertyId, router]);

  const onSubmit = (data: UpdatePropertyDTO) => {
    setGeneralError(null);
    setSuccessMessage(null);
    mutation.mutate(data);
  };

  if (isLoadingProperty) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading property...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-6">
        <p className="text-red-600">Property not found</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Property</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {generalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {generalError}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
          {successMessage}
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Address Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Address</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="addressLine1" className="block text-sm font-medium mb-1">
                  Address Line 1
                </label>
                <input
                  id="addressLine1"
                  type="text"
                  {...register('addressLine1')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.addressLine1 && (
                  <p className="text-xs text-red-600 mt-1">{errors.addressLine1.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address2" className="block text-sm font-medium mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  id="address2"
                  type="text"
                  {...register('address2')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-1">
                    City
                  </label>
                  <input
                    id="city"
                    type="text"
                    {...register('city')}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.city && (
                    <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="postcode" className="block text-sm font-medium mb-1">
                    Postcode
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    {...register('postcode')}
                    placeholder="SW1A 1AA"
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.postcode && (
                    <p className="text-xs text-red-600 mt-1">{errors.postcode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium mb-1">
                  Bedrooms
                </label>
                <input
                  id="bedrooms"
                  type="number"
                  min="0"
                  {...register('bedrooms')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.bedrooms && (
                  <p className="text-xs text-red-600 mt-1">{errors.bedrooms.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="propertyType" className="block text-sm font-medium mb-1">
                  Property Type
                </label>
                <select
                  id="propertyType"
                  {...register('attributes.propertyType')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select type</option>
                  <option value="House">House</option>
                  <option value="Flat">Flat</option>
                  <option value="HMO">HMO</option>
                  <option value="Maisonette">Maisonette</option>
                  <option value="Bungalow">Bungalow</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="furnished" className="block text-sm font-medium mb-1">
                  Furnished
                </label>
                <select
                  id="furnished"
                  {...register('attributes.furnished')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Unfurnished">Unfurnished</option>
                  <option value="Part">Part Furnished</option>
                  <option value="Full">Fully Furnished</option>
                </select>
              </div>

              <div>
                <label htmlFor="epcRating" className="block text-sm font-medium mb-1">
                  EPC Rating
                </label>
                <select
                  id="epcRating"
                  {...register('attributes.epcRating')}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select rating</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="E">E</option>
                  <option value="F">F</option>
                  <option value="G">G</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button
              type="submit"
              variant="primary"
              disabled={mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
