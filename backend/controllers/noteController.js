const Note = require('../models/note');
const fs = require('fs');
const { analyzeNoteWithAI } = require('../services/aiServices');

// CREATE / UPLOAD NOTE
exports.createNote = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "PDF file is required." });
        }

        const { title, department, semester, description } = req.body;

        if (!title || !department || !semester) {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Title, department, and semester are required." });
        }

        const filePath = req.file.path;

        // Run Groq AI Analysis
        const aiResult = await analyzeNoteWithAI(filePath);

        let status = 'Pending';
        if (aiResult.isAcademic) {
            status = 'Verified';
        } else {
            status = 'Flagged';
        }

        const note = new Note({
            title,
            department,
            semester,
            description,
            author: req.user?.name || "Anonymous Student",
            fileUrl: filePath,
            aiVerificationStatus: status,
            aiSummary: aiResult.summary || "No summary available."
        });

        await note.save();

        return res.status(201).json({
            message: status === 'Verified'
                ? "Note uploaded and verified successfully by Groq AI!"
                : "Note uploaded but flagged as non-academic content by AI.",
            note
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error("Create Note Controller Error:", error);
        return res.status(500).json({ message: "Server Error during note upload", error: error.message });
    }
};

// GET ALL NOTES
exports.getAllNotes = async (req, res) => {
    try {
        const notes = await Note.find().sort({ createdAt: -1 });
        res.status(200).json(notes);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notes", error: error.message });
    }
};

// DELETE NOTE
exports.deleteNote = async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ message: "Note not found." });
        }

        if (fs.existsSync(note.fileUrl)) {
            fs.unlinkSync(note.fileUrl);
        }

        await Note.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Note deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting note", error: error.message });
    }
};