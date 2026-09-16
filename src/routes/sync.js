const express = require('express');
const router = express.Router();
const instagramService = require('../services/instagramService');

router.post('/', async (req, res) => {
  try {
    if (instagramService.isRealMetaConnected()) {
      const profile = await instagramService.getProfile();
      if (profile && profile.id) {
        // Fix retroactive error
        await require('../db').getDb().execute({
          sql: 'UPDATE posts SET user_id = ? WHERE user_id = ? AND source = ?',
          args: [profile.id, 'demo_user_1', 'INSTAGRAM']
        });
      }
      await instagramService.syncRealInstagramMedia();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
