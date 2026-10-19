import Modal from '../ui/Modal';
import LeaveRequestForm from './LeaveRequestForm';
import { useData } from '../../context/DataContext';

export default function LeaveRequestModal({ open, onClose, employee }) {
  const { currentEmployee } = useData();
  const requester = employee || currentEmployee;
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request time off"
      subtitle="Your manager and HR are notified as soon as you submit."
      size="md"
    >
      <LeaveRequestForm employee={requester} onDone={onClose} />
    </Modal>
  );
}
