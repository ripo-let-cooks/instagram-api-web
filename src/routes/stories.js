const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const db = require('../db');
const instagramService = require('../services/instagramService');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
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
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      mediaUrl = `data:${mimeType};base64,${base64Image}`;
    }

    if (!mediaUrl) {
      mediaUrl = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80';
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const appBaseUrl = `${protocol}://${host}`;

    const story = await instagramService.publishStory({
      userId: userId || 'demo_user_1',
      mediaUrl,
      caption: caption || '',
      appBaseUrl
    });

    return res.status(201).json({ success: true, story });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res) => {
  const ok = await db.deleteStory(req.params.id);
  if (ok) {
    await db.logActivity('STORY_DELETE', `Deleted story ${req.params.id}`);
  }
  return res.json({ success: ok });
});

module.exports = router;
