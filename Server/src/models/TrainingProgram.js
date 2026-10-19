import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ['Not started', 'In progress', 'Completed'],
      default: 'Not started',
    },
    assignedOn: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'assignedOn must be YYYY-MM-DD.'] },
    completedOn: { type: String, default: null },
  },
  { _id: false },
);

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Give the programme a title.'], trim: true, maxlength: 160 },
    category: { type: String, trim: true, default: 'General', maxlength: 60 },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    format: { type: String, enum: ['Self-paced', 'Live cohort', 'Workshop', 'Blended'], default: 'Self-paced' },
    level: { type: String, trim: true, default: 'All levels', maxlength: 40 },
    durationMins: { type: Number, min: 5, max: 10000, default: 60 },
    modules: { type: Number, min: 1, max: 100, default: 1 },
    instructor: { type: String, trim: true, default: '', maxlength: 120 },
    instructorTitle: { type: String, trim: true, default: '', maxlength: 120 },
    dueDate: { type: String, default: null, match: [/^(\d{4}-\d{2}-\d{2})?$/, 'dueDate must be YYYY-MM-DD.'] },
    mandatory: { type: Boolean, default: false },
    tone: { type: String, enum: ['neutral', 'navy', 'blue', 'green', 'amber', 'red', 'rose', 'slate', 'violet', 'teal'], default: 'blue' },
    enrolled: { type: [enrollmentSchema], default: [] },
  },
  { timestamps: true },
);

trainingSchema.index({ title: 1 });
trainingSchema.index({ 'enrolled.employee': 1 });

export const TrainingProgram = mongoose.model('TrainingProgram', trainingSchema);
export default TrainingProgram;
