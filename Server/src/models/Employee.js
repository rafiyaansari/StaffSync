import mongoose from 'mongoose';

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'wfh'];
const LEAVE_DEFAULTS = {
  annual: { total: 18, used: 0 },
  sick: { total: 10, used: 0 },
  casual: { total: 6, used: 0 },
  wfh: { total: 12, used: 0 },
};

const balanceSchema = new mongoose.Schema(
  {
    total: { type: Number, min: 0, max: 365, default: 0 },
    used: { type: Number, min: 0, max: 365, default: 0 },
  },
  { _id: false },
);

const leaveSchema = new mongoose.Schema(
  {
    annual: { type: balanceSchema, default: () => ({ ...LEAVE_DEFAULTS.annual }) },
    sick: { type: balanceSchema, default: () => ({ ...LEAVE_DEFAULTS.sick }) },
    casual: { type: balanceSchema, default: () => ({ ...LEAVE_DEFAULTS.casual }) },
    wfh: { type: balanceSchema, default: () => ({ ...LEAVE_DEFAULTS.wfh }) },
  },
  { _id: false },
);

const emergencySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '', maxlength: 120 },
    relation: { type: String, trim: true, default: '', maxlength: 60 },
    phone: { type: String, trim: true, default: '', maxlength: 32 },
  },
  { _id: false },
);

const employeeSchema = new mongoose.Schema(
  {
    // Sparse + unique: only present on employees created through the app/seed.
    employeeCode: { type: String, trim: true, uppercase: true },
    firstName: { type: String, required: [true, 'First name is required.'], trim: true, maxlength: 60 },
    lastName: { type: String, required: [true, 'Last name is required.'], trim: true, maxlength: 60 },
    name: { type: String, trim: true, maxlength: 130 },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    phone: { type: String, trim: true, default: '', maxlength: 32 },
    jobTitle: { type: String, required: [true, 'Job title is required.'], trim: true, maxlength: 120 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ['hr', 'manager', 'employee'], default: 'employee' },
    systemRole: { type: String, enum: ['hr', 'manager', 'employee'], default: 'employee', index: true },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time',
    },
    workMode: { type: String, enum: ['Hybrid', 'On-site', 'Remote'], default: 'Hybrid' },
    location: { type: String, trim: true, default: 'Bengaluru, IN', maxlength: 120 },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    joinDate: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'joinDate must be YYYY-MM-DD.'] },
    status: { type: String, enum: ['Active', 'Probation', 'Inactive'], default: 'Active', index: true },
    dob: { type: String, default: '', match: [/^(\d{4}-\d{2}-\d{2})?$/, 'dob must be YYYY-MM-DD.'] },
    gender: { type: String, trim: true, default: 'Prefer not to say', maxlength: 40 },
    bloodGroup: { type: String, trim: true, default: '', maxlength: 8 },
    address: { type: String, trim: true, default: '', maxlength: 400 },
    emergency: { type: emergencySchema, default: () => ({}) },
    skills: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 30,
        message: 'Keep skills to 30 entries or fewer.',
      },
    },
    bio: { type: String, trim: true, default: '', maxlength: 1200 },
    avatar: { type: String, default: null },
    leave: { type: leaveSchema, default: () => ({}) },
  },
  { timestamps: true },
);

employeeSchema.index({ employeeCode: 1 }, { unique: true, sparse: true });
employeeSchema.index({ department: 1, status: 1 });
employeeSchema.index({ name: 'text', email: 'text', jobTitle: 'text' });

employeeSchema.pre('validate', function setName(next) {
  if (this.firstName || this.lastName) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  this.role = this.systemRole;
  next();
});

export const EMPLOYEE_LEAVE_TYPES = LEAVE_TYPES;
export const EMPLOYEE_LEAVE_DEFAULTS = LEAVE_DEFAULTS;
export const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
