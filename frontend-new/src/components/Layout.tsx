import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-8">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
