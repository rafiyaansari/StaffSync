import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['leave', 'announcement', 'training', 'system', 'registration', 'attendance'],
      default: 'system',
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, default: '', maxlength: 500 },
    // When recipient is set the notification is personal, otherwise it is
    // broadcast to the listed audience roles (employee / manager / hr).
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    audienceRoles: {
      type: [{ type: String, enum: ['employee', 'manager', 'hr'] }],
      default: [],
    },
    href: { type: String, default: '/notifications', maxlength: 200 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true },
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
