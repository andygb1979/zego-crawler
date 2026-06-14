const { expect } = require('chai');
const sinon = require('sinon');
const mockFetch = require('./helpers/mockFetch');
const testDefaults = require('./helpers/defaults');
const crawler = require('../src/crawler');

const { urls, contentTypes } = testDefaults;
const { createMockResponse, createMockPageFetcher } = mockFetch;

describe('crawler', () => {
  let fetchHandler;
  let fetchCallCount;
  let logStub;
  let errorStub;

  const _runCrawler = (startUrl, options = {}) => {
    fetchCallCount = 0;

    return crawler
      .createCrawler(startUrl, options, {
        pageFetcher: createMockPageFetcher(async (url, options) => {
          fetchCallCount += 1;
          return fetchHandler(url, options);
        }),
      })
      .run();
  };

  beforeEach(() => {
    fetchHandler = async (url) =>
      createMockResponse({
        url,
        body: '',
      });
    fetchCallCount = 0;
    logStub = sinon.stub(console, 'log');
    errorStub = sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createCrawler', () => {
    describe('when the start URL is invalid', () => {
      it('should throw an error describing the invalid URL', () => {
        expect(() => crawler.createCrawler(urls.invalid)).to.throw(
          `Invalid start URL: ${urls.invalid}`,
        );
      });
    });

    describe('when crawling HTML pages', () => {
      describe('with same-host and external links', () => {
        it('should print all links and follow same-host links only', async () => {
          fetchHandler = async (url) => {
            if (url === urls.origin) return createMockResponse({
              url: urls.origin,
              body: `
                  <a href="/about">About</a>
                  <a href="${urls.external}">External</a>
                `,
            });

            if (url === urls.about) return createMockResponse({
              url: urls.about,
              body: '<a href="/">Home</a>',
            });

            throw new Error(`Unexpected fetch: ${url}`);
          };

          await _runCrawler(urls.origin);

          expect(fetchCallCount).to.equal(2);
          expect(logStub.firstCall.args[0]).to.equal(urls.origin);
          expect(logStub.getCall(1).args[0]).to.equal(`  ${urls.about}`);
          expect(logStub.getCall(2).args[0]).to.equal(`  ${urls.external}`);
          expect(logStub.getCall(4).args[0]).to.equal(urls.about);
        });
      });

      describe('when maxPages is reached', () => {
        it('should stop fetching additional pages', async () => {
          fetchHandler = async (url) =>
            createMockResponse({
              url,
              body: `
                <a href="/one">One</a>
                <a href="/two">Two</a>
              `,
            });

          await _runCrawler(urls.origin, { maxPages: 1 });

          expect(fetchCallCount).to.equal(1);
        });
      });

      describe('when duplicate links are found', () => {
        it('should visit each unique URL only once', async () => {
          fetchHandler = async (url) =>
            createMockResponse({
              url,
              body: `
                <a href="/">Home</a>
                <a href="/">Home again</a>
              `,
            });

          await _runCrawler(urls.origin);

          expect(fetchCallCount).to.equal(1);
        });
      });
    });

    describe('when crawling non-HTML responses', () => {
      it('should print the page URL without extracted links', async () => {
        fetchHandler = async () =>
          createMockResponse({
            url: urls.pdf,
            contentType: contentTypes.pdf,
            body: '%PDF',
          });

        await _runCrawler(urls.pdf);

        expect(logStub.firstCall.args[0]).to.equal(urls.pdf);
        expect(logStub.calledWith('')).to.be.true;
      });
    });

    describe('when fetch requests fail', () => {
      it('should log the error and continue', async () => {
        fetchHandler = async () => {
          throw new Error('network failure');
        };

        await _runCrawler(urls.origin);

        expect(errorStub.calledOnce).to.be.true;
        expect(errorStub.firstCall.args[0]).to.include('network failure');
      });

      describe('with HTTP error responses', () => {
        it('should log a skip message for server errors without using stderr', async () => {
          fetchHandler = async () =>
            createMockResponse({
              url: urls.origin,
              status: 500,
              ok: false,
            });

          await _runCrawler(urls.origin);

          expect(logStub.calledWith(`Skipped ${urls.origin}: server error (HTTP 500)`)).to.be.true;
          expect(errorStub.called).to.be.false;
        });

        it('should log a skip message for HTTP 404 without using stderr', async () => {
          fetchHandler = async () =>
            createMockResponse({
              url: urls.origin,
              status: 404,
              ok: false,
            });

          await _runCrawler(urls.origin);

          expect(logStub.calledWith(`Skipped ${urls.origin}: page not found (HTTP 404)`)).to.be
            .true;
          expect(errorStub.called).to.be.false;
        });

        it('should log status-specific skip messages for other HTTP errors', async () => {
          fetchHandler = async () =>
            createMockResponse({
              url: urls.origin,
              status: 401,
              ok: false,
            });

          await _runCrawler(urls.origin);

          expect(
            logStub.calledWith(`Skipped ${urls.origin}: unauthorized (HTTP 401)`),
          ).to.be.true;
        });
      });

      describe('with timeout errors', () => {
        it('should log a readable timeout or abort message for timeout error names', async () => {
          fetchHandler = async () => {
            throw Object.assign(new Error('timed out'), { name: 'TimeoutError' });
          };

          await _runCrawler(urls.retry);

          expect(errorStub.firstCall.args[0]).to.include('timed out or aborted');
        });
      });

      describe('with aborted requests', () => {
        it('should log a readable timeout or abort message', async () => {
          fetchHandler = async () => {
            throw Object.assign(new Error('aborted'), { name: 'AbortError' });
          };

          await _runCrawler(urls.retry);

          expect(errorStub.firstCall.args[0]).to.include('timed out or aborted');
        });
      });
    });

    describe('when a redirect leaves the target hostname', () => {
      it('should reject the off-domain redirect', async () => {
        fetchHandler = async () =>
          createMockResponse({
            url: urls.offDomainRedirect,
            body: '<a href="/">Home</a>',
          });

        await _runCrawler(urls.redirect);

        expect(errorStub.firstCall.args[0]).to.include('redirected off-domain');
      });
    });

    describe('when abort is called during an in-flight request', () => {
      it('should stop the crawl and report the abort', async () => {
        fetchHandler = async (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
            });
          });

        const instance = crawler.createCrawler(urls.origin, {}, {
          pageFetcher: createMockPageFetcher(async (url, options) => {
            fetchCallCount += 1;
            return fetchHandler(url, options);
          }),
        });
        const runPromise = instance.run();

        instance.abort();
        await runPromise;

        expect(fetchCallCount).to.equal(1);
        expect(errorStub.firstCall.args[0]).to.include('timed out or aborted');
      });
    });
  });

  describe('crawl', () => {
    describe('when given a valid start URL', () => {
      it('should run the crawler via the convenience wrapper', async () => {
        fetchHandler = async (url) =>
          createMockResponse({
            url,
            body: '<a href="/about">About</a>',
          });

        await crawler.crawl(urls.origin, { maxPages: 1 }, {
          pageFetcher: createMockPageFetcher(async (url, options) => {
            fetchCallCount += 1;
            return fetchHandler(url, options);
          }),
        });

        expect(fetchCallCount).to.equal(1);
      });
    });
  });
});
