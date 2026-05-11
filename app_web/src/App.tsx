import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { defaultRouteForRole } from './lib/utils';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LiveDetectionPage from './pages/LiveDetectionPage';
import ModelComparisonPage from './pages/ModelComparisonPage';
import BatchAnalysisPage from './pages/BatchAnalysisPage';
import MonitoringPage from './pages/MonitoringPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import NotFoundPage from './pages/NotFoundPage';

function AppShell() {
  const { token, user } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0A1929] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-[#F5F7FA] p-6 text-slate-900">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function NavigateToDefault() {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={defaultRouteForRole(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<AppShell />}>
        <Route index element={<NavigateToDefault />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute roles={['security_analyst', 'data_scientist', 'administrator']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="live-detection"
          element={
            <ProtectedRoute roles={['security_analyst', 'data_scientist', 'administrator']}>
              <LiveDetectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="model-comparison"
          element={
            <ProtectedRoute roles={['security_analyst', 'data_scientist', 'administrator']}>
              <ModelComparisonPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="batch-analysis"
          element={
            <ProtectedRoute roles={['security_analyst', 'data_scientist', 'administrator']}>
              <BatchAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="monitoring"
          element={
            <ProtectedRoute roles={['data_scientist', 'administrator']}>
              <MonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute roles={['administrator']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="user-management"
          element={
            <ProtectedRoute roles={['administrator']}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
