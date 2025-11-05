import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { propertiesApi } from '../../lib/api';

interface Property {
  id: string;
  address1: string;
  address2?: string;
  city?: string;
  postcode?: string;
  bedrooms?: number;
  createdAt: string;
  updatedAt: string;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: property, isLoading, error } = useQuery<Property>({
    queryKey: ['properties', id],
    queryFn: () => propertiesApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading property: {(error as Error).message}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        Property not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/properties')}
            className="text-blue-600 hover:text-blue-900 text-sm mb-2"
          >
            ← Back to Properties
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Property Details</h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Address Line 1</label>
              <p className="mt-1 text-sm text-gray-900">{property.address1}</p>
            </div>

            {property.address2 && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Address Line 2</label>
                <p className="mt-1 text-sm text-gray-900">{property.address2}</p>
              </div>
            )}

            {property.city && (
              <div>
                <label className="block text-sm font-medium text-gray-500">City</label>
                <p className="mt-1 text-sm text-gray-900">{property.city}</p>
              </div>
            )}

            {property.postcode && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Postcode</label>
                <p className="mt-1 text-sm text-gray-900">{property.postcode}</p>
              </div>
            )}

            {property.bedrooms !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Bedrooms</label>
                <p className="mt-1 text-sm text-gray-900">{property.bedrooms}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={`/tenancies?propertyId=${property.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <h4 className="font-medium text-gray-900">View Tenancies</h4>
              <p className="text-sm text-gray-600 mt-1">Manage tenancy agreements</p>
            </Link>

            <Link
              to={`/tickets?propertyId=${property.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <h4 className="font-medium text-gray-900">View Tickets</h4>
              <p className="text-sm text-gray-600 mt-1">Maintenance requests</p>
            </Link>

            <Link
              to={`/tenancies/new?propertyId=${property.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center"
            >
              <h4 className="font-medium text-gray-900">Create Tenancy</h4>
              <p className="text-sm text-gray-600 mt-1">Add new tenant</p>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Information</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500">Property ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{property.id}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(property.createdAt).toLocaleString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(property.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
