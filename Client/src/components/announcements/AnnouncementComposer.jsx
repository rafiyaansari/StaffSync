import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import {
  TextField,
  SelectField,
  TextareaField,
  Toggle,
} from '../ui/FormFields';
import { useData } from '../../context/DataContext';
import { ANNOUNCEMENT_CATEGORIES } from '../../utils/ui';

const blank = {
  title: '',
  category: 'Company',
  audience: 'Everyone',
  body: '',
  pinned: false,
};

export default function AnnouncementComposer({ open, onClose, announcement = null }) {
  const { createAnnouncement, updateAnnouncement } = useData();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const editing = Boolean(announcement);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      announcement
        ? {
            title: announcement.title,
            category: announcement.category,
            audience: announcement.audience || 'Everyone',
            body: announcement.body,
            pinned: Boolean(announcement.pinned),
          }
        : blank,
    );
  }, [open, announcement]);

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.title.trim()) next.title = 'Give the announcement a title.';
    if (!form.body.trim()) next.body = 'Write a message for the team.';
    else if (form.body.trim().length < 20) next.body = 'A little more detail helps — at least 20 characters.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      if (editing) await updateAnnouncement(announcement.id, form);
      else await createAnnouncement(form);
      onClose?.();
    } catch (error) {
      setErrors({ form: error.message || 'Could not publish the announcement.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit announcement' : 'New announcement'}
      subtitle={editing ? 'Changes are visible to everyone immediately.' : 'Share news with the whole team.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" icon="megaphone" onClick={submit} loading={loading}>
            {editing ? 'Save changes' : 'Publish announcement'}
          </Button>
        </>
      }
    >
      <form className="composer" onSubmit={submit} noValidate>
        {errors.form ? (
          <div className="inline-alert inline-alert--danger">
            <Icon name="alertCircle" size={15} /> {errors.form}
          </div>
        ) : null}
        <TextField
          label="Title"
          value={form.title}
          onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
          placeholder="e.g. Q3 town hall — save the date"
          error={errors.title}
          required
        />
        <div className="form-grid form-grid--2">
          <SelectField
            label="Category"
            value={form.category}
            onChange={(event) => setForm((f) => ({ ...f, category: event.target.value }))}
            options={ANNOUNCEMENT_CATEGORIES}
          />
          <SelectField
            label="Audience"
            value={form.audience}
            onChange={(event) => setForm((f) => ({ ...f, audience: event.target.value }))}
            options={['Everyone', 'Managers', 'People Ops']}
          />
        </div>
        <TextareaField
          label="Message"
          value={form.body}
          onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
          placeholder="Write clearly — what happened, what it means, and what people should do next."
          error={errors.body}
          rows={7}
          required
        />
        <Toggle
          label="Pin to the top"
          description="Pinned announcements stay at the top of everyone’s feed."
          checked={form.pinned}
          onChange={(event) => setForm((f) => ({ ...f, pinned: event.target.checked }))}
        />
        <p className="composer__hint">
          <Icon name="info" size={13} />
          Everyone in the workspace receives a notification. This demo sends it instantly.
        </p>
      </form>
    </Modal>
  );
}
