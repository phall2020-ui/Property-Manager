"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTicketSchema, CreateTicketDTO } from '@/lib/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

export default function ReportIssuePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTicketDTO>({ 
    resolver: zodResolver(CreateTicketSchema),
    defaultValues: {
      priority: 'STANDARD',
    },
  });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const mutation = useMutation<{ id: string }, any, CreateTicketDTO>({
    mutationFn: async (data: CreateTicketDTO) => {
      return apiRequest<{ id: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (resp) => {
      setSuccessMessage('Ticket created successfully!');
      setGeneralError(null);
      
      // Invalidate queries to refresh ticket lists
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      const propertyIdInput = document.getElementById('propertyId') as HTMLInputElement;
      if (propertyIdInput?.value) {
        const propertyId = propertyIdInput.value;
        queryClient.invalidateQueries({ queryKey: ['tickets', { propertyId }] });
        queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      }
      
      reset();
      // Navigate to tickets list after a short delay
      setTimeout(() => {
        router.push('/my-tickets');
      }, 1500);
    },
    onError: (err: any) => {
      setGeneralError(err.detail || 'Failed to create ticket');
      setSuccessMessage(null);
    },
  });
  
  const onSubmit = (data: CreateTicketDTO) => {
    setGeneralError(null);
    setSuccessMessage(null);
    mutation.mutate(data);
  };
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-6">
      <h2 className="text-2xl font-semibold">Report a Maintenance Issue</h2>
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium mb-1">
            Property ID
          </label>
          <input
            id="propertyId"
            type="text"
            {...register('propertyId')}
            placeholder="Enter your property ID"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.propertyId && <p className="text-xs text-red-600 mt-1">{errors.propertyId.message}</p>}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Issue Title *
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            placeholder="Brief description of the issue"
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category *
          </label>
          <select
            id="category"
            {...register('category')}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select category</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Heating">Heating</option>
            <option value="Appliances">Appliances</option>
            <option value="Structural">Structural</option>
            <option value="Damp">Damp & Mould</option>
            <option value="Security">Security</option>
            <option value="Other">Other</option>
          </select>
          {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium mb-1">
            Priority
          </label>
          <select
            id="priority"
            {...register('priority')}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="LOW">Low - Can wait</option>
            <option value="STANDARD">Standard - Normal timeframe</option>
            <option value="MEDIUM">Medium - Needs attention soon</option>
            <option value="HIGH">High - Urgent</option>
          </select>
          {errors.priority && <p className="text-xs text-red-600 mt-1">{errors.priority.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description *
          </label>
          <textarea
            id="description"
            rows={5}
            {...register('description')}
            placeholder="Please provide detailed information about the issue..."
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          ></textarea>
          {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>}
          <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}