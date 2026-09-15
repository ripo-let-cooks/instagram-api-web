const express = require('express');
const router = express.Router();
const db = require('../db');
const instagramService = require('../services/instagramService');

// Trigger simulated events from IG side
router.post('/trigger', async (req, res, next) => {
  try {
    const { action, postId, text, sender, caption, mediaUrl } = req.body;

    if (action === 'incoming_comment') {
      if (!postId) {
        return res.status(400).json({ success: false, error: 'postId diperlukan untuk simulasi komentar' });
      }
      const comment = await instagramService.triggerSimulatedIncomingComment({
        postId,
        text: text || 'Keren banget tugas integrasi API Instagram ini! 👍 (Simulasi IG Mobile)',
        sender: sender || 'dosen_tester'
      });
      return res.json({ success: true, comment, message: `Simulasi komentar dari @${sender || 'dosen_tester'} berhasil!` });
    }

    if (action === 'incoming_post') {
      const post = await instagramService.triggerSimulatedIncomingPost({
        caption: caption || 'Postingan otomatis disinkronkan dari aplikasi Instagram Mobile!',
        mediaUrl,
        sender: sender || 'instagram_user'
      });
      return res.json({ success: true, post, message: 'Simulasi postingan dari Instagram berhasil masuk ke Web!' });
    }

    if (action === 'incoming_story') {
      const story = await instagramService.triggerSimulatedIncomingStory({
        mediaUrl,
        caption: caption || 'Story baru dari aplikasi Instagram!'
      });
      return res.json({ success: true, story, message: 'Simulasi story dari Instagram berhasil masuk!' });
    }

    return res.status(400).json({ success: false, error: `Action '${action}' tidak dikenali` });
  } catch (err) {
    next(err);
  }
});

// Activity logs for the Terminal Log Console
router.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const logs = db.getLogs(limit);
  return res.json({ success: true, logs });
});

module.exports = router;
