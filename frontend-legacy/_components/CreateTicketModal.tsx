"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useToast } from '@/hooks/useToast';

export interface Property {
  id: string;
  addressLine1: string;
  address2?: string;
  city: string;
  postcode: string;
}

export interface Tenancy {
  id: string;
  propertyId: string;
  start: string;
  end?: string;
  status: string;
}

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTicketModal({ isOpen, onClose }: CreateTicketModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    propertyId: '',
    tenancyId: '',
    title: '',
    category: '',
    description: '',
    priority: 'STANDARD',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch properties
  const { data: propertiesResponse } = useQuery<{ data: Property[] }>({
    queryKey: ['properties'],
    queryFn: () => apiRequest<{ data: Property[] }>('/properties'),
    enabled: isOpen,
  });
  const properties = propertiesResponse?.data || [];

  // Fetch tenancies for selected property
  const { data: tenanciesResponse } = useQuery<{ data: Tenancy[] }>({
    queryKey: ['tenancies', formData.propertyId],
    queryFn: () => apiRequest<{ data: Tenancy[] }>(`/tenancies?propertyId=${formData.propertyId}`),
    enabled: !!formData.propertyId && isOpen,
  });
  const tenancies = tenanciesResponse?.data || [];

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest('/landlord/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      showToast('Ticket created successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      if (formData.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['property', formData.propertyId] });
      }
      handleClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to create ticket', 'error');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      propertyId,
      tenancyId: '', // Reset tenancy when property changes
    }));
    if (errors.propertyId) {
      setErrors(prev => ({ ...prev, propertyId: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.propertyId) {
      newErrors.propertyId = 'Property is required';
    }
    if (!formData.title || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!formData.description || formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Submit with tenancyId only if explicitly selected, otherwise backend will auto-select
    const submitData = {
      ...formData,
      tenancyId: formData.tenancyId || undefined,
    };

    createTicketMutation.mutate(submitData as any);
  };

  const handleClose = () => {
    setFormData({
      propertyId: '',
      tenancyId: '',
      title: '',
      category: '',
      description: '',
      priority: 'STANDARD',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Maintenance Ticket" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.propertyId}
            onChange={(e) => handlePropertyChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.propertyId ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select a property...</option>
            {properties?.map((property) => (
              <option key={property.id} value={property.id}>
                {property.addressLine1}, {property.city} {property.postcode}
              </option>
            ))}
          </select>
          {errors.propertyId && (
            <p className="mt-1 text-sm text-red-600">{errors.propertyId}</p>
          )}
        </div>

        {/* Tenancy Selection (optional) */}
        {formData.propertyId && tenancies && tenancies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenancy (optional - latest active will be selected if not specified)
            </label>
            <select
              value={formData.tenancyId}
              onChange={(e) => handleChange('tenancyId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Auto-select latest active tenancy</option>
              {tenancies.map((tenancy) => (
                <option key={tenancy.id} value={tenancy.id}>
                  {new Date(tenancy.start).toLocaleDateString()} - {tenancy.end ? new Date(tenancy.end).toLocaleDateString() : 'Present'} ({tenancy.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select category...</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Heating">Heating</option>
            <option value="Appliances">Appliances</option>
            <option value="Structural">Structural</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.title ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Boiler not firing"
            required
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Provide details about the issue..."
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="LOW">Low</option>
            <option value="STANDARD">Standard</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createTicketMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
