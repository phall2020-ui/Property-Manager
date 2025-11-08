import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Lazy load pages for better performance
const PropertiesListPage = lazy(() => import('./pages/properties/PropertiesListPage'));
const PropertyCreatePage = lazy(() => import('./pages/properties/PropertyCreatePage'));
const PropertyDetailPage = lazy(() => import('./pages/properties/PropertyDetailPage'));
const TicketsListPage = lazy(() => import('./pages/tickets/TicketsListPage'));
const TicketCreatePage = lazy(() => import('./pages/tickets/TicketCreatePage'));
const TicketDetailPage = lazy(() => import('./pages/tickets/TicketDetailPage'));
const ComplianceCentrePage = lazy(() => import('./pages/compliance/ComplianceCentrePage'));
const JobsListPage = lazy(() => import('./pages/jobs/JobsListPage'));
const QueueListPage = lazy(() => import('./pages/queue/QueueListPage'));
const FinanceDashboardPage = lazy(() => import('./pages/finance/FinanceDashboardPage'));
const TenantInvoicesPage = lazy(() => import('./pages/finance/TenantInvoicesPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000, // 5 seconds
    },
  },
});

// Loading component for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading page...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <EventProvider>
              <BrowserRouter>
                <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/properties"
                  element={
                    <ProtectedRoute>
                      <PropertiesListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/properties/new"
                  element={
                    <ProtectedRoute>
                      <PropertyCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/properties/:id"
                  element={
                    <ProtectedRoute>
                      <PropertyDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets"
                  element={
                    <ProtectedRoute>
                      <TicketsListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets/new"
                  element={
                    <ProtectedRoute>
                      <TicketCreatePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tickets/:id"
                  element={
                    <ProtectedRoute>
                      <TicketDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compliance"
                  element={
                    <ProtectedRoute>
                      <ComplianceCentrePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/jobs"
                  element={
                    <ProtectedRoute>
                      <JobsListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/queue"
                  element={
                    <ProtectedRoute>
                      <QueueListPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <ProtectedRoute>
                      <FinanceDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tenant/invoices"
                  element={
                    <ProtectedRoute>
                      <TenantInvoicesPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </BrowserRouter>
            </EventProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
