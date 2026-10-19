import { useAuth } from '../context/AuthContext';
import HrDashboard from '../components/dashboard/HrDashboard';
import ManagerDashboard from '../components/dashboard/ManagerDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';

export default function DashboardPage() {
  const { role } = useAuth();
  if (role === 'hr') return <HrDashboard />;
  if (role === 'manager') return <ManagerDashboard />;
  return <EmployeeDashboard />;
}
