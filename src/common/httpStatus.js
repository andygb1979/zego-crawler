const HttpStatus = Object.freeze({
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  GONE: 410,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR_MIN: 500,
});

const HTTP_STATUS_DESCRIPTIONS = Object.freeze({
  [HttpStatus.UNAUTHORIZED]: 'unauthorized',
  [HttpStatus.FORBIDDEN]: 'access forbidden',
  [HttpStatus.NOT_FOUND]: 'page not found',
  [HttpStatus.GONE]: 'page gone',
  [HttpStatus.TOO_MANY_REQUESTS]: 'too many requests',
});

const HTTP_STATUS_ERROR_PATTERN = /^HTTP (\d{3})$/;

const getHttpStatusDescription = (status) => {
  if (status >= HttpStatus.SERVER_ERROR_MIN) {
    return 'server error';
  }

  return HTTP_STATUS_DESCRIPTIONS[status] ?? 'HTTP error';
};

const parseHttpStatusErrorMessage = (message) => {
  const match = message.match(HTTP_STATUS_ERROR_PATTERN);
  if (!match) {
    return null;
  }

  return Number(match[1]);
};

module.exports = {
  HttpStatus,
  getHttpStatusDescription,
  parseHttpStatusErrorMessage,
};
