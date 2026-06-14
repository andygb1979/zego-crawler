const FETCHABLE_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Normalise a URL for deduplication and consistent output.
 * Strips fragments and trailing slashes (except on origin root).
 */
export function normalizeUrl(rawUrl, baseUrl) {
  let parsed;

  try {
    parsed = new URL(rawUrl, baseUrl);
  } catch {
    return null;
  }

  if (!FETCHABLE_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  parsed.hash = '';

  if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1);
  }

  return parsed.href;
}

export function isSameHost(url, host) {
  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
}

export function isHtmlResponse(contentType) {
  if (!contentType) {
    return true;
  }

  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  return mediaType === 'text/html' || mediaType === 'application/xhtml+xml';
}
