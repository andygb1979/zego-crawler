const config = require('config');
const { extractLinks } = require('./linkExtractor');
const { isHtmlResponse, isSameHost, normalizeUrl } = require('./lib/utils');

const crawler = (module.exports = {});

const getDefaults = () => {
  const crawlerConfig = config.has('crawler') ? config.get('crawler') : {};

  return {
    concurrency: crawlerConfig.concurrency ?? 16,
    timeoutMs: crawlerConfig.timeoutMs ?? 15_000,
    maxPages: crawlerConfig.maxPages ?? Infinity,
  };
};

const printResult = (pageUrl, links) => {
  console.log(pageUrl);
  links.forEach((link) => {
    console.log(`  ${link}`);
  });
  console.log('');
};

const enqueueUrl = (state, url) => {
  if (state.visited.has(url) || state.queued.has(url)) {
    return;
  }

  if (!isSameHost(url, state.host)) {
    return;
  }

  state.queued.add(url);
  state.queue.push(url);
};

const maybeFinish = (state) => {
  if (state.finished) {
    return;
  }

  if (state.inFlight === 0 && (state.queue.length === 0 || state.stopped)) {
    state.finished = true;
    state.doneResolve();
  }
};

const fetchPage = async (state, url) => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), state.timeoutMs);

  const onAbort = () => timeoutController.abort();
  state.abortController.signal.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, {
      signal: timeoutController.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'ZegoCrawler/1.0',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('request timed out or aborted');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    state.abortController.signal.removeEventListener('abort', onAbort);
  }
};

const processPage = async (state, requestedUrl) => {
  const response = await fetchPage(state, requestedUrl);
  const pageUrl = normalizeUrl(response.url) ?? requestedUrl;

  if (!isSameHost(pageUrl, state.host)) {
    throw new Error(`redirected off-domain to ${pageUrl}`);
  }

  const contentType = response.headers.get('content-type');
  if (!isHtmlResponse(contentType)) {
    printResult(pageUrl, []);
    state.pagesCrawled += 1;
    return;
  }

  const html = await response.text();
  const links = extractLinks(html, pageUrl);
  printResult(pageUrl, links);
  state.pagesCrawled += 1;

  if (state.pagesCrawled >= state.maxPages) {
    state.stopped = true;
    return;
  }

  links
    .filter((link) => isSameHost(link, state.host))
    .forEach((link) => enqueueUrl(state, link));
};

const pump = (state) => {
  while (
    !state.stopped &&
    state.inFlight < state.concurrency &&
    state.queue.length > 0 &&
    state.pagesCrawled + state.inFlight < state.maxPages
  ) {
    const url = state.queue.shift();
    state.queued.delete(url);

    if (state.visited.has(url)) {
      continue;
    }

    state.visited.add(url);
    state.inFlight += 1;

    processPage(state, url)
      .catch((error) => {
        console.error(`Error crawling ${url}: ${error.message}`);
      })
      .finally(() => {
        state.inFlight -= 1;
        maybeFinish(state);
        pump(state);
      });
  }

  maybeFinish(state);
};

const createInitialState = (startUrl, options = {}) => {
  const normalizedStart = normalizeUrl(startUrl);
  if (!normalizedStart) {
    throw new Error(`Invalid start URL: ${startUrl}`);
  }

  const defaults = getDefaults();
  const state = {
    host: new URL(normalizedStart).hostname,
    concurrency: options.concurrency ?? defaults.concurrency,
    timeoutMs: options.timeoutMs ?? defaults.timeoutMs,
    maxPages: options.maxPages ?? defaults.maxPages,
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

  enqueueUrl(state, normalizedStart);
  state.donePromise = new Promise((resolve) => {
    state.doneResolve = resolve;
  });

  return state;
};

crawler.createCrawler = (startUrl, options = {}) => {
  const state = createInitialState(startUrl, options);

  return {
    run: () => {
      pump(state);
      return state.donePromise;
    },
    abort: () => {
      state.abortController.abort();
    },
  };
};

crawler.crawl = async (startUrl, options = {}) => {
  const instance = crawler.createCrawler(startUrl, options);
  await instance.run();
};
