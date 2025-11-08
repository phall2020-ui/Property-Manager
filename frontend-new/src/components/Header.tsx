import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import LiveIndicator from './LiveIndicator';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="flex items-center justify-between rounded-xl bg-brand-panel p-4 shadow-card">
      <div>
        <h2 className="text-2xl font-semibold text-brand-text">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name}!
        </h2>
        <p className="text-sm text-brand-subtle mt-1">{today}</p>
      </div>
      <div className="flex items-center gap-3">
        <LiveIndicator />
        <NotificationDropdown />
        <button 
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Settings (Coming soon)"
          disabled
        >
          <Settings className="h-5 w-5 text-brand-subtle" />
        </button>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5 text-red-600" />
        </button>
      </div>
    </header>
  );
}
