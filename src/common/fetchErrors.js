const FetchAbortReason = Object.freeze({
  ABORT_ERROR: 'AbortError',
  TIMEOUT_ERROR: 'TimeoutError',
  CANCEL_ERROR: 'CancelError',
  ERR_CANCELED: 'ERR_CANCELED',
  ETIMEDOUT: 'ETIMEDOUT',
});

const ABORT_OR_TIMEOUT_ERROR_NAMES = new Set([
  FetchAbortReason.ABORT_ERROR,
  FetchAbortReason.TIMEOUT_ERROR,
  FetchAbortReason.CANCEL_ERROR,
]);

const ABORT_OR_TIMEOUT_ERROR_CODES = new Set([
  FetchAbortReason.ERR_CANCELED,
  FetchAbortReason.ETIMEDOUT,
]);

const isAbortOrTimeout = (error) => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    ABORT_OR_TIMEOUT_ERROR_NAMES.has(error.name) ||
    ABORT_OR_TIMEOUT_ERROR_CODES.has(error.code)
  );
};

module.exports = {
  FetchAbortReason,
  isAbortOrTimeout,
};
