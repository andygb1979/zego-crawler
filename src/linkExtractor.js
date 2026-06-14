const cheerio = require('cheerio');
const { normalizeUrl } = require('./lib/utils');

const linkExtractor = (module.exports = {});

linkExtractor.extractLinks = (html, pageUrl) => {
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
};
