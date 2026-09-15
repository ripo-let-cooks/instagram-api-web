const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'database.sqlite');
let dbInstance = null;

function initDb(dbPath = DEFAULT_DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new DatabaseSync(dbPath);

  // Enable foreign keys and create tables
  dbInstance.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      is_demo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      caption TEXT,
      media_type TEXT DEFAULT 'IMAGE',
      media_url TEXT NOT NULL,
      permalink TEXT,
      like_count INTEGER DEFAULT 0,
      source TEXT DEFAULT 'WEB',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      caption TEXT,
      expires_at DATETIME,
      source TEXT DEFAULT 'WEB',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'WEB',
      synced_to_ig INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      payload_preview TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default demo user if not exists
  const existingUser = dbInstance.prepare('SELECT id FROM users WHERE id = ?').get('demo_user_1');
  if (!existingUser) {
    dbInstance.prepare(`
      INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'demo_user_1',
      'arief_developer',
      'Arief Developer (Tugas Mahasiswa)',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      'demo_token_insta_2026',
      1
    );

    logActivity('AUTH', 'Seeded default demo user @arief_developer', null);
  }

  return dbInstance;
}

function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

function getUser(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function getUserByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function saveUser(user) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      full_name = excluded.full_name,
      avatar_url = excluded.avatar_url,
      access_token = excluded.access_token,
      is_demo = excluded.is_demo
  `);
  stmt.run(user.id, user.username, user.full_name, user.avatar_url, user.access_token, user.is_demo ?? 1);
  return getUser(user.id);
}

function getPosts() {
  const db = getDb();
  const posts = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `).all();

  // Attach comments to each post
  for (const post of posts) {
    post.comments = getComments(post.id);
  }
  return posts;
}

function getPost(id) {
  const db = getDb();
  const post = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).get(id);

  if (post) {
    post.comments = getComments(post.id);
  }
  return post;
}

function createPost(post) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO posts (id, user_id, caption, media_type, media_url, permalink, like_count, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    post.id,
    post.user_id,
    post.caption ?? '',
    post.media_type ?? 'IMAGE',
    post.media_url,
    post.permalink ?? null,
    post.like_count ?? 0,
    post.source ?? 'WEB'
  );
  return getPost(post.id);
}

function likePost(id) {
  const db = getDb();
  db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id = ?').run(id);
  return getPost(id);
}

function deletePost(id) {
  const db = getDb();
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
  return true;
}

function getStories() {
  const db = getDb();
  return db.prepare(`
    SELECT s.*, u.username, u.avatar_url as user_avatar
    FROM stories s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();
}

function createStory(story) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO stories (id, user_id, media_url, caption, expires_at, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    story.id,
    story.user_id,
    story.media_url,
    story.caption ?? '',
    story.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    story.source ?? 'WEB'
  );
  return db.prepare('SELECT * FROM stories WHERE id = ?').get(story.id);
}

function getComments(postId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM comments
    WHERE post_id = ?
    ORDER BY created_at ASC
  `).all(postId);
}


function addComment(comment) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO comments (id, post_id, author_name, author_avatar, content, source, synced_to_ig)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    comment.id,
    comment.post_id,
    comment.author_name,
    comment.author_avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
    comment.content,
    comment.source ?? 'WEB',
    comment.synced_to_ig ?? 1
  );
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(comment.id);
}

function logActivity(eventType, description, payloadPreview = null) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO activity_logs (event_type, description, payload_preview)
    VALUES (?, ?, ?)
  `);
  stmt.run(eventType, description, payloadPreview);
}

function getLogs(limit = 50) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM activity_logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
}

function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

module.exports = {
  initDb,
  getDb,
  closeDb,
  getUser,
  getUserByUsername,
  saveUser,
  getPosts,
  getPost,
  createPost,
  likePost,
  deletePost,
  getStories,
  createStory,
  getComments,
  addComment,
  logActivity,
  getLogs
};

