const gotModule = require('got');
const got = gotModule.default ?? gotModule;
const { isAbortOrTimeout } = require('../common/fetchErrors');
const { RedirectMode } = require('../common/httpConstants');

const toPageResponse = (response) => {
  const getHeader = (name) => {
    const value = response.headers[name.toLowerCase()];

    if (value === undefined) {
      return null;
    }

    return Array.isArray(value) ? (value[0] ?? null) : String(value);
  };

  return {
    ok: response.statusCode >= 200 && response.statusCode < 300,
    status: response.statusCode,
    url: response.url,
    headers: { get: getHeader },
    text: async () => response.body,
  };
};

const createGotPageFetcher = () => ({
  fetch: async (url, options) => {
    try {
      const response = await got(url, {
        timeout: { request: options.timeoutMs },
        headers: {
          Accept: options.acceptHeader,
          'User-Agent': options.userAgent,
        },
        followRedirect: options.redirect === RedirectMode.FOLLOW,
        throwHttpErrors: false,
        signal: options.signal,
      });

      return toPageResponse(response);
    } catch (error) {
      if (isAbortOrTimeout(error)) {
        throw new Error('request timed out or aborted');
      }

      throw error;
    }
  },
});

module.exports = {
  createGotPageFetcher,
};
