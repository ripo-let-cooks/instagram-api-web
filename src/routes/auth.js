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
    try {
      process.env.INSTAGRAM_ACCESS_TOKEN = token;
      const profile = await instagramService.getProfile();
      currentSession = profile;
      instagramService.syncRealInstagramMedia().catch(console.error);
      await db.logActivity('AUTH', `User logged in using real Meta Token (@${profile.username})`);
      return res.json({ success: true, user: profile });
    } catch (err) {
      console.error('Login error:', err);
      return res.json({ success: false, error: 'Token Meta Graph API tidak valid' });
    }
  }

  // Demo Login
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  const demoUser = await db.getUser('demo_user_1');
  currentSession = {
    ...demoUser,
    is_demo: 1,
    mode_label: 'Simulator Engine'
  };
  await db.logActivity('AUTH', `User logged in using Demo Account (@${demoUser.username})`);
  return res.json({ success: true, user: currentSession });
});

router.post('/logout', async (req, res) => {
  const username = currentSession ? currentSession.username : 'user';
  currentSession = null;
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  await db.logActivity('AUTH', `User @${username} logged out`);
  return res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
