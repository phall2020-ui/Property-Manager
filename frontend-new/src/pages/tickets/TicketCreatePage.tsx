import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, propertiesApi, tenanciesApi } from '../../lib/api';
import { extractErrorMessage } from '../../lib/validation';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  if (!user || !user.organisations || user.organisations.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>No organisation found for this user. Please contact support.</p>
        </div>
      </div>
    );
  }

  const primaryRole = user.organisations[0]?.role || 'TENANT';
  const isTenant = primaryRole === 'TENANT';
  const isLandlord = primaryRole === 'LANDLORD';
  const isContractor = primaryRole === 'CONTRACTOR';

  const [formData, setFormData] = useState({
    propertyId: '',
    tenancyId: '',
    title: '',
    description: '',
    priority: 'STANDARD',
    category: '',
  });

  const [error, setError] = useState('');

  // Fetch properties for landlords and contractors
  const { data: propertiesResponse } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
    enabled: isLandlord || isContractor,
  });
  const properties = propertiesResponse?.data || propertiesResponse || [];

  // Fetch tenancies for tenants (only their tenancy)
  const { data: tenanciesResponse } = useQuery({
    queryKey: ['tenancies'],
    queryFn: () => tenanciesApi.list(),
    enabled: isTenant,
  });
  const tenancies = tenanciesResponse?.data || tenanciesResponse || [];

  // Auto-select tenancy for tenants (they only have one)
  useEffect(() => {
    if (isTenant && tenancies.length > 0) {
      const activeTenancy = tenancies.find((t: any) => t.status === 'ACTIVE') || tenancies[0];
      if (activeTenancy) {
        setFormData(prev => ({
          ...prev,
          tenancyId: activeTenancy.id,
          propertyId: activeTenancy.propertyId || activeTenancy.property?.id || '',
        }));
      }
    }
  }, [isTenant, tenancies]);

  const createMutation = useMutation({
    mutationFn: (data: {
      propertyId?: string;
      tenancyId?: string;
      title: string;
      description: string;
      priority: string;
      category?: string;
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
      const errorMessage = extractErrorMessage(err) || 'Failed to create ticket';
      setError(errorMessage);
      toast.error(errorMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Ticket created successfully!');
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

    // Validate based on role
    if (isTenant && !formData.tenancyId) {
      setError('Please select a tenancy');
      return;
    }
    if ((isLandlord || isContractor) && !formData.propertyId) {
      setError('Please select a property');
      return;
    }

    createMutation.mutate({
      propertyId: formData.propertyId || undefined,
      tenancyId: formData.tenancyId || undefined,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      category: formData.category || undefined,
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

        {/* Property Selection - For Landlords and Contractors */}
        {(isLandlord || isContractor) && (
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a property</option>
              {properties.map((property: any) => {
                const address = property.addressLine1 || property.address1 || '';
                const city = property.city || '';
                const postcode = property.postcode || '';
                const display = [address, city, postcode].filter(Boolean).join(', ');
                return (
                  <option key={property.id} value={property.id}>
                    {display || property.id}
                  </option>
                );
              })}
            </select>
            {properties.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                {isLandlord ? 'No properties found. Please create a property first.' : 'No properties assigned to you.'}
              </p>
            )}
          </div>
        )}

        {/* Tenancy Selection - For Tenants (auto-selected, read-only) */}
        {isTenant && (
          <div>
            <label htmlFor="tenancyId" className="block text-sm font-medium text-gray-700">
              Tenancy <span className="text-red-500">*</span>
            </label>
            <select
              id="tenancyId"
              name="tenancyId"
              value={formData.tenancyId}
              onChange={handleChange}
              required
              disabled={tenancies.length === 1}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {tenancies.length === 0 ? (
                <option value="">No active tenancy found</option>
              ) : (
                tenancies.map((tenancy: any) => {
                  const property = tenancy.property || {};
                  const address = property.addressLine1 || property.address1 || 'Property';
                  const startDate = tenancy.start ? new Date(tenancy.start).toLocaleDateString() : '';
                  const endDate = tenancy.end ? new Date(tenancy.end).toLocaleDateString() : 'Present';
                  return (
                    <option key={tenancy.id} value={tenancy.id}>
                      {address} ({startDate} - {endDate})
                    </option>
                  );
                })
              )}
            </select>
            {tenancies.length === 0 && (
              <p className="mt-1 text-sm text-red-500">
                No active tenancy found. Please contact your landlord.
              </p>
            )}
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

        {/* Category Selection */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select category (optional)</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrical">Electrical</option>
            <option value="heating">Heating</option>
            <option value="appliances">Appliances</option>
            <option value="structural">Structural</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Priority Selection */}
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
            <option value="STANDARD">Standard</option>
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
