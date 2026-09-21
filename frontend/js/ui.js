/**
 * ui.js — DOM Rendering & Chat Bubble Management
 * Responsible for all visual output: message bubbles, streaming cursor,
 * welcome screen toggling, and toast notifications. Pure presentation layer.
 */

const UI = (() => {
  // ── Element references ───────────────────────────────────────
  const messagesContainer  = document.getElementById('messages-container');
  const messagesViewport   = document.getElementById('messages-viewport');
  const welcomeScreen      = document.getElementById('welcome-screen');
  const streamingIndicator = document.getElementById('streaming-indicator');
  const chatTitle          = document.getElementById('chat-title');
  const toastContainer     = document.getElementById('toast-container');

  let activeStreamingBubble = null; // The AI bubble currently being streamed into
  let activeStreamingCursor = null; // The blinking cursor element

  // ── Welcome Screen ────────────────────────────────────────────
  const showWelcome = () => {
    welcomeScreen.style.display = 'flex';
    messagesContainer.style.display = 'none';
  };

  const hideWelcome = () => {
    welcomeScreen.style.display = 'none';
    messagesContainer.style.display = 'flex';
  };

  // ── Chat Title ────────────────────────────────────────────────
  const setTitle = (title) => {
    chatTitle.textContent = title || 'New Conversation';
  };

  // ── Streaming Indicator (thinking dots) ──────────────────────
  const showStreamingIndicator = () => {
    streamingIndicator.classList.add('visible');
  };

  const hideStreamingIndicator = () => {
    streamingIndicator.classList.remove('visible');
  };

  // ── Message Rendering ─────────────────────────────────────────
  /**
   * Format a timestamp into a readable short form.
   */
  const formatTime = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Render a single user message bubble.
   * @param {string} content - Message text
   * @param {string} [timestamp] - Optional ISO timestamp
   */
  const renderUserBubble = (content, timestamp) => {
    hideWelcome();

    const row = document.createElement('div');
    row.className = 'message-row user';
    row.innerHTML = `
      <div class="avatar user-avatar" aria-label="You">Y</div>
      <div class="message-content">
        <div class="bubble user-bubble" role="article" aria-label="Your message">${escapeHtml(content)}</div>
        <span class="message-time">${formatTime(timestamp)}</span>
      </div>
    `;
    messagesContainer.appendChild(row);
    scrollToBottom();
    return row;
  };

  /**
   * Create an AI bubble ready for streaming content into.
   * Returns the bubble element so tokens can be appended to it.
   */
  const createAIStreamingBubble = () => {
    hideWelcome();

    const row = document.createElement('div');
    row.className = 'message-row ai';
    row.innerHTML = `
      <div class="avatar ai-avatar" aria-label="AI">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="bubble ai-bubble" role="article" aria-label="AI response" aria-live="polite"></div>
        <span class="message-time"></span>
      </div>
    `;

    messagesContainer.appendChild(row);

    const bubble = row.querySelector('.bubble.ai-bubble');
    const cursor = document.createElement('span');
    cursor.className = 'streaming-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    bubble.appendChild(cursor);

    activeStreamingBubble = bubble;
    activeStreamingCursor = cursor;

    scrollToBottom();
    return { row, bubble };
  };

  /**
   * Append a single token to the active streaming bubble.
   * Keeps the cursor at the end.
   * @param {string} token - A single token/chunk of text
   */
  const appendToken = (token) => {
    if (!activeStreamingBubble || !activeStreamingCursor) return;

    // Remove cursor, append text node, re-add cursor
    activeStreamingCursor.remove();
    const textNode = document.createTextNode(token);
    activeStreamingBubble.appendChild(textNode);
    activeStreamingBubble.appendChild(activeStreamingCursor);

    scrollToBottom();
  };

  /**
   * Finalize the streaming bubble: remove cursor, apply markdown formatting, set time.
   * @param {string} [timestamp] - Completion timestamp
   */
  const finalizeStreamingBubble = (timestamp) => {
    if (!activeStreamingBubble) return;

    // Remove cursor
    activeStreamingCursor?.remove();
    activeStreamingCursor = null;

    // Apply lightweight markdown rendering
    const rawText = activeStreamingBubble.innerText;
    activeStreamingBubble.innerHTML = renderMarkdown(rawText);

    // Set timestamp on sibling .message-time
    const timeEl = activeStreamingBubble.closest('.message-content')?.querySelector('.message-time');
    if (timeEl) timeEl.textContent = formatTime(timestamp);

    activeStreamingBubble = null;
    scrollToBottom();
  };

  /**
   * Render a complete conversation (history load) — clears and rebuilds all bubbles.
   * @param {Array} messages - Array of {role, content, timestamp} objects
   */
  const renderConversation = (messages) => {
    messagesContainer.innerHTML = '';

    if (!messages || messages.length === 0) {
      showWelcome();
      return;
    }

    hideWelcome();
    messages.forEach((msg) => {
      if (msg.role === 'user') {
        renderUserBubble(msg.content, msg.timestamp);
      } else {
        renderCompletedAIBubble(msg.content, msg.timestamp);
      }
    });
    scrollToBottom();
  };

  /**
   * Render a complete (non-streaming) AI bubble (used for history reload).
   */
  const renderCompletedAIBubble = (content, timestamp) => {
    const row = document.createElement('div');
    row.className = 'message-row ai';
    row.innerHTML = `
      <div class="avatar ai-avatar" aria-label="AI">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
        </svg>
      </div>
      <div class="message-content">
        <div class="bubble ai-bubble" role="article" aria-label="AI response">${renderMarkdown(content)}</div>
        <span class="message-time">${formatTime(timestamp)}</span>
      </div>
    `;
    messagesContainer.appendChild(row);
  };

  // ── Scroll ────────────────────────────────────────────────────
  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesViewport.scrollTop = messagesViewport.scrollHeight;
    });
  };

  // ── Markdown Renderer ─────────────────────────────────────────
  /**
   * Lightweight markdown-to-HTML renderer for AI responses.
   * Handles: code blocks, inline code, bold, italic, lists, headers.
   */
  const renderMarkdown = (text) => {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks (``` ... ```)
    html = html.replace(/```([a-z]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code (`...`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**...**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic (*...*)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headers (## or ###)
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');

    // Unordered lists
    html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs (double newlines)
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return html;
  };

  // ── Toast Notifications ───────────────────────────────────────
  /**
   * Show a toast notification.
   * @param {string} message - Message to display
   * @param {'info'|'success'|'error'} [type='info'] - Toast type
   * @param {number} [duration=3500] - Auto-dismiss delay in ms
   */
  const showToast = (message, type = 'info', duration = 3500) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  };

  // ── Utilities ─────────────────────────────────────────────────
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  const clearMessages = () => {
    messagesContainer.innerHTML = '';
    showWelcome();
  };

  // Public API
  return {
    showWelcome,
    hideWelcome,
    setTitle,
    showStreamingIndicator,
    hideStreamingIndicator,
    renderUserBubble,
    createAIStreamingBubble,
    appendToken,
    finalizeStreamingBubble,
    renderConversation,
    clearMessages,
    scrollToBottom,
    showToast,
  };
})();

window.UI = UI;
