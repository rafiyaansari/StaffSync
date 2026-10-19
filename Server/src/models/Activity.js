import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    text: { type: String, required: true, trim: true, maxlength: 300 },
    type: {
      type: String,
      enum: ['people', 'leave', 'announcement', 'training', 'attendance', 'system'],
      default: 'system',
    },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

activitySchema.index({ at: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
export default Activity;
