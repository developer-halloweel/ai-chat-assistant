/**
 * app.js — Application Entry Point & State Management
 * Wires together UI, API, and Sidebar modules.
 * Manages application state: currentConversationId, tone, isStreaming.
 * All business logic and validation occurs server-side; this file handles
 * user interaction events and presentation state only.
 */

(() => {
  'use strict';

  // ── Application State ─────────────────────────────────────────
  const state = {
    currentConversationId: null,
    tone: 'professional',
    isStreaming: false,
    abortStream: null,   // Function to cancel active SSE stream
  };

  // ── Element References ────────────────────────────────────────
  const messageInput     = document.getElementById('message-input');
  const btnSend          = document.getElementById('btn-send');
  const btnNewChat       = document.getElementById('btn-new-chat');
  const btnSidebarToggle = document.getElementById('btn-sidebar-toggle');
  const sidebar          = document.getElementById('sidebar');
  const toneBtns         = document.querySelectorAll('.tone-btn');
  const charCount        = document.getElementById('char-count');
  const welcomeChips     = document.querySelectorAll('.chip');

  // ── Initialise ────────────────────────────────────────────────
  const init = async () => {
    setupToneToggle();
    setupInputHandlers();
    setupSidebarToggle();
    setupChips();
    setupCustomEvents();
    await Sidebar.load();
    autoResizeTextarea();
  };

  // ── Tone Toggle ───────────────────────────────────────────────
  const setupToneToggle = () => {
    toneBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const newTone = btn.dataset.tone;
        if (newTone === state.tone) return;

        state.tone = newTone;

        toneBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        UI.showToast(`Tone switched to ${capitalize(newTone)}`, 'info', 2000);
      });
    });
  };

  // ── Input Handlers ────────────────────────────────────────────
  const setupInputHandlers = () => {
    // Enable/disable send button based on content
    messageInput.addEventListener('input', () => {
      const text = messageInput.value.trim();
      btnSend.disabled = text.length === 0 || state.isStreaming;
      updateCharCount(messageInput.value.length);
      autoResizeTextarea();
    });

    // Enter to send (Shift+Enter for newline)
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!btnSend.disabled) sendMessage();
      }
    });

    // Send button click
    btnSend.addEventListener('click', () => {
      if (!btnSend.disabled) sendMessage();
    });

    // New chat button
    btnNewChat.addEventListener('click', startNewConversation);
  };

  // ── Sidebar Toggle ────────────────────────────────────────────
  const setupSidebarToggle = () => {
    btnSidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  };

  // ── Welcome Chips (quick prompts) ─────────────────────────────
  const setupChips = () => {
    welcomeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (prompt) {
          messageInput.value = prompt;
          messageInput.dispatchEvent(new Event('input'));
          messageInput.focus();
        }
      });
    });
  };

  // ── Custom DOM Events (from Sidebar module) ───────────────────
  const setupCustomEvents = () => {
    document.addEventListener('openConversation', async (e) => {
      await loadConversation(e.detail.id);
    });

    document.addEventListener('deleteConversation', async (e) => {
      await handleDeleteConversation(e.detail.id);
    });
  };

  // ── Core: Send Message ────────────────────────────────────────
  const sendMessage = async () => {
    const prompt = messageInput.value.trim();
    if (!prompt || state.isStreaming) return;

    // Clear input immediately
    messageInput.value = '';
    updateCharCount(0);
    autoResizeTextarea();
    setStreaming(true);

    // Render user bubble
    UI.renderUserBubble(prompt);

    // Create AI streaming bubble
    UI.createAIStreamingBubble();
    UI.showStreamingIndicator();

    const conversationIdAtStart = state.currentConversationId;

    state.abortStream = ChatAPI.streamMessage({
      prompt,
      conversationId: conversationIdAtStart,
      tone: state.tone,

      onConversationId: (id) => {
        // Server assigned a conversation ID — store it
        if (!state.currentConversationId) {
          state.currentConversationId = id;
        }
      },

      onToken: (token) => {
        UI.appendToken(token);
      },

      onDone: ({ conversationId, title }) => {
        state.currentConversationId = conversationId;

        UI.finalizeStreamingBubble();
        UI.hideStreamingIndicator();
        UI.setTitle(title);
        setStreaming(false);

        // Update sidebar
        const convSummary = {
          _id: conversationId,
          title: title,
          tone: state.tone,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        // Check if this is an existing or new conversation
        Sidebar.updateTitle(conversationId, title, state.tone);

        // If not found in sidebar (new conversation), prepend it
        const existing = document.querySelector(`.convo-item[data-id="${conversationId}"]`);
        if (!existing) {
          Sidebar.prepend(convSummary);
        }
      },

      onError: (message) => {
        UI.finalizeStreamingBubble();
        UI.hideStreamingIndicator();
        UI.showToast(message || 'Something went wrong', 'error');
        setStreaming(false);
      },
    });
  };

  // ── Load existing conversation ────────────────────────────────
  const loadConversation = async (id) => {
    if (state.isStreaming) {
      UI.showToast('Please wait for the current response to finish.', 'info');
      return;
    }

    try {
      const conversation = await ChatAPI.fetchConversation(id);

      state.currentConversationId = conversation._id;
      state.tone = conversation.tone || 'professional';

      // Update tone buttons to match loaded conversation
      toneBtns.forEach((btn) => {
        const isActive = btn.dataset.tone === state.tone;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      UI.setTitle(conversation.title);
      UI.renderConversation(conversation.messages);
      Sidebar.setActive(id);
    } catch (err) {
      UI.showToast('Failed to load conversation', 'error');
      console.error(err);
    }
  };

  // ── Delete conversation ───────────────────────────────────────
  const handleDeleteConversation = async (id) => {
    const confirmDelete = confirm('Delete this conversation? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      await ChatAPI.deleteConversation(id);
      Sidebar.remove(id);

      // If we deleted the active conversation, start fresh
      if (state.currentConversationId === id) {
        startNewConversation();
      }

      UI.showToast('Conversation deleted', 'success');
    } catch (err) {
      UI.showToast('Failed to delete conversation', 'error');
      console.error(err);
    }
  };

  // ── New Conversation ──────────────────────────────────────────
  const startNewConversation = () => {
    if (state.isStreaming) {
      state.abortStream?.();
      state.isStreaming = false;
    }

    state.currentConversationId = null;
    UI.clearMessages();
    UI.setTitle('New Conversation');
    UI.hideStreamingIndicator();
    Sidebar.setActive(null);
    messageInput.focus();
  };

  // ── Streaming state management ────────────────────────────────
  const setStreaming = (active) => {
    state.isStreaming = active;
    btnSend.disabled = active;
    messageInput.disabled = active;
    if (active) {
      btnSend.setAttribute('aria-label', 'AI is responding...');
    } else {
      btnSend.setAttribute('aria-label', 'Send message');
      messageInput.focus();
      // Re-evaluate send button state
      btnSend.disabled = messageInput.value.trim().length === 0;
    }
  };

  // ── Character Count ───────────────────────────────────────────
  const updateCharCount = (len) => {
    const max = 4000;
    if (len === 0) {
      charCount.textContent = '';
      charCount.className = 'char-count';
      return;
    }
    charCount.textContent = `${len}/${max}`;
    charCount.className = 'char-count' +
      (len > max * 0.9 ? ' danger' : len > max * 0.75 ? ' warning' : '');
  };

  // ── Auto-resize textarea ──────────────────────────────────────
  const autoResizeTextarea = () => {
    messageInput.style.height = 'auto';
    const newHeight = Math.min(messageInput.scrollHeight, 160);
    messageInput.style.height = `${newHeight}px`;
  };

  // ── Utilities ─────────────────────────────────────────────────
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // ── Boot ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);
})();
