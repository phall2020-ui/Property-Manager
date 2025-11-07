import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, propertiesApi } from '../../lib/api';

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    propertyId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
  });

  const [error, setError] = useState('');

  // Fetch properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      propertyId?: string;
      title: string;
      description: string;
      priority: string;
    }) => ticketsApi.create(data),
    onMutate: async (newTicket) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      
      // Snapshot the previous value
      const previousTickets = queryClient.getQueryData(['tickets']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['tickets'], (old: unknown) => {
        const tickets = Array.isArray(old) ? old : [];
        const optimisticTicket = {
          id: `temp-${Date.now()}`,
          ...newTicket,
          status: 'OPEN',
          createdAt: new Date().toISOString(),
          property: newTicket.propertyId && properties
            ? properties.find((p: { id: string }) => p.id === newTicket.propertyId)
            : undefined,
        };
        return [...tickets, optimisticTicket];
      });
      
      // Return a context object with the snapshotted value
      return { previousTickets };
    },
    onError: (err: unknown, _newTicket, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['tickets'], context?.previousTickets);
      const errorMessage = err && typeof err === 'object' && 'response' in err
        ? (err.response as { data?: { message?: string } })?.data?.message || 'Failed to create ticket'
        : 'Failed to create ticket';
      setError(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      navigate('/tickets');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.title || !formData.description) {
      setError('Title and description are required');
      return;
    }

    createMutation.mutate({
      propertyId: formData.propertyId || undefined,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Report Maintenance Issue</h2>
        <p className="mt-1 text-sm text-gray-600">
          Describe the issue you're experiencing
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {properties && properties.length > 0 && (
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700">
              Property
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a property</option>
              {properties.map((property: { id: string; address1: string; city?: string; postcode?: string }) => (
                <option key={property.id} value={property.id}>
                  {property.address1}, {property.city || property.postcode}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Issue Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Leaking kitchen tap"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Please describe the issue in detail..."
          />
        </div>

        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Select urgency based on the severity of the issue
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Submit Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
