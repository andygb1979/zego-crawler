//   1. createCrawler(baseUrl) — validate URL, create queue with the start page
//   2. run() — fetch pages from the queue (several at once, up to concurrency limit)
//   3. Each page — fetch, print the URL and its links, add same-host links to the queue
//   4. When the queue is empty and nothing is in flight, run()'s promise resolves

const config = require('./config');
const linkExtractor = require('./lib/linkExtractor');
const pageFetcher = require('./lib/pageFetcher');
const { isAbortOrTimeout } = require('./common/fetchErrors');
const { getHttpStatusDescription, parseHttpStatusErrorMessage } = require('./common/httpStatus');
const { HttpHeader } = require('./common/httpConstants');
const utils = require('./lib/utils');

const _printPage = (pageUrl, links) => {
  console.log(pageUrl);
  links.forEach((link) => console.log(`  ${link}`));
  console.log('');
};

const _printError = (url, message) => {
  const status = parseHttpStatusErrorMessage(message);

  if (status !== null) {
    console.log(`Skipped ${url}: ${getHttpStatusDescription(status)} (HTTP ${status})`);
    return;
  }

  console.error(`Error crawling ${url}: ${message}`);
};

const _fetchPage = async (state, url, fetchPage) => {
  try {
    const response = await fetchPage(url, {
      timeoutMs: state.timeoutMs,
      acceptHeader: state.acceptHeader,
      userAgent: state.userAgent,
      redirect: state.redirect,
      signal: state.abortController.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return response;
  } catch (error) {
    if (isAbortOrTimeout(error)) throw new Error('request timed out or aborted');

    throw error;
  }
};

// Only same-hostname http(s) links are added. visited = already fetching; queued = waiting to be crawled
const _addToQueue = (state, url) => {
  if (state.visited.has(url) || state.queued.has(url)) return;
  if (!utils.isSameHost(url, state.host)) return;

  state.queued.add(url);
  state.queue.push(url);
};

const _finishIfDone = (state) => {
  if (state.finished) return;
  if (state.inFlight > 0) return;
  if (state.queue.length > 0 && !state.stopped) return;

  state.finished = true;
  state.doneResolve();
};

const _crawlOneUrl = async (crawler, url) => {
  const { state, fetchPage } = crawler;
  const response = await _fetchPage(state, url, fetchPage);
  const pageUrl = utils.normalizeUrl(response.url) ?? url;

  if (!utils.isSameHost(pageUrl, state.host)) {
    throw new Error(`redirected off-domain to ${pageUrl}`);
  }

  const contentType = response.headers.get(HttpHeader.CONTENT_TYPE);

  if (!utils.isHtmlResponse(contentType)) {
    _printPage(pageUrl, []);
    state.pagesCrawled += 1;
    return;
  }

  const html = await response.text();
  const links = linkExtractor.extractLinks(html, pageUrl);

  _printPage(pageUrl, links);
  state.pagesCrawled += 1;

  if (state.pagesCrawled >= state.maxPages) {
    state.stopped = true;
    return;
  }

  for (const link of links) {
    _addToQueue(state, link);
  }
};

const _onUrlFinished = async (crawler, url) => {
  const { state } = crawler;

  try {
    await _crawlOneUrl(crawler, url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    _printError(url, message);
  } finally {
    state.inFlight -= 1;
    _finishIfDone(state);
    _processQueue(crawler);
  }
};

const _hasQueueWork = (state) =>
  !state.stopped &&
  state.inFlight < state.concurrency &&
  state.queue.length > 0 &&
  state.pagesCrawled + state.inFlight < state.maxPages;

const _processQueue = (crawler) => {
  const { state } = crawler;

  while (_hasQueueWork(state)) {
    const url = state.queue.shift();
    state.queued.delete(url);

    if (state.visited.has(url)) continue;

    state.visited.add(url);
    state.inFlight += 1;
    _onUrlFinished(crawler, url);
  }

  _finishIfDone(state);
};

const _createState = (startUrl, options = {}) => {
  const settings = config.getResolvedCrawlerOptions(options);
  const request = config.getCrawler().request;

  const state = {
    host: new URL(startUrl).hostname,
    concurrency: settings.concurrency,
    timeoutMs: settings.timeoutMs,
    maxPages: settings.maxPages,
    acceptHeader: request.accept,
    userAgent: request.userAgent,
    redirect: request.redirect,
    visited: new Set(),
    queued: new Set(),
    queue: [],
    inFlight: 0,
    pagesCrawled: 0,
    stopped: false,
    finished: false,
    abortController: new AbortController(),
    doneResolve: null,
    donePromise: null,
  };

  state.donePromise = new Promise((resolve) => {
    state.doneResolve = resolve;
  });

  return state;
};

const createCrawler = (startUrl, options = {}, dependencies = {}) => {
  const validation = utils.parseStartUrl(startUrl, 'start URL');
  if (!validation.valid) throw new Error(validation.error);

  const crawler = {
    state: _createState(validation.url, options),
    fetchPage: (dependencies.pageFetcher ?? pageFetcher.createGotPageFetcher()).fetch,
  };

  _addToQueue(crawler.state, validation.url);

  return {
    run: () => {
      _processQueue(crawler);
      return crawler.state.donePromise;
    },
    abort: () => crawler.state.abortController.abort(),
  };
};

const crawl = (startUrl, options = {}, dependencies = {}) => createCrawler(startUrl, options, dependencies).run();

module.exports = {
  createCrawler,
  crawl,
};
