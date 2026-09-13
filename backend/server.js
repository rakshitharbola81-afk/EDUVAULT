const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken'); // Or jsonwebtoken
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eduvault')
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Schemas
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['student', 'admin'], default: 'student' }
});

const noteSchema = new mongoose.Schema({
    title: String,
    semester: String,
    department: String,
    fileUrl: String,
    uploadedBy: String,
    isAiVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

// Auth Middlewares
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization || req.query.token;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized Access' });
    try {
        const decoded = jwt.decode(token, process.env.JWT_SECRET || 'SECRET_KEY');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid Token' });
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'admin') next();
        else res.status(403).json({ success: false, message: 'Admin access required' });
    });
};

// ==========================================
// 1. MULTI-PAGE HTML NAVIGATION ROUTES
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'views', 'signup.html')));
app.get('/student-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student-dashboard.html')));
app.get('/admin-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html')));

// ==========================================
// 2. WIRED BACKEND API ENDPOINTS
// ==========================================

// SIGNUP API
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

        const newUser = new User({ name, email, password, role: 'student' });
        await newUser.save();
        res.status(201).json({ success: true, message: 'Signup successful!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// LOGIN API (Student & Admin Validation)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role, adminKey } = req.body;

        if (role === 'admin') {
            if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'admin123')) {
                return res.status(403).json({ success: false, message: 'Invalid Admin Key' });
            }
        }

        const user = await User.findOne({ email, password, role });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials or role mismatch' });

        const token = jwt.encode({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET || 'SECRET_KEY');
        res.json({ success: true, token, role: user.role, name: user.name });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET NOTES API (Filtering support)
app.get('/api/notes', async (req, res) => {
    try {
        const { semester } = req.query;
        let filter = {};
        if (semester && semester !== 'all') filter.semester = semester;

        const notes = await Note.find(filter).sort({ createdAt: -1 });
        res.json({ success: true, notes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// UPLOAD NOTE + GROQ AI MOCK CHECK API
app.post('/api/notes/upload', verifyToken, upload.single('pdfFile'), async (req, res) => {
    try {
        const { title, semester, department } = req.body;

        // Simulate Groq AI content analysis check on PDF
        const isAiVerified = title.toLowerCase().includes('notes') || req.file.size > 1000;

        const newNote = new Note({
            title,
            semester,
            department: department || 'BCA',
            fileUrl: `/uploads/${req.file.filename}`,
            uploadedBy: req.user.name,
            isAiVerified
        });

        await newNote.save();
        res.status(201).json({ success: true, note: newNote });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE NOTE API (Strictly Admin Access)
app.delete('/api/notes/:id', verifyAdmin, async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Note deleted by Admin' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));