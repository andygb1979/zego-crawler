const isAbortOrTimeout = (error) =>
  error instanceof Error &&
  (error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.name === 'CancelError' ||
    error.code === 'ERR_CANCELED' ||
    error.code === 'ETIMEDOUT');

module.exports = {
  isAbortOrTimeout,
};
