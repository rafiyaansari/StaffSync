import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute, { AppBootSplash, RoleRoute } from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import RegistrationsPage from './pages/RegistrationsPage';
import TeamPage from './pages/TeamPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import TrainingPage from './pages/TrainingPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import NotFoundPage from './pages/NotFoundPage';

function RootRedirect() {
  const { isAuthenticated, initializing } = useAuth();
  if (initializing) return <AppBootSplash />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/employees"
            element={
              <RoleRoute roles={['hr']}>
                <EmployeesPage mode="hr" />
              </RoleRoute>
            }
          />
          <Route
            path="/employees/requests"
            element={
              <RoleRoute roles={['hr']}>
                <RegistrationsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/team"
            element={
              <RoleRoute roles={['manager']}>
                <TeamPage />
              </RoleRoute>
            }
          />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leaves" element={<LeavesPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage standalone />} />
    </Routes>
  );
}
