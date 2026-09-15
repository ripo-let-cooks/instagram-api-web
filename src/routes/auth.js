const express = require('express');
const router = express.Router();
const db = require('../db');
const instagramService = require('../services/instagramService');

let currentSession = null;

router.get('/me', async (req, res) => {
  const profile = await instagramService.getProfile();
  if (instagramService.isRealMetaConnected()) {
    instagramService.syncRealInstagramMedia().catch(console.error);
  }
  return res.json({
    success: true,
    user: currentSession || profile,
    isRealMeta: instagramService.isRealMetaConnected()
  });
});

router.post('/login', async (req, res) => {
  const { mode, token, username } = req.body;

  if (mode === 'real' && token) {
    process.env.INSTAGRAM_ACCESS_TOKEN = token;
    const profile = await instagramService.getProfile();
    currentSession = profile;
    instagramService.syncRealInstagramMedia().catch(console.error);
    db.logActivity('AUTH', `User logged in using real Meta Token (@${profile.username})`);
    return res.json({ success: true, user: profile });
  }

  // Demo Login
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  const demoUser = db.getUser('demo_user_1');
  currentSession = {
    ...demoUser,
    is_demo: 1,
    mode_label: 'Simulator Engine'
  };
  db.logActivity('AUTH', `User logged in using Demo Account (@${demoUser.username})`);
  return res.json({ success: true, user: currentSession });
});

router.post('/logout', (req, res) => {
  const username = currentSession ? currentSession.username : 'user';
  currentSession = null;
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  db.logActivity('AUTH', `User @${username} logged out`);
  return res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
