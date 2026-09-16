const db = require('../db');

class InstagramService {
  isRealMetaConnected() {
    return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCESS_TOKEN.trim().length > 10);
  }

  getBaseUrl() {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    if (token.startsWith('IGAA')) {
      return 'https://graph.instagram.com/v21.0';
    }
    return 'https://graph.facebook.com/v21.0';
  }

  async getProfile() {
    if (this.isRealMetaConnected()) {
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      try {
        const res = await fetch(`${this.getBaseUrl()}/me?fields=id,username,name,profile_picture_url&access_token=${token}`);
        const data = await res.json();
        if (data.id) {
          const userObj = {
            id: data.id,
            username: data.username || 'ariepoww',
            full_name: data.name || 'Arief Maulana',
            avatar_url: data.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
            access_token: token,
            is_demo: 0,
            mode_label: 'Meta Graph API Real'
          };
          await db.saveUser(userObj);
          return userObj;
        }
      } catch (err) {
        console.warn('Error fetching live Meta profile, using cached fallback:', err.message);
      }

      // Cached or environment fallback
      return {
        id: process.env.INSTAGRAM_ACCOUNT_ID || '28290161537307082',
        username: process.env.INSTAGRAM_USERNAME || 'ariepoww',
        full_name: 'Arief Maulana',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        is_demo: 0,
        mode_label: 'Meta Graph API Real'
      };
    }

    // Default Demo Account
    const demoUser = await db.getUser('demo_user_1');
    return {
      ...(demoUser || {
        id: 'demo_user_1',
        username: 'arief_developer',
        full_name: 'Arief Developer (Tugas Mahasiswa)',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        is_demo: 1
      }),
      is_demo: 1,
      mode_label: 'Simulator Engine'
    };
  }

  async syncRealInstagramMedia() {
    if (!this.isRealMetaConnected()) return [];

    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_ACCOUNT_ID || 'me';
    
    try {
      const profile = await this.getProfile();
      const resolvedUserId = profile.id;

      // 1. Sync Feed Media
      const res = await fetch(`${this.getBaseUrl()}/${igUserId}/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${token}`);
      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (!(await db.getPost(item.id))) {
            await db.createPost({
              id: item.id,
              user_id: resolvedUserId,
              caption: item.caption || '',
              media_type: item.media_type || 'IMAGE',
              media_url: item.media_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
              permalink: item.permalink || `https://instagram.com/p/${item.id}`,
              like_count: 0,
              source: 'INSTAGRAM'
            });
          }
        }
      }

      // 2. Sync Stories
      if (igUserId !== 'me') {
        const storyRes = await fetch(`${this.getBaseUrl()}/${igUserId}/stories?fields=id,caption,media_type,media_url,timestamp&access_token=${token}`);
        const storyData = await storyRes.json();
        if (storyData.data && Array.isArray(storyData.data)) {
          for (const item of storyData.data) {
            const stories = await db.getStoriesByUser(resolvedUserId);
            const exists = stories.find(s => s.id === item.id);
            if (!exists) {
              await db.createStory({
                id: item.id,
                user_id: resolvedUserId,
                media_url: item.media_url,
                caption: item.caption || '',
                expires_at: new Date(new Date(item.timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString(),
                source: 'INSTAGRAM'
              });
            }
          }
        }
      }
      
      return data.data || [];
    } catch (err) {
      console.warn('Sync real media error:', err.message);
    }
    return [];
  }

  async publishPost({ userId, caption, mediaUrl, mediaType = 'IMAGE', permalink = null, appBaseUrl = null }) {
    const postId = `ig_post_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const igPermalink = permalink || `https://instagram.com/p/${postId.substring(8)}`;

    // Persist in local SQLite FIRST so that /api/media/:id can find the base64 string
    const savedPost = await db.createPost({
      id: postId,
      user_id: userId || process.env.INSTAGRAM_ACCOUNT_ID || 'demo_user_1',
      caption: caption || '',
      media_type: mediaType,
      media_url: mediaUrl,
      permalink: igPermalink,
      like_count: 0,
      source: 'WEB'
    });

    if (this.isRealMetaConnected()) {
      try {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const baseUrl = this.getBaseUrl();
        
        let targetUrl = mediaUrl;
        if (mediaUrl.startsWith('data:') && appBaseUrl) {
          targetUrl = `${appBaseUrl}/api/media/${postId}`;
        } else if (mediaUrl.startsWith('http://')) {
          targetUrl = mediaUrl.replace('http://', 'https://');
        }

        if (targetUrl.startsWith('https://')) {
          const igUserId = userId || process.env.INSTAGRAM_ACCOUNT_ID || 'me';
          const containerUrl = `${baseUrl}/${igUserId}/media`;
          const containerRes = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: targetUrl,
              caption: caption,
              access_token: accessToken
            })
          });
          const containerData = await containerRes.json();

          if (containerData.id) {
            // Instagram needs time to download the image from our server
            await new Promise(resolve => setTimeout(resolve, 4000));

            // 2. Publish Container
            const publishUrl = `${baseUrl}/${igUserId}/media_publish`;
            
            let publishData = null;
            for (let i = 0; i < 3; i++) {
              const publishRes = await fetch(publishUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: accessToken
                })
              });
              publishData = await publishRes.json();
              
              if (publishData.error && publishData.error.code === 9007) {
                console.log(`Media not ready (Feed), retrying in 3 seconds... (Attempt ${i+1})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
              }
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Meta API Call warning (falling back to local log):', err.message);
      }
    }

    await db.logActivity(
      'POST_CREATE',
      `Postingan baru dipublikasikan via Web & disinkronkan ke Instagram [ID: ${postId}]`,
      JSON.stringify({ caption, mediaUrl, permalink: igPermalink })
    );

    return savedPost;
  }

  async publishStory({ userId, mediaUrl, caption = '', appBaseUrl = null }) {
    const storyId = `ig_story_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const savedStory = await db.createStory({
      id: storyId,
      user_id: userId || process.env.INSTAGRAM_ACCOUNT_ID || 'demo_user_1',
      media_url: mediaUrl,
      caption: caption,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source: 'WEB'
    });

    if (this.isRealMetaConnected()) {
      try {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const baseUrl = this.getBaseUrl();
        
        let targetUrl = mediaUrl;
        if (mediaUrl.startsWith('data:') && appBaseUrl) {
          targetUrl = `${appBaseUrl}/api/media/${storyId}`;
        } else if (mediaUrl.startsWith('http://')) {
          targetUrl = mediaUrl.replace('http://', 'https://');
        }

        if (targetUrl.startsWith('https://')) {
          const igUserId = userId || process.env.INSTAGRAM_ACCOUNT_ID || 'me';
          const containerUrl = `${baseUrl}/${igUserId}/media`;
          const containerRes = await fetch(containerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: targetUrl,
              media_type: 'STORIES',
              access_token: accessToken
            })
          });
          const containerData = await containerRes.json();
          if (containerData.error) {
            console.error('Meta API Error (Story Container):', containerData.error);
          }

          if (containerData.id) {
            // Instagram needs time to download the image from our server
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            const publishUrl = `${baseUrl}/${igUserId}/media_publish`;
            
            let publishData = null;
            for (let i = 0; i < 3; i++) {
              const publishRes = await fetch(publishUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerData.id,
                  access_token: accessToken
                })
              });
              publishData = await publishRes.json();
              
              if (publishData.error && publishData.error.code === 9007) {
                // Media not ready, wait and try again
                console.log(`Media not ready, retrying in 3 seconds... (Attempt ${i+1})`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                continue;
              }
              break; // Success or unrecoverable error
            }

            if (publishData && publishData.error) {
              console.error('Meta API Error (Story Publish):', publishData.error);
            } else {
              console.log('Successfully published story to Meta!', publishData);
            }
          }
        }
      } catch (err) {
        console.warn('Meta API Story Call warning:', err.message);
      }
    }

    await db.logActivity(
      'STORY_CREATE',
      `Story baru diunggah dari Web [ID: ${storyId}]`,
      JSON.stringify({ caption, mediaUrl })
    );

    return savedStory;
  }

  async sendCommentToInstagram({ postId, content, authorName = 'ariepoww', authorAvatar = null }) {
    const commentId = `ig_cmt_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    if (this.isRealMetaConnected()) {
      try {
        const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const commentUrl = `${this.getBaseUrl()}/${postId}/comments`;
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

    const savedComment = await db.addComment({
      id: commentId,
      post_id: postId,
      author_name: authorName,
      author_avatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
      content: content,
      source: 'WEB',
      synced_to_ig: 1
    });

    await db.logActivity(
      'COMMENT_TWO_WAY',
      `[Web -> Instagram] Komentar dikirim dari Web ke post ${postId}`,
      JSON.stringify({ author: authorName, content })
    );

    return savedComment;
  }

  async processWebhookEvent(payload) {
    await db.logActivity('WEBHOOK_RECEIVE', 'Menerima payload webhook dari Meta/Simulator', JSON.stringify(payload));
    
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

    const savedComment = await db.addComment({
      id: commentId,
      post_id: postId,
      author_name: sender,
      author_avatar: avatar,
      content: text,
      source: 'INSTAGRAM',
      synced_to_ig: 1
    });

    await db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Komentar baru diterima dari Instagram (@${sender}) pada post ${postId}`,
      JSON.stringify({ sender, content: text, commentId })
    );

    return savedComment;
  }

  async triggerSimulatedIncomingPost({ caption, mediaUrl, sender = 'instagram_mobile' }) {
    const postId = `ig_incoming_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    const savedPost = await db.createPost({
      id: postId,
      user_id: process.env.INSTAGRAM_ACCOUNT_ID || 'demo_user_1',
      caption: caption || 'Postingan otomatis masuk dari aplikasi Instagram mobile!',
      media_type: 'IMAGE',
      media_url: mediaUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      permalink: `https://instagram.com/p/${postId.substring(12)}`,
      like_count: Math.floor(Math.random() * 50) + 10,
      source: 'INSTAGRAM'
    });

    await db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Postingan baru masuk dari Instagram (@${sender})`,
      JSON.stringify({ sender, caption, postId })
    );

    return savedPost;
  }

  async triggerSimulatedIncomingStory({ mediaUrl, caption = 'Story dari Instagram App!' }) {
    const storyId = `ig_story_in_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const savedStory = await db.createStory({
      id: storyId,
      user_id: process.env.INSTAGRAM_ACCOUNT_ID || 'demo_user_1',
      media_url: mediaUrl || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
      caption: caption,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      source: 'INSTAGRAM'
    });

    await db.logActivity(
      'WEBHOOK_RECEIVE',
      `[Instagram -> Web] Story baru masuk dari Instagram`,
      JSON.stringify({ storyId, caption })
    );

    return savedStory;
  }
}

module.exports = new InstagramService();
