const nodeConfig = require('config');

const getCrawler = () => nodeConfig.get('crawler');

const getUrls = () => nodeConfig.get('urls');

const getHtml = () => nodeConfig.get('html');

const getLinkExtractor = () => nodeConfig.get('linkExtractor');

// Merge CLI/runtime overrides with defaults from default.json.
const getResolvedCrawlerOptions = (options = {}) => {
  const crawlerConfig = getCrawler();

  return {
    concurrency: options.concurrency ?? crawlerConfig.concurrency,
    timeoutMs: options.timeoutMs ?? crawlerConfig.timeoutMs,
    maxPages: options.maxPages ?? crawlerConfig.maxPages ?? Number.POSITIVE_INFINITY,
  };
};

module.exports = {
  getCrawler,
  getUrls,
  getHtml,
  getLinkExtractor,
  getResolvedCrawlerOptions,
};
