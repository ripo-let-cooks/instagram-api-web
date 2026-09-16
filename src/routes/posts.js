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
  const posts = await db.getPosts();
  return res.json({ success: true, posts });
});

router.get('/:id', async (req, res) => {
  const post = await db.getPost(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post tidak ditemukan' });
  }
  return res.json({ success: true, post });
});

router.post('/', upload.single('media'), async (req, res, next) => {
  try {
    const { caption, userId } = req.body;
    let mediaUrl = req.body.mediaUrl;

    if (req.file) {
      // Convert file buffer to Base64 URL so it can be saved directly in the database without local files
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      mediaUrl = `data:${mimeType};base64,${base64Image}`;
    }

    if (!mediaUrl) {
      mediaUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    }

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const appBaseUrl = `${protocol}://${host}`;

    const post = await instagramService.publishPost({
      userId: userId || 'demo_user_1',
      caption: caption || '',
      mediaUrl,
      mediaType: mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE',
      appBaseUrl
    });

    return res.status(201).json({ success: true, post });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/like', async (req, res) => {
  const post = await db.likePost(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post tidak ditemukan' });
  }
  await db.logActivity('LIKE', `Liked post ${req.params.id}`, JSON.stringify({ likes: post.like_count }));
  return res.json({ success: true, post });
});

router.post('/:id/unlike', async (req, res) => {
  const post = await db.unlikePost(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, error: 'Post tidak ditemukan' });
  }
  await db.logActivity('UNLIKE', `Unliked post ${req.params.id}`, JSON.stringify({ likes: post.like_count }));
  return res.json({ success: true, post });
});

router.delete('/:id', async (req, res) => {
  const ok = await db.deletePost(req.params.id);
  await db.logActivity('POST_DELETE', `Deleted post ${req.params.id}`);
  return res.json({ success: ok });
});

module.exports = router;
