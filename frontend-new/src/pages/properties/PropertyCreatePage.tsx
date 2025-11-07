import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi } from '../../lib/api';

export default function PropertyCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    address1: '',
    address2: '',
    city: '',
    postcode: '',
    bedrooms: '',
  });

  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: {
      address1: string;
      address2?: string;
      city?: string;
      postcode: string;
      bedrooms?: number;
    }) => propertiesApi.create(data),
    onMutate: async (newProperty) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['properties'] });
      await queryClient.cancelQueries({ queryKey: ['enhanced-properties'] });
      
      // Snapshot the previous values
      const previousProperties = queryClient.getQueryData(['properties']);
      const previousEnhanced = queryClient.getQueryData(['enhanced-properties']);
      
      // Optimistically update to the new value
      const optimisticProperty = {
        id: `temp-${Date.now()}`,
        ...newProperty,
        createdAt: new Date().toISOString(),
      };
      
      queryClient.setQueryData(['properties'], (old: unknown) => {
        const properties = Array.isArray(old) ? old : [];
        return [...properties, optimisticProperty];
      });
      queryClient.setQueryData(['enhanced-properties'], (old: unknown) => {
        const properties = Array.isArray(old) ? old : [];
        return [...properties, optimisticProperty];
      });
      
      // Return a context with the snapshotted values
      return { previousProperties, previousEnhanced };
    },
    onError: (err: unknown, _newProperty, context) => {
      // Roll back on error
      if (context?.previousProperties) {
        queryClient.setQueryData(['properties'], context.previousProperties);
      }
      if (context?.previousEnhanced) {
        queryClient.setQueryData(['enhanced-properties'], context.previousEnhanced);
      }
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { message?: string } })?.data?.message || 'Failed to create property'
        : 'Failed to create property';
      setError(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-properties'] });
      navigate('/properties');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.address1 || !formData.postcode) {
      setError('Address and postcode are required');
      return;
    }

    createMutation.mutate({
      address1: formData.address1,
      address2: formData.address2 || undefined,
      city: formData.city || undefined,
      postcode: formData.postcode,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Add New Property</h2>
        <p className="mt-1 text-sm text-gray-600">
          Enter the property details below
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="address1" className="block text-sm font-medium text-gray-700">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address1"
            name="address1"
            required
            value={formData.address1}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="123 Main Street"
          />
        </div>

        <div>
          <label htmlFor="address2" className="block text-sm font-medium text-gray-700">
            Address Line 2
          </label>
          <input
            type="text"
            id="address2"
            name="address2"
            value={formData.address2}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Apt 4B"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="London"
            />
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
              Postcode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="postcode"
              name="postcode"
              required
              value={formData.postcode}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="SW1A 1AA"
            />
          </div>
        </div>

        <div>
          <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">
            Number of Bedrooms
          </label>
          <input
            type="number"
            id="bedrooms"
            name="bedrooms"
            min="0"
            value={formData.bedrooms}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="3"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/properties')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  );
}
