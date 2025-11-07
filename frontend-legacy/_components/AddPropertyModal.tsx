'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { CreatePropertySchema, CreatePropertyDTO } from '@/lib/schemas';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePropertyDTO) => void;
  isSubmitting?: boolean;
}

/**
 * Modal for landlords to add a new property.
 * Features:
 * - Full address input with UK postcode validation
 * - Property type and attributes
 * - Bedroom count
 * - EPC rating
 * - Furnished status
 * - Form validation with Zod
 */
export function AddPropertyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddPropertyModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePropertyDTO>({
    resolver: zodResolver(CreatePropertySchema),
  });

  const handleFormSubmit = (data: CreatePropertyDTO) => {
    onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Property" maxWidth="lg">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Address Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Property Address</h3>
          
          <div>
            <Input
              label="Address Line 1"
              placeholder="123 High Street"
              error={errors.address1?.message}
              {...register('address1')}
            />
          </div>

          <div>
            <Input
              label="Address Line 2 (Optional)"
              placeholder="Flat 2B"
              error={errors.address2?.message}
              {...register('address2')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="City"
                placeholder="London"
                error={errors.city?.message}
                {...register('city')}
              />
            </div>

            <div>
              <Input
                label="Postcode"
                placeholder="SW1A 1AA"
                error={errors.postcode?.message}
                {...register('postcode')}
              />
            </div>
          </div>
        </div>

        {/* Property Details Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Property Details</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                label="Property Type"
                error={errors.propertyType?.message}
                options={[
                  { value: '', label: 'Select type...' },
                  { value: 'House', label: 'House' },
                  { value: 'Flat', label: 'Flat' },
                  { value: 'HMO', label: 'HMO' },
                  { value: 'Maisonette', label: 'Maisonette' },
                  { value: 'Bungalow', label: 'Bungalow' },
                  { value: 'Other', label: 'Other' },
                ]}
                {...register('propertyType')}
              />
            </div>

            <div>
              <Input
                label="Bedrooms"
                type="number"
                min="0"
                placeholder="0"
                error={errors.bedrooms?.message}
                {...register('bedrooms', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Select
                label="Furnished"
                error={errors.furnished?.message}
                options={[
                  { value: '', label: 'Select status...' },
                  { value: 'Unfurnished', label: 'Unfurnished' },
                  { value: 'Part', label: 'Part Furnished' },
                  { value: 'Full', label: 'Fully Furnished' },
                ]}
                {...register('furnished')}
              />
            </div>

            <div>
              <Select
                label="EPC Rating"
                error={errors.epcRating?.message}
                options={[
                  { value: '', label: 'Select rating...' },
                  { value: 'A', label: 'A' },
                  { value: 'B', label: 'B' },
                  { value: 'C', label: 'C' },
                  { value: 'D', label: 'D' },
                  { value: 'E', label: 'E' },
                  { value: 'F', label: 'F' },
                  { value: 'G', label: 'G' },
                  { value: 'Unknown', label: 'Unknown' },
                ]}
                {...register('epcRating')}
              />
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            You can add more details like tenancy information, compliance documents, and financial 
            details after creating the property.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding Property...' : 'Add Property'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
