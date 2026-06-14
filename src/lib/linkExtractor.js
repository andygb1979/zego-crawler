const cheerio = require('cheerio');
const config = require('../config');
const utils = require('./utils');

const extractLinks = (html, pageUrl) => {
  const selector = config.getLinkExtractor().selector;
  const $ = cheerio.load(html);
  const links = new Set();

  $(selector).each((_index, element) => {
    const rawValue = $(element).attr('href');
    if (!rawValue) {
      return;
    }

    const normalized = utils.normalizeUrl(rawValue.trim(), pageUrl);
    if (normalized) {
      links.add(normalized);
    }
  });

  return [...links].sort();
};

module.exports = {
  extractLinks,
};
