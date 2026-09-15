const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const instagramService = require('../services/instagramService');

// Mounted at /api/posts/:id/comments or /api/comments
router.get('/', (req, res) => {
  const postId = req.params.id;
  const comments = db.getComments(postId);
  return res.json({ success: true, comments });
});

router.post('/', async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { content, authorName, authorAvatar } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Komentar tidak boleh kosong' });
    }

    if (content.length > 500) {
      return res.status(400).json({ success: false, error: 'Komentar maksimal 500 karakter' });
    }

    const comment = await instagramService.sendCommentToInstagram({
      postId,
      content: content.trim(),
      authorName: authorName || 'arief_developer',
      authorAvatar: authorAvatar || null
    });

    return res.status(201).json({ success: true, comment });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
