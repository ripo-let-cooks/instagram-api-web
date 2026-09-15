const express = require('express');
const router = express.Router();
const multer = require('multer');
const { put } = require('@vercel/blob');
const path = require('node:path');
const db = require('../db');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp4/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) || allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung. Harap upload gambar JPEG/PNG/WEBP/MP4.'));
    }
  }
});

router.get('/', async (req, res) => {
  const stories = await db.getStories();
  return res.json({ success: true, stories });
});

router.post('/', upload.single('media'), async (req, res, next) => {
  try {
    const { caption, userId } = req.body;
    let mediaUrl = req.body.mediaUrl;

    if (req.file) {
      const blob = await put(req.file.originalname, req.file.buffer, {
        access: 'public',
      });
      mediaUrl = blob.url;
    }

    if (!mediaUrl) {
      return res.status(400).json({ success: false, error: 'Media URL atau file wajib diisi' });
    }

    const story = await db.createStory({
      id: `story_${Date.now()}`,
      user_id: userId || 'demo_user_1',
      caption: caption || '',
      media_url: mediaUrl,
      source: 'WEB'
    });

    await db.logActivity('STORY_CREATE', `Created new story via Web`, JSON.stringify(story));
    return res.status(201).json({ success: true, story });
  } catch (err) {
    console.error('Story upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await db.deleteStory(req.params.id);
  await db.logActivity('STORY_DELETE', `Deleted story ${req.params.id}`);
  return res.json({ success: ok });
});

module.exports = router;
