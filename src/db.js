const { sql } = require('@vercel/postgres');

async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255),
      avatar_url VARCHAR(255),
      access_token VARCHAR(255),
      is_demo INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      caption TEXT,
      media_type VARCHAR(50) DEFAULT 'IMAGE',
      media_url TEXT NOT NULL,
      permalink TEXT,
      like_count INTEGER DEFAULT 0,
      source VARCHAR(50) DEFAULT 'WEB',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stories (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_url TEXT NOT NULL,
      caption TEXT,
      expires_at TIMESTAMP,
      source VARCHAR(50) DEFAULT 'WEB',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(255) PRIMARY KEY,
      post_id VARCHAR(255) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      author_name VARCHAR(255) NOT NULL,
      author_avatar TEXT,
      content TEXT NOT NULL,
      source VARCHAR(50) DEFAULT 'WEB',
      synced_to_ig INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      event_type VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      payload_preview TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Seed default demo user
  const { rowCount } = await sql`SELECT id FROM users WHERE id = 'demo_user_1'`;
  if (rowCount === 0) {
    await sql`
      INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
      VALUES (
        'demo_user_1',
        'arief_developer',
        'Arief Developer (Tugas Mahasiswa)',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        'demo_token_insta_2026',
        1
      )
    `;
    await logActivity('AUTH', 'Seeded default demo user @arief_developer', null);
  }
}

function getDb() {
  return null;
}
async function closeDb() {
}

async function getUser(id) {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  return rows[0];
}

async function getUserByUsername(username) {
  const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
  return rows[0];
}

async function saveUser(user) {
  await sql`
    INSERT INTO users (id, username, full_name, avatar_url, access_token, is_demo)
    VALUES (${user.id}, ${user.username}, ${user.full_name}, ${user.avatar_url}, ${user.access_token}, ${user.is_demo ?? 1})
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      access_token = EXCLUDED.access_token,
      is_demo = EXCLUDED.is_demo
  `;
  return getUser(user.id);
}

async function getPosts() {
  const { rows: posts } = await sql`
    SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `;

  for (const post of posts) {
    post.comments = await getComments(post.id);
  }
  return posts;
}

async function getPost(id) {
  const { rows } = await sql`
    SELECT p.*, u.username, u.full_name, u.avatar_url as user_avatar
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ${id}
  `;
  const post = rows[0];
  if (post) {
    post.comments = await getComments(post.id);
  }
  return post;
}

async function createPost(post) {
  await sql`
    INSERT INTO posts (id, user_id, caption, media_type, media_url, permalink, like_count, source)
    VALUES (${post.id}, ${post.user_id}, ${post.caption ?? ''}, ${post.media_type ?? 'IMAGE'}, ${post.media_url}, ${post.permalink ?? null}, ${post.like_count ?? 0}, ${post.source ?? 'WEB'})
  `;
  return getPost(post.id);
}

async function likePost(id) {
  await sql`UPDATE posts SET like_count = like_count + 1 WHERE id = ${id}`;
  return getPost(id);
}

async function unlikePost(id) {
  await sql`UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ${id}`;
  return getPost(id);
}

async function deletePost(id) {
  await sql`DELETE FROM posts WHERE id = ${id}`;
  return true;
}

async function getStories() {
  const { rows } = await sql`
    SELECT s.*, u.username, u.avatar_url as user_avatar
    FROM stories s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `;
  return rows;
}

async function createStory(story) {
  const expiresAt = story.expires_at ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO stories (id, user_id, media_url, caption, expires_at, source)
    VALUES (${story.id}, ${story.user_id}, ${story.media_url}, ${story.caption ?? ''}, ${expiresAt}, ${story.source ?? 'WEB'})
  `;
  const { rows } = await sql`SELECT * FROM stories WHERE id = ${story.id}`;
  return rows[0];
}

async function deleteStory(id) {
  await sql`DELETE FROM stories WHERE id = ${id}`;
  return true;
}

async function getComments(postId) {
  const { rows } = await sql`
    SELECT * FROM comments
    WHERE post_id = ${postId}
    ORDER BY created_at ASC
  `;
  return rows;
}

async function addComment(comment) {
  await sql`
    INSERT INTO comments (id, post_id, author_name, author_avatar, content, source, synced_to_ig)
    VALUES (${comment.id}, ${comment.post_id}, ${comment.author_name}, ${comment.author_avatar ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}, ${comment.content}, ${comment.source ?? 'WEB'}, ${comment.synced_to_ig ?? 1})
  `;
  const { rows } = await sql`SELECT * FROM comments WHERE id = ${comment.id}`;
  return rows[0];
}

async function deleteComment(id) {
  await sql`DELETE FROM comments WHERE id = ${id}`;
  return true;
}

async function logActivity(eventType, description, payloadPreview = null) {
  await sql`
    INSERT INTO activity_logs (event_type, description, payload_preview)
    VALUES (${eventType}, ${description}, ${payloadPreview})
  `;
}

async function getLogs(limit = 50) {
  const { rows } = await sql`
    SELECT * FROM activity_logs
    ORDER BY id DESC
    LIMIT ${limit}
  `;
  return rows;
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
  createStory,
  deleteStory,
  getComments,
  addComment,
  deleteComment,
  logActivity,
  getLogs
};
