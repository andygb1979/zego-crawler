// URL normalisation, same-host checks, and start-URL validation.

const config = require('../config');

const normalizeUrl = (rawUrl, baseUrl) => {
  let parsed;

  try {
    parsed = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  const allowedProtocols = config.getUrls().fetchableProtocols;
  if (!allowedProtocols.includes(parsed.protocol)) return null;

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

const isHtmlResponse = (contentType) => {
  const htmlConfig = config.getHtml();

  if (!contentType) return htmlConfig.treatMissingContentTypeAsHtml;

  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return htmlConfig.mediaTypes.includes(mediaType);
};

const parseStartUrl = (rawUrl, label = 'base URL') => {
  const url = normalizeUrl(rawUrl.trim());

  if (url) return { valid: true, url };

  return {
    valid: false,
    error:
      `Invalid ${label}: ${rawUrl}\n` +
      'Provide a full http:// or https:// URL. Wrap it in quotes if it contains & or spaces.',
  };
};

module.exports = {
  normalizeUrl,
  isSameHost,
  isHtmlResponse,
  parseStartUrl,
};
