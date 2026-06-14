const config = require('../config');

const _normalizeUrlWithOptions = (rawUrl, baseUrl, options) => {
  let parsed;

  try {
    parsed = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  const fetchableProtocols = new Set(options.fetchableProtocols);
  if (!fetchableProtocols.has(parsed.protocol)) return null;

  parsed.hash = '';

  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) parsed.pathname = parsed.pathname.slice(0, -1);

  return parsed.href;
};

const _isHtmlResponseWithOptions = (contentType, options) =>
  !contentType
    ? options.treatMissingContentTypeAsHtml
    : options.mediaTypes.includes(contentType.split(';')[0].trim().toLowerCase());

const _formatInvalidStartUrlError = (rawUrl, label = 'base URL') =>
  `Invalid ${label}: ${rawUrl}\n` +
  'Provide a full http:// or https:// URL. Wrap it in quotes if it contains & or spaces.';

const normalizeUrl = (rawUrl, baseUrl) =>
  _normalizeUrlWithOptions(rawUrl, baseUrl, {
    fetchableProtocols: config.getUrls().fetchableProtocols,
  });

const isSameHost = (url, host) => {
  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
};

const isHtmlResponse = (contentType) => _isHtmlResponseWithOptions(contentType, config.getHtml());

const parseStartUrl = (rawUrl, label = 'base URL') =>
  ((url) => (url ? { valid: true, url } : { valid: false, error: _formatInvalidStartUrlError(rawUrl, label) }))(
    normalizeUrl(rawUrl.trim()),
  );

module.exports = {
  normalizeUrl,
  isSameHost,
  isHtmlResponse,
  parseStartUrl,
};
