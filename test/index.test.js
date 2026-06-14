import { expect } from 'chai';
import sinon from 'sinon';
import { main, parseArgs, printUsage } from '../src/index.js';
import { normalizeUrl } from '../src/urlUtils.js';
import { createMockResponse } from './helpers/mockFetch.js';

describe('index', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('parseArgs', () => {
    it('parses the start URL and supported options', () => {
      expect(
        parseArgs(['https://example.com', '--concurrency', '4', '--timeout', '1000', '--max-pages', '10']),
      ).to.deep.equal({
        startUrl: 'https://example.com',
        options: {
          concurrency: 4,
          timeoutMs: 1000,
          maxPages: 10,
        },
      });
    });

    it('exits when no arguments are provided', () => {
      const exitStub = sinon.stub(process, 'exit');
      const errorStub = sinon.stub(console, 'error');

      parseArgs([]);

      expect(errorStub.called).to.be.true;
      expect(exitStub.calledWith(1)).to.be.true;
    });

    it('exits when help is requested', () => {
      const exitStub = sinon.stub(process, 'exit');
      const errorStub = sinon.stub(console, 'error');

      parseArgs(['--help']);

      expect(errorStub.called).to.be.true;
      expect(exitStub.calledWith(0)).to.be.true;
    });

    it('exits when an unknown option is provided', () => {
      const exitStub = sinon.stub(process, 'exit');
      const errorStub = sinon.stub(console, 'error');

      parseArgs(['https://example.com', '--unknown']);

      expect(errorStub.called).to.be.true;
      expect(exitStub.calledWith(1)).to.be.true;
    });
  });

  describe('printUsage', () => {
    it('writes usage information to stderr', () => {
      const errorStub = sinon.stub(console, 'error');

      printUsage();

      expect(errorStub.calledOnce).to.be.true;
      expect(errorStub.firstCall.args[0]).to.include('Usage:');
    });
  });

  describe('main', () => {
    it('exits when the start URL is invalid', async () => {
      const exitStub = sinon.stub(process, 'exit');
      const errorStub = sinon.stub(console, 'error');

      await main(['not-a-url']);

      expect(errorStub.calledWith('Invalid base URL: not-a-url')).to.be.true;
      expect(exitStub.calledWith(1)).to.be.true;
    });

    it('runs the crawler for valid input', async () => {
      const fetchStub = sinon.stub(globalThis, 'fetch').resolves(
        createMockResponse({
          url: 'https://example.com/',
          body: '<a href="/about">About</a>',
        }),
      );
      sinon.stub(console, 'log');

      await main(['https://example.com', '--max-pages', '1']);

      expect(fetchStub.calledOnce).to.be.true;
    });

    it('exits when crawling throws', async () => {
      const exitStub = sinon.stub(process, 'exit');
      const errorStub = sinon.stub(console, 'error');
      const crawlStub = sinon.stub().rejects(new Error('boom'));

      await main(['https://example.com'], { crawl: crawlStub });

      expect(errorStub.calledWith('boom')).to.be.true;
      expect(exitStub.calledWith(1)).to.be.true;
    });
  });

  describe('normalizeUrl integration', () => {
    it('accepts valid CLI URLs', () => {
      expect(normalizeUrl('https://example.com/path/')).to.equal('https://example.com/path');
    });
  });
});
