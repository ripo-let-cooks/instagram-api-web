const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const { initDb, closeDb } = require('../src/db');
const { createApp } = require('../src/server');

const TEST_PORT = 3999;
const BASE_URL = `http://localhost:${TEST_PORT}`;
let server;
let currentDbPath = '';

test.before(async () => {
  currentDbPath = path.join(__dirname, `api_test_${Date.now()}.db`);
  initDb(currentDbPath);
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => resolve());
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
  closeDb();
  if (fs.existsSync(currentDbPath)) {
    try {
      fs.unlinkSync(currentDbPath);
    } catch (e) {}
  }
});

test('GET /api/auth/me returns active user and mode status', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/me`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.user.username);
  assert.notEqual(data.isRealMeta, undefined);
});

test('POST /api/posts creates a post and GET /api/posts retrieves it', async () => {
  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption: 'Testing post through API endpoint',
      mediaUrl: 'https://picsum.photos/seed/test/600/600'
    })
  });
  assert.equal(postRes.status, 201);
  const postData = await postRes.json();
  assert.ok(postData.post.id);

  const getRes = await fetch(`${BASE_URL}/api/posts`);
  assert.equal(getRes.status, 200);
  const feedData = await getRes.json();
  assert.ok(feedData.posts.length >= 1);
});

test('Two-Way Comments: Web -> IG and IG -> Web', async () => {
  // 1. Create a post first
  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption: 'Post for comment testing',
      mediaUrl: 'https://picsum.photos/seed/cmt/600/600'
    })
  });
  const { post } = await postRes.json();

  // 2. Arah 1: Post comment from Web
  const webCommentRes = await fetch(`${BASE_URL}/api/posts/${post.id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Halo ini komentar dari browser Web!'
    })
  });
  assert.equal(webCommentRes.status, 201);
  const webCommentData = await webCommentRes.json();
  assert.equal(webCommentData.comment.source, 'WEB');

  // 3. Arah 2: Simulate incoming comment from Instagram
  const simCommentRes = await fetch(`${BASE_URL}/api/simulator/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'incoming_comment',
      postId: post.id,
      text: 'Halo ini balasan komentar dari aplikasi IG mobile!',
      sender: 'dosen_penguji'
    })
  });
  assert.equal(simCommentRes.status, 200);
  const simData = await simCommentRes.json();
  assert.equal(simData.comment.source, 'INSTAGRAM');
  assert.equal(simData.comment.author_name, 'dosen_penguji');

  // 4. Verify comments list has both
  const getCommentsRes = await fetch(`${BASE_URL}/api/posts/${post.id}/comments`);
  const commentsData = await getCommentsRes.json();
  assert.equal(commentsData.comments.length, 2);
  assert.equal(commentsData.comments[0].source, 'WEB');
  assert.equal(commentsData.comments[1].source, 'INSTAGRAM');
});

test('GET /api/webhook verifies challenge', async () => {
  process.env.WEBHOOK_VERIFY_TOKEN = 'instabridge_secret_2026';
  const url = `${BASE_URL}/api/webhook?hub.mode=subscribe&hub.verify_token=instabridge_secret_2026&hub.challenge=1158201207`;
  const res = await fetch(url);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(text, '1158201207');
});
