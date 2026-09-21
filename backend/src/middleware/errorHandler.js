/**
 * Global error handler middleware.
 * Catches errors thrown in async route handlers (via express-async-errors).
 */
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format.' });
  }

  // AI provider errors (Ollama connection refused, model not found, etc.)
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    return res.status(503).json({
      error: 'AI Provider Unavailable',
      message: 'Cannot connect to Ollama. Make sure it is running: ollama serve',
    });
  }

  // Ollama model not found
  if (err.status === 404 || err.message?.includes('model')) {
    return res.status(503).json({
      error: 'Model Not Found',
      message: `Model not available. Pull it with: ollama pull llama3.2`,
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
  });
};

module.exports = errorHandler;
