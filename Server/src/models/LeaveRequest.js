import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['annual', 'sick', 'casual', 'wfh', 'unpaid'],
      default: 'annual',
      required: true,
    },
    from: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'from must be YYYY-MM-DD.'] },
    to: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'to must be YYYY-MM-DD.'] },
    days: { type: Number, min: 1, max: 365, required: true },
    reason: { type: String, trim: true, default: '', maxlength: 800 },
    handover: { type: String, trim: true, default: '', maxlength: 800 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    note: { type: String, trim: true, default: '', maxlength: 800 },
    appliedOn: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'appliedOn must be YYYY-MM-DD.'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedByName: { type: String, default: null },
    reviewedOn: { type: String, default: null },
  },
  { timestamps: true },
);

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ from: 1, to: 1 });
leaveRequestSchema.index({ status: 1, appliedOn: -1 });

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
