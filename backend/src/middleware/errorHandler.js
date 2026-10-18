/** Global error handler. */
export function errorHandler(err, req, res, _next) {
  console.error(JSON.stringify({
    time: new Date().toISOString(),
    level: 'error',
    message: err.message,
    stack: err.stack?.split('\n').slice(0, 3).join(' | '),
  }));

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: {
      message: status === 500 ? 'Internal server error' : err.message,
      details: err.details || null,
    },
  });
}

/** Create an error with a status code. */
export function createError(status, message, details = null) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
