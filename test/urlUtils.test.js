import { expect } from 'chai';
import { isHtmlResponse, isSameHost, normalizeUrl } from '../src/urlUtils.js';

describe('urlUtils', () => {
  describe('normalizeUrl', () => {
    it('normalises absolute URLs and strips fragments', () => {
      expect(normalizeUrl('https://example.com/page#section')).to.equal(
        'https://example.com/page',
      );
    });

    it('resolves relative URLs against a base URL', () => {
      expect(normalizeUrl('/about', 'https://example.com/blog/')).to.equal(
        'https://example.com/about',
      );
    });

    it('removes trailing slashes except on the origin root', () => {
      expect(normalizeUrl('https://example.com/about/')).to.equal(
        'https://example.com/about',
      );
      expect(normalizeUrl('https://example.com/')).to.equal('https://example.com/');
    });

    it('returns null for unsupported protocols', () => {
      expect(normalizeUrl('mailto:test@example.com')).to.be.null;
      expect(normalizeUrl('javascript:alert(1)')).to.be.null;
    });

    it('returns null for invalid URLs', () => {
      expect(normalizeUrl('not a url')).to.be.null;
    });
  });

  describe('isSameHost', () => {
    it('matches URLs on the same hostname', () => {
      expect(isSameHost('https://example.com/a', 'example.com')).to.be.true;
      expect(isSameHost('http://example.com/b', 'example.com')).to.be.true;
    });

    it('rejects other hostnames and invalid URLs', () => {
      expect(isSameHost('https://www.example.com', 'example.com')).to.be.false;
      expect(isSameHost('https://api.example.com', 'example.com')).to.be.false;
      expect(isSameHost('not-a-url', 'example.com')).to.be.false;
    });
  });

  describe('isHtmlResponse', () => {
    it('treats missing content type as HTML', () => {
      expect(isHtmlResponse(undefined)).to.be.true;
      expect(isHtmlResponse(null)).to.be.true;
    });

    it('accepts HTML and XHTML media types', () => {
      expect(isHtmlResponse('text/html; charset=utf-8')).to.be.true;
      expect(isHtmlResponse('application/xhtml+xml')).to.be.true;
    });

    it('rejects non-HTML media types', () => {
      expect(isHtmlResponse('application/json')).to.be.false;
      expect(isHtmlResponse('image/png')).to.be.false;
    });
  });
});
