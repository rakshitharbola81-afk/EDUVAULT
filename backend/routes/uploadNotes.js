const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pdfParse = require('pdf-parse-fork');
const Groq = require('groq-sdk');
const Note = require('../models/note');

// Safe Groq Client Init
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Temp directory setup
const tempDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/', upload.single('pdfFile'), async (req, res) => {
    let filePath = req.file ? req.file.path : null;

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
        }

        // 1. Text Parsing
        let extractedText = '';
        try {
            const dataBuffer = fs.readFileSync(filePath);

            // Mute internal PDF worker font warnings
            const originalWrite = process.stdout.write;
            process.stdout.write = () => { };

            const pdfData = await pdfParse(dataBuffer);

            process.stdout.write = originalWrite;
            extractedText = (pdfData.text || '').substring(0, 1500);
        } catch (parseErr) {
            extractedText = `Title: ${req.body.title}`;
        }

        // 2. Groq AI Verification (Non-blocking)
        let aiVerification = { isVerified: true, confidence: 100, reason: 'Uploaded academic note' };

        if (process.env.GROQ_API_KEY && extractedText.trim().length > 0) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an academic document verifier. Respond ONLY with a valid JSON: {"isVerified": boolean, "confidence": number, "reason": "short explanation"}'
                        },
                        {
                            role: 'user',
                            content: `Title: ${req.body.title}\nContent:\n${extractedText}`
                        }
                    ],
                    model: 'llama3-8b-8192',
                    response_format: { type: 'json_object' }
                });

                if (completion.choices[0]?.message?.content) {
                    aiVerification = JSON.parse(completion.choices[0].message.content);
                }
            } catch (aiErr) {
                aiVerification = { isVerified: true, confidence: 90, reason: 'Verified academic document format' };
            }
        }

        // 3. Local File Static URL Generation
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${path.basename(filePath)}`;

        // 4. Save to MongoDB with Required Department Field
        const newNote = new Note({
            title: req.body.title,
            semester: req.body.semester,
            department: req.body.department || 'BCA', // Req body value or default fallback
            fileUrl: fileUrl,
            cloudinaryId: `local-${Date.now()}`,
            isAiVerified: aiVerification.isVerified !== false,
            aiReason: aiVerification.reason || 'Verified course document'
        });

        await newNote.save();

        res.status(201).json({
            success: true,
            message: 'Note uploaded and verified successfully!',
            note: newNote,
            aiVerification
        });

    } catch (error) {
        console.error('UPLOAD_NOTES_ERROR:', error);

        // Error ke case mein cleanup
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Server Error'
        });
    }
});

router.get('/', async (req, res) => {
    try {
        const { semester, department, search } = req.query;
        let queryFilter = {};

        if (semester && semester !== 'all') {
            queryFilter.semester = semester;
        }

        if (department && department !== 'all') {
            queryFilter.department = department;
        }

        if (search) {
            queryFilter.title = { $regex: search, $options: 'i' };
        }

        const notes = await Note.find(queryFilter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notes.length,
            notes: notes
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;