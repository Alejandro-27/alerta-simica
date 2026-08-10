import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import AdminLayout from './components/AdminLayout';
import LoadingScreen from './components/LoadingScreen';

import Home from './pages/Home';
import Earthquakes from './pages/Earthquakes';
import EarthquakeDetail from './pages/EarthquakeDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SettingsProfile from './pages/SettingsProfile';
import SettingsLocation from './pages/SettingsLocation';
import SettingsAlerts from './pages/SettingsAlerts';
import InstallPage from './pages/InstallPage';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import OfflinePage from './pages/OfflinePage';
import NotFound from './pages/NotFound';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminEarthquakes from './pages/admin/AdminEarthquakes';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminLogs from './pages/admin/AdminLogs';
import AdminSources from './pages/admin/AdminSources';
import AdminConfig from './pages/admin/AdminConfig';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/earthquakes" element={<Earthquakes />} />
          <Route path="/earthquakes/:id" element={<EarthquakeDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/offline" element={<OfflinePage />} />

          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/settings/profile" element={<RequireAuth><SettingsProfile /></RequireAuth>} />
          <Route path="/settings/location" element={<RequireAuth><SettingsLocation /></RequireAuth>} />
          <Route path="/settings/alerts" element={<RequireAuth><SettingsAlerts /></RequireAuth>} />

          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="earthquakes" element={<AdminEarthquakes />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="sources" element={<AdminSources />} />
            <Route path="config" element={<AdminConfig />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
