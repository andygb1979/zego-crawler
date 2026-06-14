const mockFetch = (module.exports = {});

mockFetch.createMockResponse = ({
  url,
  status = 200,
  ok = true,
  contentType = 'text/html; charset=utf-8',
  body = '',
}) => ({
  ok,
  status,
  url,
  headers: {
    get(name) {
      if (name.toLowerCase() === 'content-type') {
        return contentType;
      }

      return null;
    },
  },
  text: async () => body,
});
