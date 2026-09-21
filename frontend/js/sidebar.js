/**
 * sidebar.js — History Sidebar Management
 * Renders the conversation list, handles search filtering,
 * and manages active selection state.
 */

const Sidebar = (() => {
  const conversationList = document.getElementById('conversation-list');
  const sidebarEmpty     = document.getElementById('sidebar-empty');
  const sidebarStats     = document.getElementById('sidebar-stats');
  const searchInput      = document.getElementById('sidebar-search-input');

  let allConversations = [];
  let activeId = null;

  // ── Tone emoji map ────────────────────────────────────────────
  const TONE_ICONS = {
    professional: '💼',
    casual: '💬',
    concise: '⚡',
  };

  // ── Relative time formatter ───────────────────────────────────
  const relativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ── Load conversations from API ───────────────────────────────
  const load = async () => {
    try {
      allConversations = await window.ChatAPI.fetchConversations();
      render(allConversations);
    } catch (err) {
      console.warn('Sidebar: failed to load conversations', err.message);
    }
  };

  // ── Prepend a newly created conversation to the list ─────────
  const prepend = (conversation) => {
    // Remove duplicate if already exists
    allConversations = allConversations.filter(c => c._id !== conversation._id);
    allConversations.unshift(conversation);
    render(allConversations);
    setActive(conversation._id);
  };

  // ── Update an existing conversation's title ───────────────────
  const updateTitle = (id, title, tone) => {
    const idx = allConversations.findIndex(c => c._id === id);
    if (idx !== -1) {
      allConversations[idx].title = title;
      allConversations[idx].tone = tone;
      allConversations[idx].updatedAt = new Date().toISOString();
      render(allConversations);
      setActive(id);
    }
  };

  // ── Remove a conversation from the list ──────────────────────
  const remove = (id) => {
    allConversations = allConversations.filter(c => c._id !== id);
    render(allConversations);
    if (activeId === id) activeId = null;
  };

  // ── Set active conversation highlight ────────────────────────
  const setActive = (id) => {
    activeId = id;
    document.querySelectorAll('.convo-item').forEach(el => {
      el.classList.toggle('active', el.dataset.id === id);
    });
  };

  // ── Render conversation list ──────────────────────────────────
  const render = (conversations) => {
    // Clear existing items (keep sidebarEmpty hidden/shown by count)
    conversationList.innerHTML = '';

    if (!conversations || conversations.length === 0) {
      sidebarEmpty.style.display = 'flex';
      sidebarStats.textContent = '';
      return;
    }

    sidebarEmpty.style.display = 'none';
    sidebarStats.textContent = `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`;

    conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = `convo-item${conv._id === activeId ? ' active' : ''}`;
      item.dataset.id = conv._id;
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-label', `Conversation: ${conv.title}`);

      const icon = TONE_ICONS[conv.tone] || '💬';
      const timeStr = relativeTime(conv.updatedAt || conv.createdAt);

      item.innerHTML = `
        <div class="convo-icon" aria-hidden="true">${icon}</div>
        <div class="convo-info">
          <div class="convo-title">${escapeHtml(conv.title || 'Untitled')}</div>
          <div class="convo-meta">
            <span class="tone-badge ${conv.tone}">${conv.tone}</span>
            <span>·</span>
            <span>${timeStr}</span>
          </div>
        </div>
        <button
          class="btn-delete-convo"
          data-id="${conv._id}"
          title="Delete conversation"
          aria-label="Delete conversation: ${escapeHtml(conv.title || 'Untitled')}"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
            <path d="M10 11v6M14 11v6"></path>
          </svg>
        </button>
      `;

      // Click to open conversation
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-convo')) return;
        document.dispatchEvent(new CustomEvent('openConversation', { detail: { id: conv._id } }));
      });

      // Keyboard support
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          document.dispatchEvent(new CustomEvent('openConversation', { detail: { id: conv._id } }));
        }
      });

      // Delete button
      const deleteBtn = item.querySelector('.btn-delete-convo');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.dispatchEvent(new CustomEvent('deleteConversation', { detail: { id: conv._id } }));
      });

      conversationList.appendChild(item);
    });
  };

  // ── Search filtering ──────────────────────────────────────────
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      render(allConversations);
      return;
    }
    const filtered = allConversations.filter(c =>
      (c.title || '').toLowerCase().includes(query)
    );
    render(filtered);
  });

  // ── Utilities ─────────────────────────────────────────────────
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  return { load, prepend, updateTitle, remove, setActive, render };
})();

window.Sidebar = Sidebar;
