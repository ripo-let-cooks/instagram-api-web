require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const db = require('./db');

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const storiesRouter = require('./routes/stories');
const commentsRouter = require('./routes/comments');
const webhookRouter = require('./routes/webhook');
const simulatorRouter = require('./routes/simulator');

function createApp() {
  const app = express();

  // Initialize DB on cold start
  db.initDb().catch(err => console.error('DB Init Error:', err));

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static Assets
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/posts/:id/comments', commentsRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/webhook', webhookRouter);
  app.use('/api/simulator', simulatorRouter);
  app.use('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    return res.json({ success: true, logs: db.getLogs(limit) });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  });

  return app;
}

if (require.main === module) {
  db.initDb();
  const app = createApp();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 InstaBridge Server is running at http://localhost:${PORT}`);
    console.log(`📱 Mode: ${process.env.INSTAGRAM_ACCESS_TOKEN ? 'Meta Graph API Real' : 'Interactive Demo Simulator'}`);
  });
}

module.exports = { createApp };
