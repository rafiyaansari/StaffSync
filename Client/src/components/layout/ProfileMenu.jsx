import { useNavigate } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Icon from '../ui/Icon';
import Dropdown, { DropdownItem, DropdownSeparator, DropdownLabel } from '../ui/Dropdown';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_LABELS } from '../../config/navigation';

export default function ProfileMenu() {
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  const { currentEmployee } = useData();
  const toast = useToast();

  const employee = currentEmployee;
  if (!employee) return null;

  const handleLogout = () => {
    logout();
    toast.info('You’ve been signed out. See you soon.');
    navigate('/login', { replace: true });
  };

  return (
    <Dropdown
      width={244}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={`profile-trigger ${open ? 'is-active' : ''}`.trim()}
          onClick={toggle}
          aria-label="Open profile menu"
          aria-expanded={open}
        >
          <Avatar name={employee.name} src={employee.avatar} size="sm" />
          <span className="profile-trigger__text">
            <span className="profile-trigger__name">{employee.name}</span>
            <span className="profile-trigger__role">{ROLE_LABELS[role] || 'Employee'}</span>
          </span>
          <Icon name="chevronDown" size={14} className="profile-trigger__chevron" />
        </button>
      )}
    >
      <DropdownLabel>Signed in as</DropdownLabel>
      <div className="profile-menu__identity">
        <Avatar name={employee.name} src={employee.avatar} size="md" />
        <div className="profile-menu__identity-text">
          <span className="profile-menu__name">{employee.name}</span>
          <span className="profile-menu__email">{employee.email}</span>
        </div>
      </div>
      <DropdownSeparator />
      <DropdownItem icon="user" onClick={() => navigate('/profile')}>
        My profile
      </DropdownItem>
      <DropdownItem icon="settings" onClick={() => navigate('/settings')}>
        Settings
      </DropdownItem>
      <DropdownItem icon="bell" onClick={() => navigate('/notifications')}>
        Notifications
      </DropdownItem>
      <DropdownSeparator />
      <DropdownItem icon="logout" danger onClick={handleLogout}>
        Sign out
      </DropdownItem>
    </Dropdown>
  );
}
