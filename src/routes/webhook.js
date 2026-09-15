const express = require('express');
const router = express.Router();
const db = require('../db');
const instagramService = require('../services/instagramService');

// Verification endpoint for Meta Graph API Webhooks
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'instabridge_secret_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    db.logActivity('WEBHOOK_CHALLENGE', 'Meta Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  return res.status(403).send('Forbidden: Token mismatch');
});

// Incoming webhook receiver from Meta
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    await instagramService.processWebhookEvent(payload);
    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).send('Internal Error');
  }
});

module.exports = router;
