import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventProvider } from './contexts/EventContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PropertiesListPage from './pages/properties/PropertiesListPage';
import PropertyCreatePage from './pages/properties/PropertyCreatePage';
import PropertyDetailPage from './pages/properties/PropertyDetailPage';
import TicketsListPage from './pages/tickets/TicketsListPage';
import TicketCreatePage from './pages/tickets/TicketCreatePage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import ComplianceCentrePage from './pages/compliance/ComplianceCentrePage';
import JobsListPage from './pages/jobs/JobsListPage';
import QueueListPage from './pages/queue/QueueListPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000, // 5 seconds
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </EventProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
