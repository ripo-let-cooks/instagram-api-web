/**
 * InstaBridge Client Application Logic
 * Standard: /design-taste-frontend & /redesign-existing-projects
 * Anti-slop, clean SVG iconography, confident tone
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
    isPolling: true
  };

  // DOM Elements Cache
  const el = {
    themeToggle: document.getElementById('btnThemeToggle'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),
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
    btnDeleteStory: document.getElementById('btnDeleteStory'),
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
  // 1. Theme Management
  // =========================================================================

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      el.themeIconSun.style.display = 'block';
      el.themeIconMoon.style.display = 'none';
    } else {
      el.themeIconSun.style.display = 'none';
      el.themeIconMoon.style.display = 'block';
    }
  }

  function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
  }

  el.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });

  // =========================================================================
  // 2. Authentication & Session
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
      el.userUsername.textContent = '@guest';
      el.userAvatar.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80';
      el.btnAuth.textContent = 'Login';
      el.connectionStatus.className = 'status-badge';
      el.connectionStatusText.textContent = 'Offline';
      return;
    }

    el.userUsername.textContent = `@${state.currentUser.username}`;
    el.userAvatar.src = state.currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
    el.btnAuth.textContent = 'Logout';

    if (state.isRealMeta) {
      el.connectionStatus.className = 'status-badge live';
      el.connectionStatusText.textContent = 'Meta Graph API';
    } else {
      el.connectionStatus.className = 'status-badge';
      el.connectionStatusText.textContent = 'Simulator Engine';
    }
  }

  el.btnAuth.addEventListener('click', async () => {
    if (state.currentUser) {
      await fetch('/api/auth/logout', { method: 'POST' });
      state.currentUser = null;
      renderAuthUI();
      showToast('Sesi akun telah diakhiri');
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
      showToast(`Masuk sebagai @${data.user.username}`);
      loadAllData();
    }
  });

  el.btnSubmitMetaToken.addEventListener('click', async () => {
    const token = el.metaTokenInput.value.trim();
    if (!token) {
      showToast('Masukkan token Meta Graph API yang valid', 'error');
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
      showToast('Terhubung ke Meta Graph API');
      loadAllData();
    } else {
      showToast(data.error || 'Token tidak valid atau gagal terhubung', 'error');
    }
  });

  el.btnCloseAuthModal.addEventListener('click', () => {
    el.authModal.classList.remove('open');
  });

  // =========================================================================
  // 3. Media Upload & Live Preview
  // =========================================================================

  el.dropArea.addEventListener('click', () => {
    el.mediaFileInput.click();
  });

  el.dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.dropArea.style.borderColor = 'var(--accent)';
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
      showToast('Ukuran berkas melebihi batas 5 MB', 'error');
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
    };
    reader.readAsDataURL(file);
  }

  el.btnRemovePreview.addEventListener('click', () => {
    state.selectedMediaFile = null;
    el.mediaFileInput.value = '';
    el.imagePreview.src = '';
    el.videoPreview.src = '';
    el.mediaPreviewContainer.style.display = 'none';
    el.dropArea.style.display = 'flex';
  });

  el.postCaption.addEventListener('input', (e) => {
    el.captionCounter.textContent = `${e.target.value.length} / 500`;
  });

  // =========================================================================
  // 4. Create Post
  // =========================================================================

  el.createPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const caption = el.postCaption.value.trim();
    if (!caption && !state.selectedMediaFile) {
      showToast('Tulis keterangan atau sertakan foto terlebih dahulu', 'error');
      return;
    }

    el.btnPublish.disabled = true;
    el.btnPublish.innerHTML = '<span>Memproses publikasi...</span>';
    el.createPostForm.classList.add('uploading-pulse');

    try {
      const formData = new FormData();
      formData.append('caption', caption);
      if (state.currentUser) {
        formData.append('userId', state.currentUser.id);
      }
      if (state.selectedMediaFile) {
        formData.append('media', state.selectedMediaFile);
      } else {
        formData.append('mediaUrl', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80');
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showToast('Konten berhasil dipublikasikan');
        el.postCaption.value = '';
        el.captionCounter.textContent = '0 / 500';
        el.btnRemovePreview.click();
        await fetchFeed();
        await fetchLogs();
      } else {
        showToast(data.error || 'Gagal mempublikasikan konten', 'error');
      }
    } catch (err) {
      showToast('Kesalahan koneksi saat publikasi', 'error');
    } finally {
      el.btnPublish.disabled = false;
      el.btnPublish.innerHTML = '<span>Publikasikan ke Instagram & Web</span>';
      el.createPostForm.classList.remove('uploading-pulse');
    }
  });

  // =========================================================================
  // 5. Feed & Two-Way Comments
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
        <div style="background: var(--bg-surface); border: 1px solid var(--border-hairline); border-radius: var(--radius-lg); padding: 3.5rem 1.5rem; text-align: center; color: var(--text-secondary); box-shadow: var(--shadow-subtle);">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--bg-surface-elevated); border: 1px solid var(--border-muted); display: inline-flex; align-items: center; justify-content: center; margin-bottom: 0.85rem; color: var(--text-muted);">
            <svg class="icon icon-lg" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </div>
          <div style="font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem; letter-spacing: -0.015em;">Belum Ada Postingan</div>
          <div style="font-family: var(--font-sans); font-size: 0.82rem; font-weight: 400; color: var(--text-muted); max-width: 360px; margin: 0 auto; line-height: 1.5;">Gunakan formulir di atas untuk mempublikasikan konten baru atau jalankan simulasi dari panel Developer Tools.</div>
        </div>
      `;
      return;
    }

    el.feedContainer.innerHTML = '';
    state.posts.forEach((post) => {
      const card = createPostElement(post);
      el.feedContainer.appendChild(card);
    });
  }

  function createPostElement(post) {
    const card = document.createElement('article');
    card.className = 'post-entry';
    card.id = `post-${post.id}`;

    const isIgSource = post.source === 'INSTAGRAM';
    const originBadge = isIgSource
      ? `<span class="origin-badge ig">Instagram</span>`
      : `<span class="origin-badge">Web</span>`;

    const isVideo = post.media_type === 'VIDEO' || post.media_url.endsWith('.mp4');
    const mediaHtml = isVideo
      ? `<video src="${post.media_url}" controls></video>`
      : `<img src="${post.media_url}" alt="Media Post" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'">`;

    const commentsListHtml = (post.comments || []).map(c => renderCommentItem(c)).join('');

    card.innerHTML = `
      <div class="post-entry-header">
        <div class="author-meta">
          <img src="${post.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}" class="author-avatar" alt="Avatar">
          <div>
            <div class="author-name">@${escapeHtml(post.username || 'user')}</div>
            <div class="post-date">${formatTimeAgo(post.created_at)}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${originBadge}
          <button class="btn-interaction btn-delete-post" data-post-id="${post.id}" title="Hapus Post" style="color: var(--text-muted); opacity: 0.6; transition: all 0.2s ease;">
            <svg class="icon icon-sm" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>

      <div class="post-media-stage">
        ${mediaHtml}
      </div>

      <div class="post-entry-body">
        <div class="interaction-strip">
          <div class="interaction-group">
            <button class="btn-interaction btn-like ${post.like_count > 0 ? 'active' : ''}" data-post-id="${post.id}" title="Sukai">
              <svg class="icon icon-sm" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span class="like-count">${post.like_count}</span>
            </button>

            <button class="btn-interaction btn-focus-comment" title="Komentar">
              <svg class="icon icon-sm" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>${(post.comments || []).length}</span>
            </button>
          </div>

          ${post.permalink ? `
            <a href="${post.permalink}" target="_blank" rel="noopener" class="btn-interaction" title="Tautan Asli">
              <svg class="icon icon-sm" viewBox="0 0 24 24">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          ` : ''}
        </div>

        ${post.caption ? `
          <div class="post-caption-text">
            <span class="handle">@${escapeHtml(post.username || 'user')}</span>
            <span>${escapeHtml(post.caption)}</span>
          </div>
        ` : ''}

        <!-- Thread Comments -->
        <div class="thread-container">
          <div class="thread-list">
            ${commentsListHtml || '<div style="font-size: 0.75rem; color: var(--text-dim);">Belum ada komentar.</div>'}
          </div>

          <form class="thread-input-row" data-post-id="${post.id}">
            <input type="text" class="thread-input" placeholder="Tulis komentar..." required maxlength="500">
            <button type="submit" class="btn-post-comment">Kirim</button>
          </form>
        </div>
      </div>
    `;

    // Likes / Unlike
    const btnLike = card.querySelector('.btn-like');
    btnLike.addEventListener('click', async () => {
      try {
        const isLiked = btnLike.classList.contains('active');
        const endpoint = isLiked ? `/api/posts/${post.id}/unlike` : `/api/posts/${post.id}/like`;
        const res = await fetch(endpoint, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          btnLike.querySelector('.like-count').textContent = data.post.like_count;
          if (isLiked) {
            btnLike.classList.remove('active');
          } else {
            btnLike.classList.add('active');
          }
        }
      } catch (err) {
        console.error('Like error:', err);
      }
    });

    // Delete Post
    const btnDelete = card.querySelector('.btn-delete-post');
    if (btnDelete) {
      btnDelete.addEventListener('mouseenter', () => {
        btnDelete.style.opacity = '1';
        btnDelete.style.color = 'var(--danger-color, #ef4444)';
      });
      btnDelete.addEventListener('mouseleave', () => {
        btnDelete.style.opacity = '0.6';
        btnDelete.style.color = 'var(--text-muted)';
      });
      btnDelete.addEventListener('click', async () => {
        if (!(await showConfirmModal('Hapus Postingan', 'Apakah Anda yakin ingin menghapus postingan ini secara permanen?'))) return;
        try {
          const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('Post berhasil dihapus');
            card.style.opacity = '0';
            setTimeout(() => {
              fetchFeed();
              fetchLogs();
            }, 300);
          } else {
            showToast('Gagal menghapus post', 'error');
          }
        } catch (err) {
          showToast('Kesalahan koneksi saat menghapus post', 'error');
        }
      });
    }

    // Delete Comments
    card.querySelectorAll('.btn-delete-comment').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const commentId = e.currentTarget.dataset.commentId;
        if (!(await showConfirmModal('Hapus Komentar', 'Apakah Anda yakin ingin menghapus komentar ini?'))) return;
        try {
          const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            showToast('Komentar berhasil dihapus');
            e.currentTarget.closest('.thread-item').remove();
            fetchLogs();
          } else {
            showToast('Gagal menghapus komentar', 'error');
          }
        } catch (err) {
          showToast('Kesalahan saat menghapus', 'error');
        }
      });
    });

    // Focus comment
    const btnCommentFocus = card.querySelector('.btn-focus-comment');
    btnCommentFocus.addEventListener('click', () => {
      card.querySelector('.thread-input').focus();
    });

    // Submit comment (Arah 1: Web -> IG)
    const commentForm = card.querySelector('.thread-input-row');
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = commentForm.querySelector('.thread-input');
      const text = input.value.trim();
      if (!text) return;

      const submitBtn = commentForm.querySelector('.btn-post-comment');
      submitBtn.disabled = true;

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
          showToast('Komentar berhasil dikirim');
          await fetchFeed();
          await fetchLogs();
        } else {
          showToast(data.error || 'Gagal mengirim komentar', 'error');
        }
      } catch (err) {
        showToast('Kesalahan koneksi komentar', 'error');
      } finally {
        submitBtn.disabled = false;
      }
    });

    return card;
  }

  function renderCommentItem(comment) {
    const isFromIg = comment.source === 'INSTAGRAM';
    const tag = isFromIg
      ? `<span class="origin-badge ig" style="font-size: 0.62rem; padding: 0.1rem 0.35rem;">IG</span>`
      : `<span class="origin-badge" style="font-size: 0.62rem; padding: 0.1rem 0.35rem;">Web</span>`;

    return `
      <div class="thread-item">
        <img src="${comment.author_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" class="thread-avatar" alt="Avatar">
        <div class="thread-content" style="flex: 1;">
          <div class="thread-meta" style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="thread-author">@${escapeHtml(comment.author_name)}</span>
            ${tag}
            <span style="font-size: 0.68rem; color: var(--text-dim);">${formatTimeAgo(comment.created_at)}</span>
            <button class="btn-delete-comment" data-comment-id="${comment.id}" title="Hapus Komentar">
              <svg class="icon icon-sm" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="thread-text">${escapeHtml(comment.content)}</div>
        </div>
      </div>
    `;
  }

  el.btnRefreshFeed.addEventListener('click', () => {
    fetchFeed();
    fetchStories();
    fetchLogs();
    showToast('Sinkronisasi selesai');
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
    el.storiesRail.innerHTML = '';
    el.storiesRail.appendChild(el.btnAddStory);

    state.stories.forEach((story) => {
      const item = document.createElement('div');
      item.className = 'story-node';
      item.title = `Story @${story.username}`;
      item.innerHTML = `
        <div class="story-squircle">
          <img src="${story.media_url}" class="story-thumbnail" alt="Story">
        </div>
        <span class="story-label">@${escapeHtml(story.username)}</span>
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

    el.btnDeleteStory.dataset.storyId = story.id;
    el.btnDeleteStory.style.display = 'block';

    el.storyProgressFill.style.transition = 'none';
    el.storyProgressFill.style.width = '0%';
    el.storyModal.classList.add('open');

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
  
  el.btnDeleteStory.addEventListener('click', async () => {
    const storyId = el.btnDeleteStory.dataset.storyId;
    if (!storyId) return;
    if (!(await showConfirmModal('Hapus Story', 'Apakah Anda yakin ingin menghapus story ini secara permanen?'))) return;
    
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Story berhasil dihapus');
        closeStoryViewer();
        fetchStories();
        fetchLogs();
      } else {
        showToast('Gagal menghapus story', 'error');
      }
    } catch (err) {
      showToast('Kesalahan koneksi saat menghapus story', 'error');
    }
  });

  el.storyModal.addEventListener('click', (e) => {
    if (e.target === el.storyModal) closeStoryViewer();
  });

  el.btnAddStory.addEventListener('click', () => {
    el.storyUploadModal.classList.add('open');
  });

  el.btnCloseStoryUpload.addEventListener('click', () => {
    el.storyUploadModal.classList.remove('open');
  });

  el.storyUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!el.storyFileInput.files || !el.storyFileInput.files[0]) {
      showToast('Pilih berkas foto terlebih dahulu', 'error');
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
    el.storyUploadForm.classList.add('uploading-pulse');

    try {
      const res = await fetch('/api/stories', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        showToast('Story berhasil diunggah');
        el.storyUploadForm.reset();
        el.storyUploadModal.classList.remove('open');
        await fetchStories();
        await fetchLogs();
      } else {
        showToast(data.error || 'Gagal mengunggah story', 'error');
      }
    } catch (err) {
      showToast('Gagal mengunggah story', 'error');
    } finally {
      submitBtn.disabled = false;
      el.storyUploadForm.classList.remove('uploading-pulse');
    }
  });

  // =========================================================================
  // 7. Developer & Simulator Inspector Panel
  // =========================================================================

  el.btnToggleSimulator.addEventListener('click', () => {
    el.simulatorDrawer.classList.toggle('open');
  });

  el.btnCloseSimulator.addEventListener('click', () => {
    el.simulatorDrawer.classList.remove('open');
  });

  // Simulator: Incoming IG Comment
  el.btnSimDosenComment.addEventListener('click', async () => {
    if (state.posts.length === 0) {
      showToast('Daftar postingan masih kosong', 'error');
      return;
    }

    const targetPost = state.posts[0];
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_comment',
          postId: targetPost.id,
          text: 'Arsitektur dan sinkronisasi dua arah API terverifikasi dengan baik.',
          sender: 'dosen_tester'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Event komentar masuk dari Instagram diproses');
        await fetchFeed();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Gagal memproses simulator event', 'error');
    }
  });

  // Simulator: Incoming IG Post
  el.btnSimIncomingPost.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_post',
          caption: 'Dokumentasi arsitektur sistem komputasi terdistribusi.',
          mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
          sender: 'instagram_mobile'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Postingan dari Instagram berhasil disinkronkan');
        await fetchFeed();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Gagal memproses event postingan', 'error');
    }
  });

  // Simulator: Incoming IG Story
  el.btnSimIncomingStory.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'incoming_story',
          caption: 'Pembaruan status infrastruktur',
          mediaUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Story dari Instagram berhasil disinkronkan');
        await fetchStories();
        await fetchLogs();
      }
    } catch (err) {
      showToast('Gagal memproses event story', 'error');
    }
  });

  // =========================================================================
  // 8. Terminal Log Viewer & Real-time Polling
  // =========================================================================

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs?limit=15');
      const data = await res.json();
      if (data.success && data.logs) {
        renderLogs(data.logs);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  }

  function renderLogs(logs) {
    if (logs.length === 0) return;
    el.terminalLogs.innerHTML = logs.map(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      return `
        <div class="console-line">
          <span class="console-timestamp">[${timeStr}]</span>
          <span class="console-verb">${escapeHtml(log.event_type)}:</span>
          <span>${escapeHtml(log.description)}</span>
        </div>
      `;
    }).join('');
  }

  // Smart Polling
  setInterval(async () => {
    if (state.isPolling) {
      try {
        const res = await fetch('/api/posts');
        const data = await res.json();
        if (data.success) {
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
  // 9. Toast Notification Utility (Clean & Non-disruptive)
  // =========================================================================

  function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'notification-item';
    
    const iconColor = type === 'success' ? '#10b981' : '#ef4444';
    const iconSvg = type === 'success' 
      ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
      : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

    toast.innerHTML = `
      <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: ${iconColor};">
        ${iconSvg}
      </svg>
      <span>${escapeHtml(msg)}</span>
    `;

    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 3000);
  }

  // Custom Confirm Modal Helper
  const domConfirmModal = document.getElementById('confirmModal');
  const domBtnConfirmCancel = document.getElementById('btnConfirmCancel');
  const domBtnConfirmOk = document.getElementById('btnConfirmOk');
  const domConfirmModalText = document.getElementById('confirmModalText');
  const domConfirmModalTitle = document.getElementById('confirmModalTitle');

  function showConfirmModal(title, text) {
    return new Promise((resolve) => {
      if (!domConfirmModal) return resolve(confirm(text)); // Fallback if HTML missing
      
      domConfirmModalTitle.textContent = title;
      domConfirmModalText.textContent = text;
      domConfirmModal.classList.add('open');
      
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      
      const cleanup = () => {
        domConfirmModal.classList.remove('open');
        domBtnConfirmOk.removeEventListener('click', onOk);
        domBtnConfirmCancel.removeEventListener('click', onCancel);
      };
      
      domBtnConfirmOk.addEventListener('click', onOk);
      domBtnConfirmCancel.addEventListener('click', onCancel);
    });
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
    if (!dateStr) return 'baru saja';
    const date = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return 'baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
    return `${Math.floor(diffSec / 86400)}h lalu`;
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
