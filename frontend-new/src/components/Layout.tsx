import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEventContext } from '../contexts/EventContext';
import { useToast } from '../contexts/ToastContext';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const { subscribe } = useEventContext();
  const { toasts, removeToast, info } = useToast();

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      // Show toast notification for certain events
      if (event.type === 'ticket.created') {
        info('New ticket created');
      } else if (event.type === 'ticket.status_changed') {
        info('Ticket status updated');
      } else if (event.type === 'ticket.approved') {
        info('Ticket approved');
      } else if (event.type === 'invoice.created') {
        info('New invoice created');
      } else if (event.type === 'invoice.paid') {
        info('Invoice paid');
      }
    });

    return unsubscribe;
  }, [subscribe, info]);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 md:px-8">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
