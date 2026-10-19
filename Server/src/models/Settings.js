import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    emailOnLeave: { type: Boolean, default: true },
    emailOnAnnouncement: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    compactTables: { type: Boolean, default: false },
    showBirthdays: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const SETTINGS_DEFAULTS = {
  emailOnLeave: true,
  emailOnAnnouncement: true,
  weeklyDigest: false,
  pushNotifications: true,
  compactTables: false,
  showBirthdays: true,
};

export const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
