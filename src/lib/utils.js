const config = require('../config');

const normalizeUrlWithOptions = (rawUrl, baseUrl, options) => {
  let parsed;

  try {
    parsed = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  const fetchableProtocols = new Set(options.fetchableProtocols);
  if (!fetchableProtocols.has(parsed.protocol)) {
    return null;
  }

  parsed.hash = '';

  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.href;
};

const isSameHost = (url, host) => {
  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
};

const isHtmlResponseWithOptions = (contentType, options) => {
  if (!contentType) {
    return options.treatMissingContentTypeAsHtml;
  }

  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return options.mediaTypes.includes(mediaType);
};

const formatInvalidStartUrlError = (rawUrl, label = 'base URL') =>
  `Invalid ${label}: ${rawUrl}\n` +
  'Provide a full http:// or https:// URL. Wrap it in quotes if it contains & or spaces.';

const normalizeUrl = (rawUrl, baseUrl) =>
  normalizeUrlWithOptions(rawUrl, baseUrl, {
    fetchableProtocols: config.getUrls().fetchableProtocols,
  });

const isHtmlResponse = (contentType) =>
  isHtmlResponseWithOptions(contentType, config.getHtml());

const parseStartUrl = (rawUrl, label = 'base URL') => {
  const url = normalizeUrl(rawUrl.trim());
  if (!url) {
    return { valid: false, error: formatInvalidStartUrlError(rawUrl, label) };
  }

  return { valid: true, url };
};

module.exports = {
  normalizeUrl,
  isSameHost,
  isHtmlResponse,
  parseStartUrl,
};
