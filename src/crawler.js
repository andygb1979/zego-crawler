const config = require('./config');
const linkExtractor = require('./lib/linkExtractor');
const pageFetcher = require('./lib/pageFetcher');
const { isAbortOrTimeout } = require('./common/fetchErrors');
const { getHttpStatusDescription, parseHttpStatusErrorMessage } = require('./common/httpStatus');
const { HttpHeader } = require('./common/httpConstants');
const utils = require('./lib/utils');

const _getErrorMessage = (error) => error instanceof Error ? error.message : String(error);

const _getPageFailureReport = (url, message) => {
  const status = parseHttpStatusErrorMessage(message);
  return status !== null
    ? { text: `Skipped ${url}: ${getHttpStatusDescription(status)} (HTTP ${status})`, isExpected: true }
    : { text: `Error crawling ${url}: ${message}`, isExpected: false };
};

const _consolePageReporter = {
  reportPage: (pageUrl, links) => {
    console.log(pageUrl);
    links.forEach((link) => console.log(`  ${link}`));
    console.log('');
  },
  reportError: (url, message) => {
    const report = _getPageFailureReport(url, message);
    (report.isExpected ? console.log : console.error)(report.text);
  },
};

const _defaultScopePolicy = {
  isInScope: (url, host) => utils.isSameHost(url, host),
};

const _fetchPage = async (state, url, pageFetcherImpl) => {
  try {
    const response = await pageFetcherImpl.fetch(url, {
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

const _enqueueUrl = (runtime, url) => {
  const { state, scopePolicy } = runtime;

  if (state.visited.has(url) || state.queued.has(url)) return;

  if (!scopePolicy.isInScope(url, state.host)) return;

  state.queued.add(url);
  state.queue.push(url);
};

const _maybeFinish = (state) => {
  if (!state.finished && state.inFlight === 0 && (state.queue.length === 0 || state.stopped)) { state.finished = true; state.doneResolve?.(); }
};

const _processPage = async (runtime, requestedUrl) => {
  const { state, scopePolicy, pageReporter, linkExtractorImpl, pageFetcherImpl } = runtime;
  const response = await _fetchPage(state, requestedUrl, pageFetcherImpl);
  const pageUrl = utils.normalizeUrl(response.url) ?? requestedUrl;

  if (!scopePolicy.isInScope(pageUrl, state.host)) throw new Error(`redirected off-domain to ${pageUrl}`);

  const contentType = response.headers.get(HttpHeader.CONTENT_TYPE);
  if (!utils.isHtmlResponse(contentType)) {
    pageReporter.reportPage(pageUrl, []);
    state.pagesCrawled += 1;
    return;
  }

  const html = await response.text();
  const links = linkExtractorImpl.extractLinks(html, pageUrl);
  pageReporter.reportPage(pageUrl, links);
  state.pagesCrawled += 1;

  if (state.pagesCrawled >= state.maxPages) {
    state.stopped = true;
    return;
  }

  links
    .filter((link) => scopePolicy.isInScope(link, state.host))
    .forEach((link) => _enqueueUrl(runtime, link));
};

const _pump = (runtime) => {
  const { state, pageReporter } = runtime;

  while (
    !state.stopped &&
    state.inFlight < state.concurrency &&
    state.queue.length > 0 &&
    state.pagesCrawled + state.inFlight < state.maxPages
  ) {
    const url = state.queue.shift();
    if (!url) continue;

    state.queued.delete(url);

    if (state.visited.has(url)) continue;

    state.visited.add(url);
    state.inFlight += 1;

    _processPage(runtime, url)
      .catch((error) => pageReporter.reportError(url, _getErrorMessage(error)))
      .finally(() => {
        state.inFlight -= 1;
        _maybeFinish(state);
        _pump(runtime);
      });
  }

  _maybeFinish(state);
};

const _createInitialState = (normalizedStart, options = {}) => {
  const resolvedOptions = config.getResolvedCrawlerOptions(options);
  const requestConfig = config.getCrawler().request;

  const state = {
    host: new URL(normalizedStart).hostname,
    concurrency: resolvedOptions.concurrency,
    timeoutMs: resolvedOptions.timeoutMs,
    maxPages: resolvedOptions.maxPages,
    acceptHeader: requestConfig.accept,
    userAgent: requestConfig.userAgent,
    redirect: requestConfig.redirect,
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

  state.donePromise = new Promise((resolve) => (state.doneResolve = resolve));

  return state;
};

const _createRuntime = (startUrl, options = {}, dependencies = {}) => {
  const startUrlValidation = utils.parseStartUrl(startUrl, 'start URL');
  if (!startUrlValidation.valid) throw new Error(startUrlValidation.error);

  const state = _createInitialState(startUrlValidation.url, options);
  const runtime = {
    state,
    scopePolicy: dependencies.scopePolicy ?? _defaultScopePolicy,
    pageReporter: dependencies.pageReporter ?? _consolePageReporter,
    linkExtractorImpl: dependencies.linkExtractor ?? linkExtractor,
    pageFetcherImpl: dependencies.pageFetcher ?? pageFetcher.createGotPageFetcher(),
  };

  _enqueueUrl(runtime, startUrlValidation.url);

  return runtime;
};

const createCrawler = (startUrl, options = {}, dependencies = {}) => {
  const runtime = _createRuntime(startUrl, options, dependencies);

  return {
    run: async () => (_pump(runtime), await runtime.state.donePromise),
    abort: () => runtime.state.abortController.abort(),
  };
};

const crawl = async (startUrl, options = {}, dependencies = {}) =>
  createCrawler(startUrl, options, dependencies).run();

module.exports = {
  createCrawler,
  crawl,
};
