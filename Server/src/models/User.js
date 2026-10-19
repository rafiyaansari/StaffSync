import mongoose from 'mongoose';

const ROLES = ['hr', 'manager', 'employee'];

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'employee',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'rejected', 'disabled'],
      default: 'pending',
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    registrationRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RegistrationRequest',
      default: null,
    },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ employee: 1 }, { unique: true, sparse: true });

export const USER_ROLES = ROLES;
export const User = mongoose.model('User', userSchema);
export default User;
