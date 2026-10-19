import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DataProvider } from '../../context/DataContext';
import Logo from '../ui/Logo';

export function AppBootSplash() {
  return (
    <div className="boot">
      <Logo size="lg" />
      <div className="boot__bar">
        <span />
      </div>
      <p className="boot__text">Syncing your workspace…</p>
    </div>
  );
}

export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <AppBootSplash />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}

export function RoleRoute({ roles, children }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}
