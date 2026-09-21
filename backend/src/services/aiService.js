const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder-replace-with-your-key',
});

/**
 * Tone system instructions injected as system prompt modifiers.
 * Each tone drastically changes the AI's response style.
 */
const TONE_INSTRUCTIONS = {
  professional: `You are a highly professional AI assistant. 
Your responses must be:
- Formal, structured, and precise
- Use clear headings or numbered steps when appropriate
- Avoid contractions, slang, or informal language
- Demonstrate expertise and depth
- Provide thorough, well-reasoned answers`,

  casual: `You are a friendly, conversational AI assistant — like a knowledgeable friend.
Your responses must be:
- Warm, relaxed, and approachable
- Use contractions freely (you're, it's, that's)
- Feel free to use informal language and light humor where appropriate
- Keep it natural and easy to read
- Be encouraging and supportive`,

  concise: `You are a concise AI assistant that values brevity above all.
Your responses must be:
- As short as possible while still being accurate and helpful
- Use bullet points or numbered lists instead of paragraphs
- Eliminate all filler words and unnecessary explanation
- Lead with the answer, then add minimal context only if essential
- Never repeat information`,
};

/**
 * Build the messages array for OpenAI API including system instruction.
 * @param {string} tone - 'professional' | 'casual' | 'concise'
 * @param {Array} history - Array of {role, content} message objects
 * @param {string} userPrompt - The new user message
 */
const buildMessages = (tone, history, userPrompt) => {
  const systemInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;

  const messages = [
    { role: 'system', content: systemInstruction },
    // Include conversation history (last 20 messages to stay within context limit)
    ...history.slice(-20).map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userPrompt },
  ];

  return messages;
};

/**
 * Stream a chat completion from OpenAI.
 * Calls onToken() for each streamed token and returns the full response.
 *
 * @param {string} tone - Tone mode ('professional' | 'casual' | 'concise')
 * @param {Array} history - Prior conversation messages
 * @param {string} userPrompt - The new user prompt
 * @param {Function} onToken - Callback called with each token string as it streams
 * @returns {Promise<string>} - The complete assistant response text
 */
const streamChatCompletion = async (tone, history, userPrompt, onToken) => {
  const messages = buildMessages(tone, history, userPrompt);

  const stream = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    messages,
    stream: true,
    temperature: tone === 'concise' ? 0.3 : 0.7,
    max_tokens: tone === 'concise' ? 500 : 1500,
  });

  let fullResponse = '';

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || '';
    if (token) {
      fullResponse += token;
      onToken(token);
    }
  }

  return fullResponse;
};

module.exports = { streamChatCompletion, TONE_INSTRUCTIONS };
