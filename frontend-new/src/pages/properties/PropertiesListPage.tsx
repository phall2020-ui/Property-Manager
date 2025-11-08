import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { enhancedPropertiesApi } from '../../lib/api';
import Header from '../../components/Header';
import PropertyFilters from '../../components/properties/PropertyFilters';
import PropertyCard from '../../components/properties/PropertyCard';
import type { Property } from '../../lib/types';

export default function PropertiesListPage() {
  const [filtered, setFiltered] = useState<Property[]>([]);
  
  const { data: properties, isLoading, error } = useQuery<Property[]>({
    queryKey: ['enhanced-properties'],
    queryFn: enhancedPropertiesApi.list,
  });

  // Ensure properties is always an array
  const allProperties = Array.isArray(properties) ? properties : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading properties: {(error as Error).message}
        </div>
      </div>
    );
  }

  const displayProperties = filtered.length > 0 || allProperties.length > 0 ? filtered : allProperties;

  return (
    <div className="space-y-6">
      <Header />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-text">Properties</h2>
        <Link
          to="/properties/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-card transition-all hover:scale-105"
        >
          Add Property
        </Link>
      </div>

      <PropertyFilters all={allProperties} onChange={setFiltered} />

      {displayProperties.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {displayProperties.map((property) => (
            <PropertyCard key={property.id} p={property} />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-card rounded-xl p-12 text-center">
          <p className="text-brand-subtle text-lg">No properties found matching your filters.</p>
          <Link
            to="/properties/new"
            className="mt-4 inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Add Your First Property
          </Link>
        </div>
      )}
    </div>
  );
}
