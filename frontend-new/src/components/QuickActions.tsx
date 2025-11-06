import { Link } from 'react-router-dom';
import { Plus, UserPlus, FileText, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function QuickActions() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const primaryOrg = user.organisations[0];
  const isLandlord = primaryOrg.role === 'LANDLORD';

  const actions = [
    { icon: Plus, label: 'Add Property', path: '/properties/new', show: isLandlord, tone: 'blue' },
    { icon: UserPlus, label: 'New Tenancy', path: '/tenancies/new', show: isLandlord, tone: 'teal' },
    { icon: Wrench, label: 'Report Issue', path: '/tickets/new', show: true, tone: 'peach' },
    { icon: FileText, label: 'View Reports', path: '/reports', show: isLandlord, tone: 'blue' },
  ];

  return (
    <div className="rounded-xl bg-brand-panel p-6 shadow-card">
      <h3 className="text-lg font-medium text-brand-text mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {actions.filter(action => action.show).map((action) => {
          const Icon = action.icon;
          const bgColors = {
            blue: 'bg-brand-blue/20 hover:bg-brand-blue/30',
            teal: 'bg-brand-teal/20 hover:bg-brand-teal/30',
            peach: 'bg-brand-peach/20 hover:bg-brand-peach/30',
          };
          
          return (
            <Link
              key={action.path}
              to={action.path}
              className={`flex items-center p-4 rounded-lg ${bgColors[action.tone as keyof typeof bgColors]} transition-all hover:scale-105`}
            >
              <Icon className="h-5 w-5 text-brand-text mr-3" />
              <span className="text-sm font-medium text-brand-text">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
