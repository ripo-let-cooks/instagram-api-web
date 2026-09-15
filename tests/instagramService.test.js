const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { initDb, closeDb, getPosts, getComments } = require('../src/db');
const instagramService = require('../src/services/instagramService');

let currentDbPath = '';

test.beforeEach(() => {
  currentDbPath = path.join(__dirname, `service_test_${Date.now()}.db`);
  initDb(currentDbPath);
});

test.afterEach(() => {
  closeDb();
  if (fs.existsSync(currentDbPath)) {
    try {
      fs.unlinkSync(currentDbPath);
    } catch (e) {}
  }
});

test('instagramService defaults to demo mode when no Meta token configured', () => {
  delete process.env.INSTAGRAM_ACCESS_TOKEN;
  assert.equal(instagramService.isRealMetaConnected(), false);
  const profile = instagramService.getProfile();
  assert.equal(profile.is_demo, 1);
  assert.equal(profile.username, 'arief_developer');
});

test('instagramService can publish post in demo mode and persist to DB', async () => {
  const post = await instagramService.publishPost({
    userId: 'demo_user_1',
    caption: 'Foto pemandangan tugas kuliah #API',
    mediaUrl: '/uploads/sample.jpg',
    mediaType: 'IMAGE'
  });

  assert.ok(post.id);
  assert.equal(post.caption, 'Foto pemandangan tugas kuliah #API');
  const posts = getPosts();
  assert.equal(posts.length, 1);
});

test('instagramService handles Web -> IG comment submission', async () => {
  const post = await instagramService.publishPost({
    userId: 'demo_user_1',
    caption: 'Post for comments',
    mediaUrl: '/uploads/sample.jpg',
    mediaType: 'IMAGE'
  });

  const comment = await instagramService.sendCommentToInstagram({
    postId: post.id,
    content: 'Komentar dikirim dari web!',
    authorName: 'arief_developer'
  });

  assert.ok(comment.id);
  assert.equal(comment.source, 'WEB');
  assert.equal(comment.synced_to_ig, 1);

  const comments = getComments(post.id);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].content, 'Komentar dikirim dari web!');
});

test('instagramService handles IG -> Web simulated incoming comment', async () => {
  const post = await instagramService.publishPost({
    userId: 'demo_user_1',
    caption: 'Post for webhook test',
    mediaUrl: '/uploads/sample.jpg',
    mediaType: 'IMAGE'
  });

  const comment = await instagramService.triggerSimulatedIncomingComment({
    postId: post.id,
    text: 'Halo dari Instagram App! (Simulasi Dosen)',
    sender: 'dosen_tester'
  });

  assert.equal(comment.source, 'INSTAGRAM');
  assert.equal(comment.author_name, 'dosen_tester');

  const comments = getComments(post.id);
  assert.equal(comments.length, 1);
  assert.equal(comments[0].source, 'INSTAGRAM');
});
