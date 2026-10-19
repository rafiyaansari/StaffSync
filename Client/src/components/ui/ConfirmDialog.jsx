import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';

const TONE_ICON = {
  danger: 'trash',
  warning: 'alertTriangle',
  primary: 'checkCircle',
  success: 'checkCircle',
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
  loading = false,
  children,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm" hideClose>
      <div className={`confirm confirm--${tone}`}>
        <span className="confirm__icon">
          <Icon name={icon || TONE_ICON[tone] || 'alertCircle'} size={20} />
        </span>
        <h2 className="confirm__title">{title}</h2>
        {description ? <p className="confirm__description">{description}</p> : null}
        {children ? <div className="confirm__description">{children}</div> : null}
      </div>
      <div className="confirm__actions">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
