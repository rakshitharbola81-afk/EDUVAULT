const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const noteController = require('../controllers/noteController');

router.get('/', noteController.getAllNotes);
router.post('/upload',verifyToken, upload.single('pdf'), noteController.createNote);
router.delete('/:id',verifyToken, authorizeRoles('admin'), noteController.deleteNote);

module.exports = router;