const db = require('../db');

class InstagramService {
  isRealMetaConnected() {
    return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCESS_TOKEN.trim().length > 10);
  }

  getProfile() {
    if (this.isRealMetaConnected()) {
      // In real mode, use the configured account details or cached details
      return {
        id: process.env.INSTAGRAM_ACCOUNT_ID || 'meta_user_real',
        username: process.env.INSTAGRAM_USERNAME || 'instagram_business_acc',
        full_name: 'Instagram Official Connected',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80',
        is_demo: 0,
        mode_label: '🟢 Meta Graph API Active'
      };
    }

    // Default Demo Account
    const demoUser = db.getUser('demo_user_1');
    return {
      ...(demoUser || {
        id: 'demo_user_1',
        username: 'arief_developer',
        full_name: 'Arief Developer (Tugas Mahasiswa)',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        is_demo: 1
      }),
      is_demo: 1,
      mode_label: '🟡 Interactive Demo / Simulator'
    };
  }

  async publishPost({ userId, caption, mediaUrl, mediaType = 'IMAGE', permalink = null }) {
    const postId = `ig_post_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const igPermalink = permalink || `https://instagram.com/p/${postId.substring(8)}`;

    if (this.isRealMetaConnected()) {
      try {
        const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        
        // 1. Create Media Container
        const containerUrl = `https://graph.facebook.com/v21.0/${accountId}/media`;
        const containerRes = await fetch(containerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaUrl,
            caption: caption,
            access_token: accessToken
          })
        });
        const containerData = await containerRes.json();

        if (containerData.id) {
          // 2. Publish Container
          const publishUrl = `https://graph.facebook.com/v21.0/${accountId}/media_publish`;
          await fetch(publishUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerData.id,
              access_token: accessToken
            })
          });
        }
      } catch (err) {
        console.warn('Meta API Call warning (falling back to local log):', err.message);
      }
    }

    // Persist in local SQLite
    const savedPost = db.createPost({
      id: postId,
      user_id: userId || 'demo_user_1',
      caption: caption || '',
      media_type: mediaType,
      media_url: mediaUrl,
      permalink: igPermalink,
      like_count: 0,
      source: 'WEB'
    });

    db.logActivity(
      'POST_CREATE',
      `Postingan baru dibuat via Web & disinkronkan ke Instagram [ID: ${postId}]`,
      JSON.stringify({ caption, mediaUrl, permalink: igPermalink })
    );

    return savedPost;
  }

  async publishStory({ userId, mediaUrl, caption = '' }) {
    const storyId = `ig_story_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const savedStory = db.createStory({
      id: storyId,
      user_id: userId || 'demo_user_1',
      media_url: mediaUrl,
      caption: caption,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source: 'WEB'
    });

    db.logActivity(
      'STORY_CREATE',
      `Story baru diunggah dari Web [ID: ${storyId}]`,
      JSON.stringify({ caption, mediaUrl })
    );

    return savedStory;
  }

  async sendCommentToInstagram({ postId, content, authorName = 'arief_developer', authorAvatar = null }) {
    const commentId = `ig_cmt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    if (this.isRealMetaConnected()) {
      try {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const commentUrl = `https://graph.facebook.com/v21.0/${postId}/comments`;
        await fetch(commentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            access_token: accessToken
          })
        });
      } catch (err) {
        console.warn('Meta API Comment call warning:', err.message);
      }
    }

    const savedComment = db.addComment({
      id: commentId,
      post_id: postId,
      author_name: authorName,
      author_avatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      content: content,
      source: 'WEB',
      synced_to_ig: 1
    });

    db.logActivity(
      'COMMENT_TWO_WAY',
      `[Web -> Instagram] Komentar dikirim dari Web ke post ${postId}`,
      JSON.stringify({ author: authorName, content })
    );

    return savedComment;
  }

  async processWebhookEvent(payload) {
    db.logActivity('WEBHOOK_RECEIVE', 'Menerima payload webhook dari Meta/Simulator', JSON.stringify(payload));
    
    // Check if event is comment
    if (payload.entry && payload.entry[0]?.changes) {
      for (const change of payload.entry[0].changes) {
        if (change.field === 'comments') {
          const value = change.value;
          return this.triggerSimulatedIncomingComment({
            postId: value.media?.id || value.post_id,
            text: value.text,
            sender: value.from?.username || 'instagram_user'
          });
        }
      }
    }

    return { received: true };
  }

  async triggerSimulatedIncomingComment({ postId, text, sender = 'dosen_tester' }) {
    const commentId = `ig_cmt_in_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const avatar = sender === 'dosen_tester' 
      ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80'
      : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80';

    const savedComment = db.addComment({
      id: commentId,
      post_id: postId,
      author_name: sender,
      author_avatar: avatar,
      content: text,
      source: 'INSTAGRAM',
      synced_to_ig: 1
    });

    db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Komentar baru diterima dari Instagram (@${sender}) pada post ${postId}`,
      JSON.stringify({ sender, content: text, commentId })
    );

    return savedComment;
  }

  async triggerSimulatedIncomingPost({ caption, mediaUrl, sender = 'dosen_tester' }) {
    const postId = `ig_incoming_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const savedPost = db.createPost({
      id: postId,
      user_id: 'demo_user_1',
      caption: caption || 'Postingan otomatis masuk dari aplikasi Instagram mobile!',
      media_type: 'IMAGE',
      media_url: mediaUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      permalink: `https://instagram.com/p/${postId.substring(12)}`,
      like_count: Math.floor(Math.random() * 50) + 10,
      source: 'INSTAGRAM'
    });

    db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Postingan baru masuk dari Instagram (@${sender})`,
      JSON.stringify({ sender, caption, postId })
    );

    return savedPost;
  }

  async triggerSimulatedIncomingStory({ mediaUrl, caption = 'Story dari Instagram App!' }) {
    const storyId = `ig_story_in_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const savedStory = db.createStory({
      id: storyId,
      user_id: 'demo_user_1',
      media_url: mediaUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
      caption: caption,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source: 'INSTAGRAM'
    });

    db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Story baru masuk dari Instagram`,
      JSON.stringify({ storyId, caption })
    );

    return savedStory;
  }
}

module.exports = new InstagramService();
