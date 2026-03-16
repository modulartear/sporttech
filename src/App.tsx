import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/use-auth';
import { ProtectedRoute } from './components/protected-route';
import { HomePage } from './pages/home';
import { LoginPage } from './pages/auth/login';
import { RegisterPage } from './pages/auth/register';
import { AdminLayout } from './pages/admin/layout';
import { AdminDashboard } from './pages/admin/dashboard';
import { AdminEventsPage } from './pages/admin/events';
import { EventFormPage } from './pages/admin/event-form';
import { AdminUsersPage } from './pages/admin/users';
import { EventDetailsPage } from './pages/event-details';
import { MyEventsPage } from './pages/my-events';
import { PaymentStatusPage } from './pages/payment-status';
import { WatchPage } from './pages/watch';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/event/:id" element={<EventDetailsPage />} />
            
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <MyEventsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/watch/:id"
              element={
                <ProtectedRoute>
                  <WatchPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="events" element={<AdminEventsPage />} />
              <Route path="events/new" element={<EventFormPage />} />
              <Route path="events/:id/edit" element={<EventFormPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>

            <Route path="/payment/success" element={<PaymentStatusPage />} />
            <Route path="/payment/failure" element={<PaymentStatusPage />} />
            <Route path="/payment/pending" element={<PaymentStatusPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}

export default App;
