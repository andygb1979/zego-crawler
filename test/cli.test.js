const { expect } = require('chai');
const sinon = require('sinon');
const { CliFlag } = require('../src/common/cliFlags');
const testDefaults = require('./helpers/defaults');
const cli = require('../src/cli');

const { urls, cli: cliDefaults } = testDefaults;
const { sampleOptions } = cliDefaults;

const _expectProcessExit = (action, code) => {
  const exitStub = sinon.stub(process, 'exit');

  expect(action).to.throw(`process.exit:${code}`);
  expect(exitStub.calledWith(code)).to.be.true;
};

const _expectAsyncProcessExit = async (action, code) => {
  const exitStub = sinon.stub(process, 'exit');

  try {
    await action();
    expect.fail(`Expected process.exit:${code}`);
  } catch (error) {
    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.equal(`process.exit:${code}`);
  }

  expect(exitStub.calledWith(code)).to.be.true;
};

describe('cli', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('parseArgs', () => {
    describe('when valid arguments are provided', () => {
      it('should return the start URL and parsed options', () => {
        expect(
          cli.parseArgs([
            urls.originWithoutSlash,
            '--concurrency',
            String(sampleOptions.concurrency),
            '--timeout',
            String(sampleOptions.timeoutMs),
            '--max-pages',
            String(sampleOptions.maxPages),
          ]),
        ).to.deep.equal({
          startUrl: urls.originWithoutSlash,
          options: sampleOptions,
        });
      });
    });

    describe('when no arguments are provided', () => {
      it('should print usage and exit with code 1', () => {
        const errorStub = sinon.stub(console, 'error');

        _expectProcessExit(() => cli.parseArgs([]), 1);

        expect(errorStub.called).to.be.true;
      });
    });

    describe('when help is requested', () => {
      it('should print usage and exit with code 0 for --help', () => {
        const errorStub = sinon.stub(console, 'error');

        _expectProcessExit(() => cli.parseArgs([CliFlag.HELP_LONG]), 0);

        expect(errorStub.called).to.be.true;
      });

      it('should print usage and exit with code 0 for -h', () => {
        const errorStub = sinon.stub(console, 'error');

        _expectProcessExit(() => cli.parseArgs([CliFlag.HELP_SHORT]), 0);

        expect(errorStub.called).to.be.true;
      });
    });

    describe('when an unknown option is provided', () => {
      it('should print usage and exit with code 1', () => {
        const errorStub = sinon.stub(console, 'error');

        _expectProcessExit(() => cli.parseArgs([urls.originWithoutSlash, '--unknown']), 1);

        expect(errorStub.called).to.be.true;
      });
    });

    describe('when the shell splits a query string into separate arguments', () => {
      it('should rejoin the URL before parsing options', () => {
        expect(
          cli.parseArgs([
            'https://example.com/page?utm_source=GoogleAds',
            'utm_medium=SearchAds',
            'utm_campaign=test',
            '--max-pages',
            '1',
          ]),
        ).to.deep.equal({
          startUrl:
            'https://example.com/page?utm_source=GoogleAds&utm_medium=SearchAds&utm_campaign=test',
          options: { maxPages: 1 },
        });
      });
    });

    describe('when a query fragment appears after valid options', () => {
      it('should print guidance about quoting URLs', () => {
        const errorStub = sinon.stub(console, 'error');

        _expectProcessExit(
          () =>
            cli.parseArgs([
              urls.originWithoutSlash,
              '--max-pages',
              '1',
              'utm_medium=SearchAds',
            ]),
          1,
        );

        expect(errorStub.firstCall.args[0]).to.include('wrap the full URL in quotes');
      });
    });
  });

  describe('printUsage', () => {
    describe('when called', () => {
      it('should write usage information to stderr', () => {
        const errorStub = sinon.stub(console, 'error');

        cli.printUsage();

        expect(errorStub.calledOnce).to.be.true;
        expect(errorStub.firstCall.args[0]).to.include('Usage:');
      });
    });
  });

  describe('runCrawler', () => {
    describe('when the start URL is invalid', () => {
      it('should print an error and exit with code 1', async () => {
        const errorStub = sinon.stub(console, 'error');

        await _expectAsyncProcessExit(() => cli.runCrawler([urls.invalid]), 1);

        expect(errorStub.firstCall.args[0]).to.include(`Invalid start URL: ${urls.invalid}`);
      });
    });

    describe('when the start URL is valid', () => {
      it('should run the crawler', async () => {
        const crawlStub = sinon.stub().resolves();
        sinon.stub(console, 'log');

        await cli.runCrawler([urls.originWithoutSlash, '--max-pages', '1'], { crawl: crawlStub });

        expect(crawlStub.calledOnce).to.be.true;
        expect(crawlStub.firstCall.args[0]).to.equal(urls.originWithoutSlash);
        expect(crawlStub.firstCall.args[1]).to.deep.equal({ maxPages: 1 });
      });
    });

    describe('when crawling throws an error', () => {
      it('should print the error and exit with code 1', async () => {
        const errorStub = sinon.stub(console, 'error');
        const crawlStub = sinon.stub().rejects(new Error('boom'));

        await _expectAsyncProcessExit(
          () => cli.runCrawler([urls.originWithoutSlash], { crawl: crawlStub }),
          1,
        );

        expect(errorStub.calledWith('Crawl failed: boom')).to.be.true;
      });
    });
  });
});
