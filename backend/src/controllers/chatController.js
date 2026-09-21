const Conversation = require('../models/Conversation');
const { streamChatCompletion } = require('../services/aiService');

/**
 * POST /api/chat/stream
 * Streams an AI response via Server-Sent Events (SSE).
 * Saves the full conversation (user prompt + AI response) to MongoDB after streaming completes.
 */
const streamChat = async (req, res) => {
  const { prompt, conversationId, tone = 'professional' } = req.body;

  // --- Validate inputs ---
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string.' });
  }

  const validTones = ['professional', 'casual', 'concise'];
  const selectedTone = validTones.includes(tone) ? tone : 'professional';

  // --- Set SSE headers ---
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // --- Load or create conversation ---
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        sendEvent('error', { message: 'Conversation not found.' });
        return res.end();
      }
    } else {
      conversation = new Conversation({ tone: selectedTone });
    }

    // Update tone if changed mid-conversation
    conversation.tone = selectedTone;

    // Add user message to history
    const userMessage = { role: 'user', content: prompt.trim(), timestamp: new Date() };
    conversation.messages.push(userMessage);

    // Emit the new conversationId immediately so the frontend can track it
    sendEvent('conversation_id', { conversationId: conversation._id.toString() });

    // --- Stream AI response token by token ---
    let fullResponse = '';

    const fullResponse_result = await streamChatCompletion(
      selectedTone,
      conversation.messages.slice(0, -1), // history excluding the just-added user msg
      prompt.trim(),
      (token) => {
        fullResponse += token;
        sendEvent('token', { token });
      }
    );

    // --- Save AI response to DB ---
    const assistantMessage = {
      role: 'assistant',
      content: fullResponse_result,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);

    // Auto-generate title from first user message
    if (conversation.messages.filter((m) => m.role === 'user').length === 1) {
      conversation.generateTitle();
    }

    await conversation.save();

    // Signal stream completion
    sendEvent('done', {
      conversationId: conversation._id.toString(),
      title: conversation.title,
    });

    res.end();
  } catch (error) {
    console.error('Stream error:', error.message);
    sendEvent('error', { message: error.message || 'Failed to get AI response.' });
    res.end();
  }
};

/**
 * GET /api/conversations
 * Returns a list of all conversations (metadata only, no full message bodies).
 */
const getConversations = async (req, res) => {
  const conversations = await Conversation.find(
    {},
    { title: 1, tone: 1, createdAt: 1, updatedAt: 1, 'messages': { $slice: -1 } }
  )
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json({ conversations });
};

/**
 * GET /api/conversations/:id
 * Returns a single conversation with all messages.
 */
const getConversation = async (req, res) => {
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  res.json({ conversation });
};

/**
 * DELETE /api/conversations/:id
 * Deletes a conversation by ID.
 */
const deleteConversation = async (req, res) => {
  const result = await Conversation.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }
  res.json({ message: 'Conversation deleted successfully.' });
};

module.exports = { streamChat, getConversations, getConversation, deleteConversation };
