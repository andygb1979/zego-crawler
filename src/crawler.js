import { extractLinks } from './linkExtractor.js';
import { isHtmlResponse, isSameHost, normalizeUrl } from './urlUtils.js';

const DEFAULT_CONCURRENCY = 16;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PAGES = Infinity;

export class Crawler {
  #host;
  #concurrency;
  #timeoutMs;
  #maxPages;
  #visited = new Set();
  #queued = new Set();
  #queue = [];
  #inFlight = 0;
  #pagesCrawled = 0;
  #doneResolve;
  #donePromise;
  #abortController = new AbortController();
  #stopped = false;
  #finished = false;

  constructor(startUrl, options = {}) {
    const normalizedStart = normalizeUrl(startUrl);
    if (!normalizedStart) {
      throw new Error(`Invalid start URL: ${startUrl}`);
    }

    this.#host = new URL(normalizedStart).hostname;
    this.#concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;

    this.#enqueue(normalizedStart);
    this.#donePromise = new Promise((resolve) => {
      this.#doneResolve = resolve;
    });
  }

  async run() {
    this.#pump();
    return this.#donePromise;
  }

  abort() {
    this.#abortController.abort();
  }

  #enqueue(url) {
    if (this.#visited.has(url) || this.#queued.has(url)) {
      return;
    }

    if (!isSameHost(url, this.#host)) {
      return;
    }

    this.#queued.add(url);
    this.#queue.push(url);
  }

  #pump() {
    while (
      !this.#stopped &&
      this.#inFlight < this.#concurrency &&
      this.#queue.length > 0 &&
      this.#pagesCrawled + this.#inFlight < this.#maxPages
    ) {
      const url = this.#queue.shift();
      this.#queued.delete(url);

      if (this.#visited.has(url)) {
        continue;
      }

      this.#visited.add(url);
      this.#inFlight += 1;
      this.#processPage(url)
        .catch((error) => {
          console.error(`Error crawling ${url}: ${error.message}`);
        })
        .finally(() => {
          this.#inFlight -= 1;
          this.#maybeFinish();
          this.#pump();
        });
    }

    this.#maybeFinish();
  }

  #maybeFinish() {
    if (this.#finished) {
      return;
    }

    if (this.#inFlight === 0 && (this.#queue.length === 0 || this.#stopped)) {
      this.#finished = true;
      this.#doneResolve();
    }
  }

  async #processPage(requestedUrl) {
    const response = await this.#fetch(requestedUrl);
    const pageUrl = normalizeUrl(response.url) ?? requestedUrl;

    if (!isSameHost(pageUrl, this.#host)) {
      throw new Error(`redirected off-domain to ${pageUrl}`);
    }

    const contentType = response.headers.get('content-type');
    if (!isHtmlResponse(contentType)) {
      this.#printResult(pageUrl, []);
      this.#pagesCrawled += 1;
      return;
    }

    const html = await response.text();
    const links = extractLinks(html, pageUrl);
    this.#printResult(pageUrl, links);
    this.#pagesCrawled += 1;

    if (this.#pagesCrawled >= this.#maxPages) {
      this.#stopped = true;
      return;
    }

    for (const link of links) {
      if (isSameHost(link, this.#host)) {
        this.#enqueue(link);
      }
    }
  }

  async #fetch(url) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.#timeoutMs);

    const onAbort = () => timeoutController.abort();
    this.#abortController.signal.addEventListener('abort', onAbort);

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
      this.#abortController.signal.removeEventListener('abort', onAbort);
    }
  }

  #printResult(pageUrl, links) {
    console.log(pageUrl);
    for (const link of links) {
      console.log(`  ${link}`);
    }
    console.log('');
  }
}

export async function crawl(startUrl, options) {
  const crawler = new Crawler(startUrl, options);
  await crawler.run();
}
