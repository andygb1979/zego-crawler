const isAbortOrTimeout = (error) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    error.name === 'CancelError' ||
    error.code === 'ERR_CANCELED' ||
    error.code === 'ETIMEDOUT'
  );
};

module.exports = {
  isAbortOrTimeout,
};
