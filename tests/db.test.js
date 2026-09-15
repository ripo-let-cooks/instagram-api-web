const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initDb, closeDb, getUser, saveUser, getPosts, createPost, likePost, getStories, createStory, getComments, addComment, logActivity, getLogs } = require('../src/db');

let testCounter = 0;
let currentDbPath = '';

test.beforeEach(() => {
  testCounter++;
  currentDbPath = path.join(__dirname, `test_${Date.now()}_${testCounter}.db`);
  initDb(currentDbPath);
});

test.afterEach(() => {
  closeDb();
  if (fs.existsSync(currentDbPath)) {
    try {
      fs.unlinkSync(currentDbPath);
    } catch (e) {
      // Ignore cleanup error on windows
    }
  }
});

test('Database initializes and seeds default demo user', () => {
  const user = getUser('demo_user_1');
  assert.ok(user, 'Default user should exist');
  assert.equal(user.username, 'arief_developer');
  assert.equal(user.is_demo, 1);
});

test('Can create and retrieve posts with likes', () => {
  const post = createPost({
    id: 'post_test_1',
    user_id: 'demo_user_1',
    caption: 'Testing post caption #academic',
    media_type: 'IMAGE',
    media_url: '/uploads/sample.jpg',
    permalink: 'https://instagram.com/p/test1',
    source: 'WEB'
  });
  assert.equal(post.id, 'post_test_1');

  likePost('post_test_1');
  const posts = getPosts();
  assert.equal(posts.length, 1);
  assert.equal(posts[0].like_count, 1);
  assert.equal(posts[0].caption, 'Testing post caption #academic');
});

test('Can create and retrieve comments with source tag (two-way sync)', () => {
  createPost({
    id: 'post_test_2',
    user_id: 'demo_user_1',
    caption: 'Comment test post',
    media_type: 'IMAGE',
    media_url: '/uploads/sample2.jpg',
    permalink: null,
    source: 'WEB'
  });

  // Komentar dari Web
  addComment({
    id: 'comment_1',
    post_id: 'post_test_2',
    author_name: 'arief_developer',
    author_avatar: 'https://picsum.photos/seed/arief/100/100',
    content: 'Komentar via antarmuka web!',
    source: 'WEB',
    synced_to_ig: 1
  });

  // Komentar dari Instagram
  addComment({
    id: 'comment_2',
    post_id: 'post_test_2',
    author_name: 'dosen_tester',
    author_avatar: 'https://picsum.photos/seed/dosen/100/100',
    content: 'Komentar dari aplikasi Instagram!',
    source: 'INSTAGRAM',
    synced_to_ig: 1
  });

  const comments = getComments('post_test_2');
  assert.equal(comments.length, 2);
  assert.equal(comments[0].source, 'WEB');
  assert.equal(comments[1].source, 'INSTAGRAM');
});

test('Can log and retrieve activities for lecturer console', () => {
  logActivity('WEBHOOK_RECEIVE', 'Received simulated IG comment', JSON.stringify({ author: 'dosen_tester' }));
  const logs = getLogs(5);
  assert.ok(logs.length > 0);
  assert.equal(logs[0].event_type, 'WEBHOOK_RECEIVE');
});
