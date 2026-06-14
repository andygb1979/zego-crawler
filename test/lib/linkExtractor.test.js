const { expect } = require('chai');
const testDefaults = require('../helpers/defaults');
const linkExtractor = require('../../src/lib/linkExtractor');

const { urls } = testDefaults;

describe('lib/linkExtractor', () => {
  describe('extractLinks', () => {
    describe('when the page contains anchor links', () => {
      it('should extract and normalise absolute and relative links', () => {
        const html = `
          <html>
            <body>
              <a href="/about">About</a>
              <a href="${urls.contact}/">Contact</a>
              <a href="${urls.external}">External</a>
            </body>
          </html>
        `;

        expect(linkExtractor.extractLinks(html, urls.origin)).to.deep.equal([
          urls.about,
          urls.contact,
          urls.external,
        ]);
      });
    });

    describe('when anchors have missing or unsupported href values', () => {
      it('should ignore them', () => {
        const html = `
          <html>
            <body>
              <a>No href</a>
              <a href="">Empty</a>
              <a href="mailto:test@example.com">Email</a>
            </body>
          </html>
        `;

        expect(linkExtractor.extractLinks(html, urls.origin)).to.deep.equal([]);
      });
    });

    describe('when duplicate links appear on the page', () => {
      it('should return each link only once', () => {
        const html = `
          <a href="/dup">One</a>
          <a href="/dup">Two</a>
        `;

        expect(linkExtractor.extractLinks(html, urls.origin)).to.deep.equal([urls.dup]);
      });
    });
  });
});
