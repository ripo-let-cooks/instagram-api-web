const express = require('express');
const router = express.Router();
const instagramService = require('../services/instagramService');

router.post('/', async (req, res) => {
  try {
    if (instagramService.isRealMetaConnected()) {
      await instagramService.syncRealInstagramMedia();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
