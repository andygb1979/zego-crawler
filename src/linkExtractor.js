import * as cheerio from 'cheerio';
import { normalizeUrl } from './urlUtils.js';

/**
 * Extract and normalise hyperlinks from anchor tags.
 */
export function extractLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((_, element) => {
    const rawValue = $(element).attr('href');
    if (!rawValue) {
      return;
    }

    const normalized = normalizeUrl(rawValue.trim(), pageUrl);
    if (normalized) {
      links.add(normalized);
    }
  });

  return [...links].sort();
}
