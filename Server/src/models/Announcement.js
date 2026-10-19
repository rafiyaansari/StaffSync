import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Give the announcement a title.'], trim: true, maxlength: 160 },
    category: { type: String, trim: true, default: 'Company', maxlength: 40 },
    body: { type: String, trim: true, default: '', maxlength: 8000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    authorName: { type: String, trim: true, default: '' },
    authorRole: { type: String, trim: true, default: 'HR' },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD.'] },
    pinned: { type: Boolean, default: false },
    audience: { type: String, enum: ['Everyone', 'Managers', 'HR only'], default: 'Everyone' },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    tone: { type: String, enum: ['neutral', 'navy', 'blue', 'green', 'amber', 'red', 'rose', 'slate', 'violet', 'teal'], default: 'blue' },
  },
  { timestamps: true },
);

announcementSchema.index({ pinned: -1, date: -1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;
