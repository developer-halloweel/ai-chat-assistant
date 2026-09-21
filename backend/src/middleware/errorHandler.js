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

  // OpenAI API errors
  if (err.status && err.error) {
    return res.status(err.status).json({
      error: 'AI API Error',
      message: err.error.message || 'Failed to communicate with AI provider.',
    });
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong.',
  });
};

module.exports = errorHandler;
