/**
 * Global Error Handling Middleware
 * Centralized logic to catch, log, and format error responses across the CQRS pipelines.
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error for internal debugging
  console.error(`[GlobalErrorHandler] ${err.name || 'Error'}: ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const message = err.message || 'Internal Server Error';

  // Domain-specific Error Handling for CQRS
  if (message.startsWith('ValidationException')) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: message.replace('ValidationException: ', '').trim()
    });
  }

  if (message.startsWith('ConcurrencyException')) {
    return res.status(409).json({
      status: 'error',
      code: 'CONCURRENCY_CONFLICT',
      message: message.replace('ConcurrencyException: ', '').trim()
    });
  }

  if (message.startsWith('NotFoundException')) {
    return res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: message.replace('NotFoundException: ', '').trim()
    });
  }

  // Fallback for unhandled exceptions
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : message
  });
};

/**
 * 404 Not Found Handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: 'error',
    code: 'ENDPOINT_NOT_FOUND',
    message: `The requested endpoint [${req.method}] ${req.originalUrl} does not exist.`
  });
};
