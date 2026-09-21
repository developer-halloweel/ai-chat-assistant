/**
 * api.js — Backend API Client
 * Handles all HTTP requests and SSE streaming communication with the backend.
 * All business logic validation happens on the server; this module is purely transport.
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Stream a chat message via Server-Sent Events.
 *
 * @param {Object} params
 * @param {string} params.prompt           - User message text
 * @param {string|null} params.conversationId - Existing conversation ID (null for new)
 * @param {string} params.tone             - 'professional' | 'casual' | 'concise'
 * @param {Function} params.onConversationId - Called with (id) when server assigns it
 * @param {Function} params.onToken        - Called with each streamed token string
 * @param {Function} params.onDone         - Called with ({ conversationId, title }) on completion
 * @param {Function} params.onError        - Called with error message string on failure
 * @returns {Function} abort — call to cancel the stream
 */
const streamMessage = ({ prompt, conversationId, tone, onConversationId, onToken, onDone, onError }) => {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ prompt, conversationId, tone }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Server error' }));
        onError(err.error || 'Failed to connect to AI');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line in buffer

        let event = null;
        let data = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              data = JSON.parse(line.slice(6));
            } catch {
              data = null;
            }

            if (event && data !== null) {
              switch (event) {
                case 'conversation_id':
                  onConversationId(data.conversationId);
                  break;
                case 'token':
                  onToken(data.token);
                  break;
                case 'done':
                  onDone({ conversationId: data.conversationId, title: data.title });
                  break;
                case 'error':
                  onError(data.message || 'An error occurred');
                  break;
              }
              event = null;
              data = null;
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Network error — is the backend running?');
      }
    }
  })();

  return () => controller.abort();
};

/**
 * Fetch the list of all conversations (sidebar history).
 * @returns {Promise<Array>} Array of conversation summary objects
 */
const fetchConversations = async () => {
  const response = await fetch(`${API_BASE}/conversations`);
  if (!response.ok) throw new Error('Failed to load conversation history');
  const data = await response.json();
  return data.conversations;
};

/**
 * Fetch a single conversation by ID, including all messages.
 * @param {string} id - Conversation MongoDB ObjectId
 * @returns {Promise<Object>} Full conversation object
 */
const fetchConversation = async (id) => {
  const response = await fetch(`${API_BASE}/conversations/${id}`);
  if (!response.ok) throw new Error('Failed to load conversation');
  const data = await response.json();
  return data.conversation;
};

/**
 * Delete a conversation by ID.
 * @param {string} id - Conversation MongoDB ObjectId
 * @returns {Promise<void>}
 */
const deleteConversation = async (id) => {
  const response = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete conversation');
};

// Expose globally for other modules
window.ChatAPI = { streamMessage, fetchConversations, fetchConversation, deleteConversation };
