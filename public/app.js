/**
 * InstaBridge Client Application Logic
 * Integrasi Instagram API & Two-Way Sync
 * Adheres to: /design-taste-frontend standards
 */

(function () {
  'use strict';

  // State Management
  const state = {
    currentUser: null,
    isRealMeta: false,
    posts: [],
    stories: [],
    selectedMediaFile: null,
    isPolling: true,
    lastLogId: 0
  };

  // DOM Elements Cache
  const el = {
    themeToggle: document.getElementById('btnThemeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    connectionStatus: document.getElementById('connectionStatus'),
    connectionStatusText: document.getElementById('connectionStatusText'),
    userAvatar: document.getElementById('userAvatar'),
    userUsername: document.getElementById('userUsername'),
    btnAuth: document.getElementById('btnAuth'),
    storiesRail: document.getElementById('storiesRail'),
    btnAddStory: document.getElementById('btnAddStory'),
    createPostForm: document.getElementById('createPostForm'),
    postCaption: document.getElementById('postCaption'),
    captionCounter: document.getElementById('captionCounter'),
    dropArea: document.getElementById('dropArea'),
    mediaFileInput: document.getElementById('mediaFileInput'),
    mediaPreviewContainer: document.getElementById('mediaPreviewContainer'),
    imagePreview: document.getElementById('imagePreview'),
    videoPreview: document.getElementById('videoPreview'),
    btnRemovePreview: document.getElementById('btnRemovePreview'),
    btnPublish: document.getElementById('btnPublish'),
    feedContainer: document.getElementById('feedContainer'),
    btnRefreshFeed: document.getElementById('btnRefreshFeed'),
    btnToggleSimulator: document.getElementById('btnToggleSimulator'),
    simulatorDrawer: document.getElementById('simulatorDrawer'),
    btnCloseSimulator: document.getElementById('btnCloseSimulator'),
    btnSimDosenComment: document.getElementById('btnSimDosenComment'),
    btnSimIncomingPost: document.getElementById('btnSimIncomingPost'),
    btnSimIncomingStory: document.getElementById('btnSimIncomingStory'),
    terminalLogs: document.getElementById('terminalLogs'),
    storyModal: document.getElementById('storyModal'),
    storyProgressFill: document.getElementById('storyProgressFill'),
    storyViewerAvatar: document.getElementById('storyViewerAvatar'),
    storyViewerUsername: document.getElementById('storyViewerUsername'),
    storyViewerImg: document.getElementById('storyViewerImg'),
    storyViewerCaption: document.getElementById('storyViewerCaption'),
    btnCloseStory: document.getElementById('btnCloseStory'),
    storyUploadModal: document.getElementById('storyUploadModal'),
    storyUploadForm: document.getElementById('storyUploadForm'),
    storyFileInput: document.getElementById('storyFileInput'),
    storyCaptionInput: document.getElementById('storyCaptionInput'),
    btnCloseStoryUpload: document.getElementById('btnCloseStoryUpload'),
    authModal: document.getElementById('authModal'),
    btnCloseAuthModal: document.getElementById('btnCloseAuthModal'),
    btnQuickDemoLogin: document.getElementById('btnQuickDemoLogin'),
    metaTokenInput: document.getElementById('metaTokenInput'),
    btnSubmitMetaToken: document.getElementById('btnSubmitMetaToken'),
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // 1. Initial Setup & Theme Management
  // =========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    el.themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  }

  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    el.themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  // =========================================================================
  // 2. Authentication & Session Handling
  // =========================================================================

  async function checkAuthSession() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        state.currentUser = data.user;
        state.isRealMeta = data.isRealMeta;
        renderAuthUI();
      }
    } catch (err) {
      console.error('Auth session error:', err);
    }
  }

  function renderAuthUI() {
    if (!state.currentUser) {
      el.userUsername.textContent = 'Guest';
      el.userAvatar.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
      el.btnAuth.textContent = 'Login';
      el.btnAuth.className = 'btn-auth login';
      el.connectionStatus.className = 'status-pill';
      el.connectionStatusText.textContent = 'Tidak Terhubung';
      return;
    }

    el.userUsername.textContent = `@${state.currentUser.username}`;
    el.userAvatar.src = state.currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
    el.btnAuth.textContent = 'Logout';
    el.btnAuth.className = 'btn-auth logout';

    if (state.isRealMeta) {
      el.connectionStatus.className = 'status-pill live';
      el.connectionStatusText.textContent = '🟢 Meta Graph API Real';
    } else {
      el.connectionStatus.className = 'status-pill';
      el.connectionStatusText.textContent = '🟡 Interactive Demo Simulator';
    }
  }

  el.btnAuth.addEventListener('click', async () => {
    if (state.currentUser) {
      // Logout
      await fetch('/api/auth/logout', { method: 'POST' });
      state.currentUser = null;
      renderAuthUI();
      showToast('Berhasil keluar dari akun', 'info');
      el.authModal.classList.add('open');
    } else {
      el.authModal.classList.add('open');
    }
  });

  el.btnQuickDemoLogin.addEventListener('click', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'demo' })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.user;
      state.isRealMeta = false;
      renderAuthUI();
      el.authModal.classList.remove('open');
      showToast('Masuk sebagai @' + data.user.username, 'success');
      loadAllData();
    }
  });

  el.btnSubmitMetaToken.addEventListener('click', async () => {
    const token = el.metaTokenInput.value.trim();
    if (!token) {
      showToast('Silakan masukkan token Meta terlebih dahulu', 'error');
      return;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'real', token })
    });
    const data = await res.json();
    if (data.success) {
      state.currentUser = data.user;
      state.isRealMeta = true;
      renderAuthUI();
      el.authModal.classList.remove('open');
      showToast('Terhubung ke Meta Graph API!', 'success');
      loadAllData();
    }
  });

  el.btnCloseAuthModal.addEventListener('click', () => {
    el.authModal.classList.remove('open');
  });

  // =========================================================================
  // 3. Media Upload & Live Preview (Fitur #5)
  // =========================================================================

  el.dropArea.addEventListener('click', () => {
    el.mediaFileInput.click();
  });

  el.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropArea.style.borderColor = '#e1306c';
  });

  el.dropArea.addEventListener('dragleave', () => {
    el.dropArea.style.borderColor = '';
  });

  el.dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    el.dropArea.style.borderColor = '';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  el.mediaFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB sesuai standar Instagram!', 'error');
      return;
    }

    state.selectedMediaFile = file;
    const isVideo = file.type.includes('video');

    const reader = new FileReader();
    reader.onload = (event) => {
      if (isVideo) {
        el.videoPreview.src = event.target.result;
        el.videoPreview.style.display = 'block';
        el.imagePreview.style.display = 'none';
      } else {
        el.imagePreview.src = event.target.result;
        el.imagePreview.style.display = 'block';
        el.videoPreview.style.display = 'none';
      }
      el.mediaPreviewContainer.style.display = 'flex';
      el.dropArea.style.display = 'none';
      showToast('Media berhasil dipilih & preview aktif', 'info');
    };
    reader.readAsDataURL(file);
  }

  el.btnRemovePreview.addEventListener('click', () => {
    state.selectedMediaFile = null;
    el.mediaFileInput.value = '';
    el.imagePreview.src = '';
    el.videoPreview.src = '';
    el.mediaPreviewContainer.style.display = 'none';
    el.dropArea.style.display = 'block';
  });

  el.postCaption.addEventListener('input', (e) => {
    el.captionCounter.textContent = `${e.target.value.length}/500`;
  });

  // =========================================================================
  // 4. Create Post & Publish
  // =========================================================================

  el.createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const caption = el.postCaption.value.trim();
    if (!caption && !state.selectedMediaFile) {
      showToast('Tulis caption atau pilih foto sebelum memposting!', 'error');
      return;
    }

    el.btnPublish.disabled = true;
    el.btnPublish.innerHTML = '<span>⏳ Mengirim ke Instagram & Database...</span>';

    try {
      const formData = new FormData();
      formData.append('caption', caption);
      if (state.currentUser) {
        formData.append('userId', state.currentUser.id);
      }
      if (state.selectedMediaFile) {
        formData.append('media', state.selectedMediaFile);
      } else {
        // Fallback realistic photography image
        formData.append('mediaUrl', `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80`);
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showToast('🎉 Postingan berhasil di-publish ke Feed & Instagram!', 'success');
        // Reset form
        el.postCaption.value = '';
        el.captionCounter.textContent = '0/500';
        el.btnRemovePreview.click();
        await fetchFeed();
        await fetchLogs();
      } else {
        showToast('Gagal memposting: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      showToast('Koneksi gagal saat memposting: ' + err.message, 'error');
    } finally {
      el.btnPublish.disabled = false;
      el.btnPublish.innerHTML = '<span>🚀 Posting ke Feed & Instagram</span>';
    }
  });

  // =========================================================================
  // 5. Feed & Two-Way Comment Management
  // =========================================================================

  async function fetchFeed() {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        state.posts = data.posts;
        renderFeed();
      }
    } catch (err) {
      console.error('Fetch feed error:', err);
    }
  }

  function renderFeed() {
    if (state.posts.length === 0) {
      el.feedContainer.innerHTML = `
        <div class="post-card" style="padding: 2.5rem; text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📸</div>
          <h3 style="color: var(--text-primary); margin-bottom: 0.25rem;">Belum ada postingan</h3>
          <p style="font-size: 0.85rem;">Buat status baru dengan foto di atas atau picu postingan baru via Simulator Panel!</p>
        </div>
      `;
      return;
    }

    el.feedContainer.innerHTML = '';
    state.posts.forEach((post) => {
      const postCard = createPostCardElement(post);
      el.feedContainer.appendChild(postCard);
    });
  }

  function createPostCardElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;

    const isIgSource = post.source === 'INSTAGRAM';
    const sourceBadge = isIgSource
      ? `<span class="badge-source instagram" title="Konten berasal dari sinkronisasi Instagram">📸 Via Instagram</span>`
      : `<span class="badge-source web" title="Konten diposting dari antarmuka Web">🌐 Via Web</span>`;

    const isVideo = post.media_type === 'VIDEO' || post.media_url.endsWith('.mp4');
    const mediaHtml = isVideo
      ? `<video src="${post.media_url}" controls></video>`
      : `<img src="${post.media_url}" alt="Post Media" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'">`;

    const commentsListHtml = (post.comments || []).map(c => renderCommentRow(c)).join('');

    card.innerHTML = `
      <div class="post-header">
        <div class="post-user-info">
          <img src="${post.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="post-user-avatar" alt="Avatar">
          <div>
            <div class="post-author-name">@${escapeHtml(post.username || 'user')}</div>
            <div class="post-timestamp">${formatTimeAgo(post.created_at)}</div>
          </div>
        </div>
        <div>
          ${sourceBadge}
        </div>
      </div>

      <div class="post-media-container">
        ${mediaHtml}
      </div>

      <div class="post-body">
        <div class="post-actions-row">
          <div class="action-btn-group">
            <button class="action-icon-btn btn-like" data-post-id="${post.id}" title="Sukai postingan ini">
              <span>❤️</span>
              <span class="like-count">${post.like_count}</span>
            </button>
            <button class="action-icon-btn btn-focus-comment" data-post-id="${post.id}" title="Tulis komentar">
              <span>💬</span>
              <span style="font-size: 0.85rem; font-weight: 700;">${(post.comments || []).length}</span>
            </button>
          </div>
          ${post.permalink ? `<a href="${post.permalink}" target="_blank" rel="noopener" style="font-size: 0.78rem; color: var(--text-muted);" title="Buka di Instagram">🔗 Buka di IG</a>` : ''}
        </div>

        ${post.caption ? `
          <div class="post-caption">
            <span class="author-prefix">@${escapeHtml(post.username || 'user')}</span>
            <span>${escapeHtml(post.caption)}</span>
          </div>
        ` : ''}

        <!-- Two-Way Comments Section -->
        <div class="comments-section">
          <div class="comments-list" id="comments-list-${post.id}">
            ${commentsListHtml || '<div style="font-size: 0.78rem; color: var(--text-muted);">Belum ada komentar. Jadilah yang pertama berkomentar!</div>'}
          </div>

          <form class="comment-input-form" data-post-id="${post.id}">
            <input type="text" class="comment-input" placeholder="Tulis komentar untuk disinkronkan..." required maxlength="500">
            <button type="submit" class="btn-send-comment">Kirim</button>
          </form>
        </div>
      </div>
    `;

    // Bind Like Button
    const btnLike = card.querySelector('.btn-like');
    btnLike.addEventListener('click', async () => {
      try {
        const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          btnLike.querySelector('.like-count').textContent = data.post.like_count;
        }
      } catch (err) {
        console.error('Like error:', err);
      }
    });

    // Bind Comment Focus Button
    const btnCommentFocus = card.querySelector('.btn-focus-comment');
    btnCommentFocus.addEventListener('click', () => {
      const input = card.querySelector('.comment-input');
      input.focus();
    });

    // Bind Comment Submit Form (Arah 1: Web -> IG)
    const commentForm = card.querySelector('.comment-input-form');
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = commentForm.querySelector('.comment-input');
      const text = input.value.trim();
      if (!text) return;

      const submitBtn = commentForm.querySelector('.btn-send-comment');
      submitBtn.disabled = true;
      submitBtn.textContent = '...';

      try {
        const res = await fetch(`/api/posts/${post.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: text,
            authorName: state.currentUser ? state.currentUser.username : 'arief_developer',
            authorAvatar: state.currentUser ? state.currentUser.avatar_url : null
          })
        });
        const data = await res.json();

        if (data.success) {
          input.value = '';
          showToast('Komentar berhasil dikirim & disinkronkan ke Instagram!', 'success');
          await fetchFeed();
          await fetchLogs();
        } else {
          showToast('Gagal kirim komentar: ' + (data.error || 'Unknown'), 'error');
        }
      } catch (err) {
        showToast('Koneksi komentar gagal: ' + err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim';
      }
    });

    return card;
  }

  function renderCommentRow(comment) {
    const isFromIg = comment.source === 'INSTAGRAM';
    const tag = isFromIg
      ? `<span class="badge-source instagram" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">📸 dari Instagram</span>`
      : `<span class="badge-source web" style="font-size: 0.65rem; padding: 0.15rem 0.45rem;">🌐 dari Web</span>`;

    return `
      <div class="comment-row">
        <img src="${comment.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="comment-avatar" alt="Avatar">
        <div class="comment-content-wrap">
          <div class="comment-author-badge">
            <span class="comment-author-name">@${escapeHtml(comment.author_name)}</span>
            ${tag}
            <span class="comment-time">${formatTimeAgo(comment.created_at)}</span>
          </div>
          <div class="comment-text">${escapeHtml(comment.content)}</div>
        </div>
      </div>
    `;
  }

  el.btnRefreshFeed.addEventListener('click', () => {
    fetchFeed();
    fetchStories();
    fetchLogs();
    showToast('Feed berhasil disinkronkan ulang', 'info');
  });

  // =========================================================================
  // 6. Stories Rail & Story Viewer
  // =========================================================================

  async function fetchStories() {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      if (data.success) {
        state.stories = data.stories;
        renderStories();
      }
    } catch (err) {
      console.error('Fetch stories error:', err);
    }
  }

  function renderStories() {
    // Keep the first item (+ Cerita Anda)
    el.storiesRail.innerHTML = '';
    el.storiesRail.appendChild(el.btnAddStory);

    state.stories.forEach((story) => {
      const item = document.createElement('div');
      item.className = 'story-item';
      item.title = `Lihat story @${story.username}`;
      item.innerHTML = `
        <div class="story-ring">
          <img src="${story.media_url}" class="story-avatar" alt="Story">
        </div>
        <span class="story-username">@${escapeHtml(story.username)}</span>
      `;

      item.addEventListener('click', () => {
        openStoryViewer(story);
      });

      el.storiesRail.appendChild(item);
    });
  }

  let storyTimer = null;
  function openStoryViewer(story) {
    el.storyViewerAvatar.src = story.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
    el.storyViewerUsername.textContent = `@${story.username}`;
    el.storyViewerImg.src = story.media_url;
    el.storyViewerCaption.textContent = story.caption || '';
    el.storyViewerCaption.style.display = story.caption ? 'block' : 'none';

    el.storyProgressFill.style.transition = 'none';
    el.storyProgressFill.style.width = '0%';
    el.storyModal.classList.add('open');

    // Animate progress bar across 5 seconds
    setTimeout(() => {
      el.storyProgressFill.style.transition = 'width 5s linear';
      el.storyProgressFill.style.width = '100%';
    }, 50);

    clearTimeout(storyTimer);
    storyTimer = setTimeout(() => {
      closeStoryViewer();
    }, 5100);
  }

  function closeStoryViewer() {
    clearTimeout(storyTimer);
    el.storyModal.classList.remove('open');
  }

  el.btnCloseStory.addEventListener('click', closeStoryViewer);
  el.storyModal.addEventListener('click', (e) => {
    if (e.target === el.storyModal) closeStoryViewer();
  });

  // Story Upload Modal
  el.btnAddStory.addEventListener('click', () => {
    el.storyUploadModal.classList.add('open');
  });

  el.btnCloseStoryUpload.addEventListener('click', () => {
    el.storyUploadModal.classList.remove('open');
  });

  el.storyUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!el.storyFileInput.files || !el.storyFileInput.files[0]) {
      showToast('Pilih foto untuk story terlebih dahulu', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('media', el.storyFileInput.files[0]);
    formData.append('caption', el.storyCaptionInput.value.trim());
    if (state.currentUser) {
      formData.append('userId', state.currentUser.id);
    }

    const submitBtn = el.storyUploadForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/stories', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast('Story berhasil diunggah!', 'success');
        el.storyUploadForm.reset();
        el.storyUploadModal.classList.remove('open');
        await fetchStories();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Gagal unggah story: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // =========================================================================
  // 7. Floating Simulator Drawer (Fitur #1 Evaluasi Dosen)
  // =========================================================================

  el.btnToggleSimulator.addEventListener('click', () => {
    el.simulatorDrawer.classList.toggle('open');
  });

  el.btnCloseSimulator.addEventListener('click', () => {
    el.simulatorDrawer.classList.remove('open');
  });

  // Simulasi Komentar dari IG (@dosen_tester)
  el.btnSimDosenComment.addEventListener('click', async () => {
    if (state.posts.length === 0) {
      showToast('Buat minimal 1 postingan di feed terlebih dahulu!', 'error');
      return;
    }

    const targetPost = state.posts[0]; // First post
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_comment',
          postId: targetPost.id,
          text: 'Kerja bagus mahasiswa! Integrasi dua arah API Instagram ini berjalan lancar. 👍 (Komentar dari IG App)',
          sender: 'dosen_tester'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Simulasi Berhasil: @dosen_tester berkomentar dari Instagram!', 'success');
        await fetchFeed();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Error simulator: ' + err.message, 'error');
    }
  });

  // Simulasi Postingan Masuk dari Instagram
  el.btnSimIncomingPost.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_post',
          caption: 'Postingan baru di-upload langsung dari aplikasi Instagram mobile saat jalan-jalan! #travel #instaAPI',
          mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
          sender: 'instagram_mobile'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Postingan dari aplikasi Instagram berhasil masuk ke Web!', 'success');
        await fetchFeed();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Error simulator post: ' + err.message, 'error');
    }
  });

  // Simulasi Story Masuk dari Instagram
  el.btnSimIncomingStory.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_story',
          caption: 'Cerita Instagram hari ini!',
          mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Story dari aplikasi Instagram berhasil masuk!', 'success');
        await fetchStories();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Error simulator story: ' + err.message, 'error');
    }
  });

  // =========================================================================
  // 8. Terminal Log Console & Polling Engine
  // =========================================================================

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs?limit=15');
      const data = await res.json();
      if (data.success && data.logs) {
        renderTerminalLogs(data.logs);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  }

  function renderTerminalLogs(logs) {
    if (logs.length === 0) return;
    el.terminalLogs.innerHTML = logs.map(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      return `
        <div class="log-entry">
          <span class="log-time">[${timeStr}]</span>
          <span class="log-tag">${escapeHtml(log.event_type)}:</span>
          <span>${escapeHtml(log.description)}</span>
        </div>
      `;
    }).join('');
  }

  // Smart Polling (Direction 2: Realtime sync without page reload)
  setInterval(async () => {
    if (state.isPolling) {
      try {
        const res = await fetch('/api/posts');
        const data = await res.json();
        if (data.success) {
          // Check if post count or comments changed
          const prevCommentsCount = state.posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
          const newCommentsCount = data.posts.reduce((acc, p) => acc + (p.comments?.length || 0), 0);
          
          if (data.posts.length !== state.posts.length || newCommentsCount !== prevCommentsCount) {
            state.posts = data.posts;
            renderFeed();
          }
        }
      } catch (e) {}

      fetchLogs();
    }
  }, 3500);

  // =========================================================================
  // 9. Toast Helper & Utility Functions
  // =========================================================================

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Baru saja';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return `${Math.floor(diffSec / 86400)} hari lalu`;
  }

  async function loadAllData() {
    await checkAuthSession();
    await fetchStories();
    await fetchFeed();
    await fetchLogs();
  }

  // Start Application
  initTheme();
  loadAllData();

})();
