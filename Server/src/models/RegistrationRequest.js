import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '', maxlength: 32 },
    jobTitle: { type: String, trim: true, default: 'Team member', maxlength: 120 },
    department: { type: String, trim: true, default: 'Engineering', maxlength: 80 },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time',
    },
    location: { type: String, trim: true, default: 'Bengaluru, IN', maxlength: 120 },
    startDate: { type: String, default: null },
    note: { type: String, trim: true, default: '', maxlength: 800 },
    systemRole: { type: String, enum: ['employee', 'manager', 'hr'], default: 'employee' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    appliedOn: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'appliedOn must be YYYY-MM-DD.'] },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    reviewedByName: { type: String, default: null },
    reviewedOn: { type: String, default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  },
  { timestamps: true },
);

registrationSchema.index({ status: 1, appliedOn: -1 });

export const RegistrationRequest = mongoose.model('RegistrationRequest', registrationSchema);
export default RegistrationRequest;
