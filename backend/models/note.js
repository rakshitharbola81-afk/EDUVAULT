const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, index: true },
    semester: { type: String, required: true, index: true },
    description: { type: String, trim: true },
    author: { type: String, required: true, default: "Anonymous Student" },
    fileUrl: { type: String, required: true },
    aiVerificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Flagged'],
        default: 'Pending'
    },
    aiSummary: { type: String, default: "" },
    downloadsCount: { type: Number, default: 0 }
}, { timestamps: true });
noteSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Note', noteSchema);