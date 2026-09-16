const { createClient } = require('@libsql/client');
const path = require('node:path');
const fs = require('node:fs');

let dbInstance = null;

async function initDb() {
  const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, '..', 'database.sqlite')}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // Initialize LibSQL client (Turso Cloud OR Local File)
  dbInstance = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  // Enable foreign keys and create tables
  await dbInstance.execute(`PRAGMA foreign_keys = ON;`);

  await dbInstance.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      access_token TEXT,
      is_demo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS posts (
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
    );`,
    `CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_url TEXT NOT NULL,
      caption TEXT,
      expires_at DATETIME,
      source TEXT DEFAULT 'WEB',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      source TEXT DEFAULT 'WEB',
      synced_to_ig INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      payload_preview TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ], "write");

  // Seed default demo user if not exists
  const existingUser = await dbInstance.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: ['demo_user_1']
  });

  if (existingUser.rows.length === 0) {
    await dbInstance.execute({
      sql: `INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        'demo_user_1',
        'arief_developer',
        'Arief Developer (Tugas Mahasiswa)',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        'demo_token_insta_2026',
        1
      ]
    });
    await logActivity('AUTH', 'Seeded default demo user @arief_developer', null);
  }

  return dbInstance;
}

async function getDb() {
  if (!dbInstance) {
    return await initDb();
  }
  return dbInstance;
}

async function getUser(id) {
  const db = await getDb();
  const res = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return res.rows[0];
}

async function getUserByUsername(username) {
  const db = await getDb();
  const res = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
  return res.rows[0];
}

async function saveUser(user) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        access_token = excluded.access_token,
        is_demo = excluded.is_demo
    `,
    args: [user.id, user.username, user.full_name, user.avatar_url, user.access_token, user.is_demo ?? 1]
  });
  return await getUser(user.id);
}

async function getPosts() {
  const db = await getDb();
  const res = await db.execute(`
    SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `);
  
  const posts = res.rows;
  // Attach comments to each post
  for (let i = 0; i < posts.length; i++) {
    posts[i].comments = await getComments(posts[i].id);
  }
  return posts;
}

async function getPost(id) {
  const db = await getDb();
  const res = await db.execute({
    sql: `
      SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `,
    args: [id]
  });
  
  const post = res.rows[0];
  if (post) {
    post.comments = await getComments(post.id);
  }
  return post;
}

async function createPost(post) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO posts (id, user_id, caption, media_type, media_url, permalink, like_count, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      post.id,
      post.user_id,
      post.caption ?? '',
      post.media_type ?? 'IMAGE',
      post.media_url,
      post.permalink ?? null,
      post.like_count ?? 0,
      post.source ?? 'WEB'
    ]
  });
  return await getPost(post.id);
}

async function likePost(id) {
  const db = await getDb();
  await db.execute({ sql: 'UPDATE posts SET like_count = like_count + 1 WHERE id = ?', args: [id] });
  return await getPost(id);
}

async function unlikePost(id) {
  const db = await getDb();
  await db.execute({ sql: 'UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id = ?', args: [id] });
  return await getPost(id);
}

async function deletePost(id) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM posts WHERE id = ?', args: [id] });
  return true;
}

async function getStories() {
  const db = await getDb();
  const res = await db.execute(`
    SELECT s.*, u.username, u.avatar_url as user_avatar
    FROM stories s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `);
  return res.rows;
}

async function getStoriesByUser(userId) {
  const db = await getDb();
  const res = await db.execute({
    sql: `
      SELECT s.*, u.username, u.avatar_url as user_avatar
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `,
    args: [userId]
  });
  return res.rows;
}

async function createStory(story) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO stories (id, user_id, media_url, caption, expires_at, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      story.id,
      story.user_id,
      story.media_url,
      story.caption ?? '',
      story.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      story.source ?? 'WEB'
    ]
  });
  const res = await db.execute({ sql: 'SELECT * FROM stories WHERE id = ?', args: [story.id] });
  return res.rows[0];
}

async function deleteStory(id) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM stories WHERE id = ?', args: [id] });
  return true;
}

async function getComments(postId) {
  const db = await getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM comments
      WHERE post_id = ?
      ORDER BY created_at ASC
    `,
    args: [postId]
  });
  return res.rows;
}

async function addComment(comment) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO comments (id, post_id, author_name, author_avatar, content, source, synced_to_ig)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      comment.id,
      comment.post_id,
      comment.author_name,
      comment.author_avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      comment.content,
      comment.source ?? 'WEB',
      comment.synced_to_ig ?? 1
    ]
  });
  const res = await db.execute({ sql: 'SELECT * FROM comments WHERE id = ?', args: [comment.id] });
  return res.rows[0];
}

async function deleteComment(id) {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM comments WHERE id = ?', args: [id] });
  return true;
}

async function logActivity(eventType, description, payloadPreview = null) {
  const db = await getDb();
  await db.execute({
    sql: `
      INSERT INTO activity_logs (event_type, description, payload_preview)
      VALUES (?, ?, ?)
    `,
    args: [eventType, description, payloadPreview]
  });
}

async function getLogs(limit = 50) {
  const db = await getDb();
  const res = await db.execute({
    sql: `
      SELECT * FROM activity_logs
      ORDER BY id DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return res.rows;
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
  unlikePost,
  deletePost,
  getStories,
  getStoriesByUser,
  createStory,
  deleteStory,
  getComments,
  addComment,
  deleteComment,
  logActivity,
  getLogs
};
