import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, FileText, Wrench, Shield, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user || !user.organisations || user.organisations.length === 0) return null;

  const primaryOrg = user.organisations[0];
  const isLandlord = primaryOrg?.role === 'LANDLORD';

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard', show: true },
    { icon: Building2, label: 'Properties', path: '/properties', show: isLandlord },
    { icon: Wrench, label: 'Maintenance', path: '/tickets', show: true },
    { icon: Shield, label: 'Compliance', path: '/compliance', show: isLandlord },
    { icon: FileText, label: 'Jobs', path: '/jobs', show: isLandlord },
    { icon: Users, label: 'Queue', path: '/queue', show: isLandlord },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow overflow-y-auto rounded-xl bg-brand-panel shadow-card">
        <div className="flex flex-col flex-grow pt-5 pb-4">
          <div className="px-4 mb-6">
            <h1 className="text-xl font-bold text-brand-text">Property Manager</h1>
            <p className="text-xs text-brand-subtle mt-1">{primaryOrg.orgName}</p>
          </div>
          <nav className="flex-1 px-2 space-y-1">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-brand-blue/30 text-brand-text'
                      : 'text-brand-subtle hover:bg-gray-50 hover:text-brand-text'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-brand-text' : 'text-brand-subtle'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
