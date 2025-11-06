"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTicketSchema, CreateTicketDTO } from '@/lib/schemas';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/apiClient';

export default function ReportIssuePage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTicketDTO>({ resolver: zodResolver(CreateTicketSchema) });
  const [generalError, setGeneralError] = useState<string | null>(null);
  const mutation = useMutation<{ id: string }, any, CreateTicketDTO>({
    mutationFn: async (data: CreateTicketDTO) => {
      return apiRequest<{ id: string }>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (resp) => {
      reset();
      router.push(`/tickets/${resp.id}`);
    },
    onError: (err: any) => {
      setGeneralError(err.detail || 'Failed to create ticket');
    },
  });
  const onSubmit = (data: CreateTicketDTO) => {
    setGeneralError(null);
    mutation.mutate(data);
  };
  return (
    <div className="max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Report an Issue</h2>
      {generalError && <p className="text-sm text-red-600">{generalError}</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="propertyId" className="block text-sm font-medium">
            Property ID
          </label>
          <input
            id="propertyId"
            type="text"
            {...register('propertyId')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          />
          {errors.propertyId && <p className="text-xs text-red-600">{errors.propertyId.message}</p>}
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            {...register('category')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          >
            <option value="">Select category</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="heating">Heating</option>
            <option value="other">Other</option>
          </select>
          {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
          ></textarea>
          {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
        </div>
        {/* File upload omitted for brevity; implement using Uploader component */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-primary px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}