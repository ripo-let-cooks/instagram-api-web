const express = require('express');
const router = express.Router();
const db = require('../db');

// Serve media from database for Meta Graph API
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    // Check posts first
    let record = await db.getPost(id);
    // If not found in posts, check stories
    if (!record) {
      const stories = await db.getStories();
      record = stories.find(s => s.id === id);
    }

    if (!record || !record.media_url || !record.media_url.startsWith('data:')) {
      return res.status(404).send('Media not found or not a base64 image');
    }

    const mediaUrl = record.media_url;
    const [prefix, base64Data] = mediaUrl.split(',');
    const mimeMatch = prefix.match(/:(.*?);/);
    
    if (!mimeMatch || !base64Data) {
      return res.status(400).send('Invalid media format');
    }

    const mime = mimeMatch[1];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(buffer);
  } catch (err) {
    console.error('Error serving media:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
