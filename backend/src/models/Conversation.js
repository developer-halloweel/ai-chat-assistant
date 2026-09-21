const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
      maxlength: 100,
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'concise'],
      default: 'professional',
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Auto-generate title from the first user message (max 60 chars)
ConversationSchema.methods.generateTitle = function () {
  const firstUserMsg = this.messages.find((m) => m.role === 'user');
  if (firstUserMsg) {
    this.title =
      firstUserMsg.content.length > 60
        ? firstUserMsg.content.substring(0, 57) + '...'
        : firstUserMsg.content;
  }
};

// Virtual for message count
ConversationSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

module.exports = mongoose.model('Conversation', ConversationSchema);
