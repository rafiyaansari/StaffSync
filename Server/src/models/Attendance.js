import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD.'] },
    status: {
      type: String,
      enum: ['Present', 'Late', 'WFH', 'On leave', 'Absent'],
      default: 'Present',
      index: true,
    },
    mode: { type: String, enum: ['office', 'remote', null], default: null },
    checkIn: { type: String, default: null, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'checkIn must be HH:MM.'] },
    checkOut: { type: String, default: null, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'checkOut must be HH:MM.'] },
    hours: { type: Number, min: 0, max: 24, default: 0 },
    note: { type: String, trim: true, default: '', maxlength: 300 },
  },
  { timestamps: true },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
