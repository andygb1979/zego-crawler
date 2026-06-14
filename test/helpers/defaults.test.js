const { expect } = require('chai');
const testDefaults = require('../helpers/defaults');

describe('test/helpers/defaults', () => {
  describe('when loading application defaults', () => {
    it('should expose config values from src/config/default.json', () => {
      expect(testDefaults.config.crawler.concurrency).to.equal(16);
      expect(testDefaults.config.crawler.timeoutMs).to.equal(15000);
      expect(testDefaults.config.crawler.maxPages).to.be.null;
      expect(testDefaults.config.linkExtractor.selector).to.equal('a[href]');
    });
  });

  describe('when loading test fixtures', () => {
    it('should expose shared URLs and content types for unit tests', () => {
      expect(testDefaults.urls.host).to.equal('example.com');
      expect(testDefaults.contentTypes.html).to.equal('text/html; charset=utf-8');
      expect(testDefaults.cli.sampleOptions.maxPages).to.equal(10);
    });
  });
});
