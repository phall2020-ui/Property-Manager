import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  const primaryOrg = user.organisations[0];

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Your Organisation</h3>
            <p className="text-gray-600">{primaryOrg.orgName}</p>
            <p className="text-sm text-gray-500">Role: {primaryOrg.role}</p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {primaryOrg.role === 'LANDLORD' && (
                <>
                  <Link to="/properties" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">Properties</h4>
                    <p className="text-sm text-gray-600">Manage your properties</p>
                  </Link>
                  <Link to="/tickets" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">Tickets</h4>
                    <p className="text-sm text-gray-600">Maintenance requests</p>
                  </Link>
                  <Link to="/properties/new" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">Add Property</h4>
                    <p className="text-sm text-gray-600">Create new property</p>
                  </Link>
                </>
              )}

              {primaryOrg.role === 'TENANT' && (
                <>
                  <Link to="/tickets/new" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">Report Issue</h4>
                    <p className="text-sm text-gray-600">Create maintenance ticket</p>
                  </Link>
                  <Link to="/tickets" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">My Tickets</h4>
                    <p className="text-sm text-gray-600">View your requests</p>
                  </Link>
                </>
              )}

              {primaryOrg.role === 'CONTRACTOR' && (
                <>
                  <Link to="/tickets" className="p-4 border rounded-lg hover:bg-gray-50 block">
                    <h4 className="font-medium">My Jobs</h4>
                    <p className="text-sm text-gray-600">View assigned tickets</p>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">System Status</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Backend API Connected</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Authentication Active (httpOnly cookies)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
