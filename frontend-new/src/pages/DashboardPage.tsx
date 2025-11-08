import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import KpiCard from '../components/KpiCard';
import ActivityList from '../components/ActivityList';
import QuickActions from '../components/QuickActions';
import PropertyMap from '../components/PropertyMap';
import { enhancedPropertiesApi, notificationsApi } from '../lib/api';
import { Building2, TrendingUp, DollarSign } from 'lucide-react';
import type { Property, MapPin, ActivityItem } from '../lib/types';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: properties } = useQuery<Property[]>({
    queryKey: ['enhanced-properties'],
    queryFn: enhancedPropertiesApi.list,
    retry: 1,
  });

  // Fetch recent notifications/activity
  const { data: notifications } = useQuery({
    queryKey: ['notifications', { limit: 10 }],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    retry: 1,
  });

  if (!user) return null;

  // Check if user has organisations
  if (!user.organisations || user.organisations.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p>No organisation found for this user. Please contact support.</p>
        </div>
      </div>
    );
  }

  const primaryOrg = user.organisations[0];
  const isLandlord = primaryOrg?.role === 'LANDLORD';

  // Calculate KPIs from properties
  const propertiesArray = Array.isArray(properties) ? properties : [];
  const totalProperties = propertiesArray.length || 0;
  const occupiedProperties = propertiesArray.filter((p: Property) => p.status === 'Occupied').length || 0;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;
  const totalRent = propertiesArray.reduce((sum: number, p: Property) => sum + (p.monthlyRent || 0), 0) || 0;

  // Convert properties to map pins
  const mapPins: MapPin[] =
    propertiesArray
      .filter((p: Property) => p.lat && p.lng)
      .map((p: Property) => ({
        id: p.id,
        name: p.name || p.address.line1,
        position: [p.lat!, p.lng!] as [number, number],
      })) || [];

  // Transform notifications into activity items
  const activity: ActivityItem[] = (notifications || []).map((notification: any) => ({
    id: notification.id,
    text: notification.message,
    date: notification.createdAt,
  }));

  return (
    <div className="space-y-6">
      <Header />

      {isLandlord && (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Total Properties"
              value={totalProperties}
              tone="peach"
              icon={<Building2 className="h-8 w-8" />}
            />
            <KpiCard
              title="Occupancy Rate"
              value={`${occupancyRate}%`}
              tone="teal"
              icon={<TrendingUp className="h-8 w-8" />}
            />
            <KpiCard
              title="Monthly Rent"
              value={`£${totalRent.toLocaleString()}`}
              tone="blue"
              icon={<DollarSign className="h-8 w-8" />}
            />
          </section>

          {/* Activity & Map Section */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <ActivityList items={activity} />
              
              {mapPins.length > 0 && (
                <div className="rounded-xl bg-brand-panel p-6 shadow-card">
                  <div className="mb-4 font-medium text-lg text-brand-text">Portfolio Map</div>
                  <PropertyMap pins={mapPins} />
                </div>
              )}
            </div>
            <QuickActions />
          </section>
        </>
      )}

      {!isLandlord && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Your Organisation</h3>
              <p className="text-gray-600">{primaryOrg.orgName}</p>
              <p className="text-sm text-gray-500">Role: {primaryOrg.role}</p>
            </div>
            <QuickActions />
          </div>
        </div>
      )}
    </div>
  );
}
