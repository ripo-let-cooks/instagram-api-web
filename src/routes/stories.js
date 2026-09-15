const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const db = require('../db');
const instagramService = require('../services/instagramService');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `story_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get('/', (req, res) => {
  const stories = db.getStories();
  return res.json({ success: true, stories });
});

router.post('/', upload.single('media'), async (req, res, next) => {
  try {
    const { caption, userId } = req.body;
    let mediaUrl = req.body.mediaUrl;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    if (!mediaUrl) {
      mediaUrl = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80';
    }

    const story = await instagramService.publishStory({
      userId: userId || 'demo_user_1',
      mediaUrl,
      caption: caption || ''
    });

    return res.status(201).json({ success: true, story });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
