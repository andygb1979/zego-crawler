const { expect } = require('chai');
const sinon = require('sinon');
const { FetchAbortReason } = require('../../src/common/fetchErrors');
const { HttpHeader, RedirectMode } = require('../../src/common/httpConstants');

const GOT_MODULE_PATH = require.resolve('got');
const PAGE_FETCHER_PATH = require.resolve('../../src/lib/pageFetcher');

const loadPageFetcherWithGotStub = (gotStub) => {
  require.cache[GOT_MODULE_PATH] = {
    id: GOT_MODULE_PATH,
    filename: GOT_MODULE_PATH,
    loaded: true,
    exports: { default: gotStub },
  };
  delete require.cache[PAGE_FETCHER_PATH];
  return require('../../src/lib/pageFetcher');
};

describe('lib/pageFetcher', () => {
  let gotStub;

  beforeEach(() => {
    gotStub = sinon.stub();
  });

  afterEach(() => {
    delete require.cache[GOT_MODULE_PATH];
    delete require.cache[PAGE_FETCHER_PATH];
    sinon.restore();
  });

  describe('createGotPageFetcher', () => {
    describe('when got returns a successful response', () => {
      it('should map the response into the page fetcher shape', async () => {
        gotStub.resolves({
          statusCode: 200,
          url: 'https://example.com/',
          headers: { 'content-type': 'text/html; charset=utf-8' },
          body: '<html></html>',
        });

        const { createGotPageFetcher } = loadPageFetcherWithGotStub(gotStub);
        const response = await createGotPageFetcher().fetch('https://example.com/', {
          timeoutMs: 1000,
          acceptHeader: 'text/html',
          userAgent: 'test-agent',
          redirect: RedirectMode.FOLLOW,
          signal: new AbortController().signal,
        });

        expect(response.ok).to.be.true;
        expect(response.status).to.equal(200);
        expect(response.url).to.equal('https://example.com/');
        expect(response.headers.get(HttpHeader.CONTENT_TYPE)).to.equal('text/html; charset=utf-8');
        expect(await response.text()).to.equal('<html></html>');
        expect(gotStub.firstCall.args[1].followRedirect).to.be.true;
      });
    });

    describe('when got returns a non-success status', () => {
      it('should expose the status without throwing', async () => {
        gotStub.resolves({
          statusCode: 404,
          url: 'https://example.com/missing',
          headers: {},
          body: 'not found',
        });

        const { createGotPageFetcher } = loadPageFetcherWithGotStub(gotStub);
        const response = await createGotPageFetcher().fetch('https://example.com/missing', {
          timeoutMs: 1000,
          acceptHeader: 'text/html',
          userAgent: 'test-agent',
          redirect: RedirectMode.FOLLOW,
          signal: new AbortController().signal,
        });

        expect(response.ok).to.be.false;
        expect(response.status).to.equal(404);
      });
    });

    describe('when got rejects with an abort or timeout error', () => {
      it('should throw a readable timeout or abort message', async () => {
        gotStub.rejects(Object.assign(new Error('aborted'), { name: FetchAbortReason.ABORT_ERROR }));

        const { createGotPageFetcher } = loadPageFetcherWithGotStub(gotStub);

        try {
          await createGotPageFetcher().fetch('https://example.com/', {
            timeoutMs: 1000,
            acceptHeader: 'text/html',
            userAgent: 'test-agent',
            redirect: RedirectMode.FOLLOW,
            signal: new AbortController().signal,
          });
          expect.fail('Expected fetch to throw');
        } catch (error) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.equal('request timed out or aborted');
        }
      });
    });

    describe('when got rejects with another error', () => {
      it('should rethrow the original error', async () => {
        const networkError = new Error('network failure');
        gotStub.rejects(networkError);

        const { createGotPageFetcher } = loadPageFetcherWithGotStub(gotStub);

        try {
          await createGotPageFetcher().fetch('https://example.com/', {
            timeoutMs: 1000,
            acceptHeader: 'text/html',
            userAgent: 'test-agent',
            redirect: RedirectMode.FOLLOW,
            signal: new AbortController().signal,
          });
          expect.fail('Expected fetch to throw');
        } catch (error) {
          expect(error).to.equal(networkError);
        }
      });
    });
  });
});
