const testDefaults = require('./defaults');
const { HttpHeader } = require('../../src/common/httpConstants');

const createMockResponse = ({
  url,
  status = 200,
  ok = true,
  contentType = testDefaults.contentTypes.html,
  body = '',
}) => ({
  ok,
  status,
  url,
  headers: {
    get(name) {
      if (name.toLowerCase() === HttpHeader.CONTENT_TYPE) {
        return contentType;
      }

      return null;
    },
  },
  text: async () => body,
});

const createMockPageFetcher = (handler) => ({
  fetch: async (url, options) => {
    if (options.signal.aborted) {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }

    return handler(url, options);
  },
});

module.exports = {
  createMockResponse,
  createMockPageFetcher,
};
