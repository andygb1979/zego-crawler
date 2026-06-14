const { expect } = require('chai');
const testDefaults = require('../helpers/defaults');
const utils = require('../../src/lib/utils');

const { urls, contentTypes } = testDefaults;

describe('lib/utils', () => {
  describe('normalizeUrl', () => {
    describe('when normalising absolute URLs', () => {
      it('should strip URL fragments', () => {
        expect(utils.normalizeUrl(`${urls.path}#section`)).to.equal(urls.path);
      });
    });

    describe('when resolving relative URLs', () => {
      it('should resolve against the provided base URL', () => {
        expect(utils.normalizeUrl('/about', `${urls.origin}blog/`)).to.equal(urls.about);
      });
    });

    describe('when normalising trailing slashes', () => {
      it('should remove trailing slashes except on the origin root', () => {
        expect(utils.normalizeUrl(`${urls.about}/`)).to.equal(urls.about);
        expect(utils.normalizeUrl(urls.origin)).to.equal(urls.origin);
      });
    });

    describe('when the protocol is unsupported', () => {
      it('should return null', () => {
        expect(utils.normalizeUrl('mailto:test@example.com')).to.be.null;
        expect(utils.normalizeUrl('javascript:alert(1)')).to.be.null;
      });
    });

    describe('when the URL is invalid', () => {
      it('should return null', () => {
        expect(utils.normalizeUrl(urls.invalid)).to.be.null;
      });
    });
  });

  describe('isSameHost', () => {
    describe('when comparing hostnames', () => {
      it('should return true for matching hostnames', () => {
        expect(utils.isSameHost(`${urls.origin}a`, urls.host)).to.be.true;
        expect(utils.isSameHost(`http://${urls.host}/b`, urls.host)).to.be.true;
      });

      it('should return false for different or invalid hostnames', () => {
        expect(utils.isSameHost(`https://www.${urls.host}`, urls.host)).to.be.false;
        expect(utils.isSameHost(`https://api.${urls.host}`, urls.host)).to.be.false;
        expect(utils.isSameHost(urls.invalid, urls.host)).to.be.false;
      });
    });
  });

  describe('parseStartUrl', () => {
    describe('when the URL is valid', () => {
      it('should return the normalised URL', () => {
        expect(utils.parseStartUrl(`${urls.path}/`)).to.deep.equal({
          valid: true,
          url: urls.path,
        });
      });
    });

    describe('when the URL is invalid', () => {
      it('should return an error message with the default label', () => {
        const result = utils.parseStartUrl(urls.invalid);

        expect(result.valid).to.be.false;
        expect(result.error).to.include(`Invalid base URL: ${urls.invalid}`);
        expect(result.error).to.include('Provide a full http:// or https:// URL');
      });

      it('should use the provided label in the error message', () => {
        const result = utils.parseStartUrl(urls.invalid, 'start URL');

        expect(result.valid).to.be.false;
        expect(result.error).to.include(`Invalid start URL: ${urls.invalid}`);
      });
    });
  });

  describe('isHtmlResponse', () => {
    describe('when the content type is missing', () => {
      it('should treat the response as HTML', () => {
        expect(utils.isHtmlResponse(undefined)).to.be.true;
        expect(utils.isHtmlResponse(null)).to.be.true;
      });
    });

    describe('when the content type is HTML or XHTML', () => {
      it('should return true', () => {
        expect(utils.isHtmlResponse(contentTypes.html)).to.be.true;
        expect(utils.isHtmlResponse(contentTypes.xhtml)).to.be.true;
      });
    });

    describe('when the content type is not HTML', () => {
      it('should return false', () => {
        expect(utils.isHtmlResponse(contentTypes.json)).to.be.false;
        expect(utils.isHtmlResponse(contentTypes.png)).to.be.false;
      });
    });
  });
});
