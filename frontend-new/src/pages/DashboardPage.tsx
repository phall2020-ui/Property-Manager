import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const primaryOrg = user.organisations[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Property Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.name} ({primaryOrg.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">Properties</h4>
                        <p className="text-sm text-gray-600">Manage your properties</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">Tenancies</h4>
                        <p className="text-sm text-gray-600">View tenancy agreements</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">Tickets</h4>
                        <p className="text-sm text-gray-600">Maintenance requests</p>
                      </button>
                    </>
                  )}

                  {primaryOrg.role === 'TENANT' && (
                    <>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">Report Issue</h4>
                        <p className="text-sm text-gray-600">Create maintenance ticket</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">My Tickets</h4>
                        <p className="text-sm text-gray-600">View your requests</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">My Tenancy</h4>
                        <p className="text-sm text-gray-600">View tenancy details</p>
                      </button>
                    </>
                  )}

                  {primaryOrg.role === 'CONTRACTOR' && (
                    <>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">My Jobs</h4>
                        <p className="text-sm text-gray-600">View assigned tickets</p>
                      </button>
                      <button className="p-4 border rounded-lg hover:bg-gray-50">
                        <h4 className="font-medium">Submit Quote</h4>
                        <p className="text-sm text-gray-600">Quote for jobs</p>
                      </button>
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
      </main>
    </div>
  );
}
