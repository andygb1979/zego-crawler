const { expect } = require('chai');
const sinon = require('sinon');
const { createCrawler, crawl } = require('../src/crawler');
const { createMockResponse } = require('./helpers/mockFetch');

describe('crawler', () => {
  let fetchStub;
  let logStub;

  beforeEach(() => {
    fetchStub = sinon.stub(globalThis, 'fetch');
    logStub = sinon.stub(console, 'log');
    sinon.stub(console, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('throws when the start URL is invalid', () => {
    expect(() => createCrawler('not-a-url')).to.throw('Invalid start URL: not-a-url');
  });

  it('prints a page and follows same-host links only', async () => {
    fetchStub.callsFake(async (url) => {
      if (url === 'https://example.com/') {
        return createMockResponse({
          url: 'https://example.com/',
          body: `
            <a href="/about">About</a>
            <a href="https://other.com/">External</a>
          `,
        });
      }

      if (url === 'https://example.com/about') {
        return createMockResponse({
          url: 'https://example.com/about',
          body: '<a href="/">Home</a>',
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await createCrawler('https://example.com/').run();

    expect(fetchStub.callCount).to.equal(2);
    expect(logStub.firstCall.args[0]).to.equal('https://example.com/');
    expect(logStub.getCall(1).args[0]).to.equal('  https://example.com/about');
    expect(logStub.getCall(2).args[0]).to.equal('  https://other.com/');
    expect(logStub.getCall(4).args[0]).to.equal('https://example.com/about');
  });

  it('respects maxPages and does not enqueue further links', async () => {
    fetchStub.resolves(
      createMockResponse({
        url: 'https://example.com/',
        body: `
          <a href="/one">One</a>
          <a href="/two">Two</a>
        `,
      }),
    );

    await createCrawler('https://example.com/', { maxPages: 1 }).run();

    expect(fetchStub.callCount).to.equal(1);
  });

  it('prints non-HTML responses without extracted links', async () => {
    fetchStub.resolves(
      createMockResponse({
        url: 'https://example.com/file.pdf',
        contentType: 'application/pdf',
        body: '%PDF',
      }),
    );

    await createCrawler('https://example.com/file.pdf').run();

    expect(logStub.firstCall.args[0]).to.equal('https://example.com/file.pdf');
    expect(logStub.calledWith('')).to.be.true;
  });

  it('logs fetch failures and continues', async () => {
    fetchStub.rejects(new Error('network failure'));

    await createCrawler('https://example.com/').run();

    expect(console.error.calledOnce).to.be.true;
    expect(console.error.firstCall.args[0]).to.include('network failure');
  });

  it('rejects redirects to another hostname', async () => {
    fetchStub.resolves(
      createMockResponse({
        url: 'https://other.com/landing',
        body: '<a href="/">Home</a>',
      }),
    );

    await createCrawler('https://example.com/redirect').run();

    expect(console.error.firstCall.args[0]).to.include('redirected off-domain');
  });

  it('maps HTTP errors and aborts to readable failures', async () => {
    fetchStub.onFirstCall().resolves(
      createMockResponse({
        url: 'https://example.com/',
        status: 500,
        ok: false,
      }),
    );

    fetchStub.onSecondCall().rejects(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    await createCrawler('https://example.com/').run();
    await createCrawler('https://example.com/retry').run();

    expect(console.error.firstCall.args[0]).to.include('HTTP 500');
    expect(console.error.lastCall.args[0]).to.include('timed out or aborted');
  });

  it('deduplicates queued and visited URLs', async () => {
    fetchStub.callsFake(async (url) =>
      createMockResponse({
        url,
        body: `
          <a href="/">Home</a>
          <a href="/">Home again</a>
        `,
      }),
    );

    await createCrawler('https://example.com/').run();

    expect(fetchStub.callCount).to.equal(1);
  });

  it('supports aborting in-flight work', async () => {
    fetchStub.callsFake((_url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      }),
    );

    const instance = createCrawler('https://example.com/');
    const runPromise = instance.run();

    instance.abort();
    await runPromise;

    expect(fetchStub.calledOnce).to.be.true;
    expect(console.error.firstCall.args[0]).to.include('timed out or aborted');
  });

  it('exposes crawl as a convenience wrapper', async () => {
    fetchStub.resolves(
      createMockResponse({
        url: 'https://example.com/',
        body: '<a href="/about">About</a>',
      }),
    );

    await crawl('https://example.com/', { maxPages: 1 });

    expect(fetchStub.calledOnce).to.be.true;
  });
});
