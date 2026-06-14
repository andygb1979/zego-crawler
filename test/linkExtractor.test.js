const { expect } = require('chai');
const { extractLinks } = require('../src/linkExtractor');

describe('linkExtractor', () => {
  it('extracts and normalises anchor links', () => {
    const html = `
      <html>
        <body>
          <a href="/about">About</a>
          <a href="https://example.com/contact/">Contact</a>
          <a href="https://other.com/">External</a>
        </body>
      </html>
    `;

    expect(extractLinks(html, 'https://example.com/')).to.deep.equal([
      'https://example.com/about',
      'https://example.com/contact',
      'https://other.com/',
    ]);
  });

  it('ignores anchors without href values and unsupported protocols', () => {
    const html = `
      <html>
        <body>
          <a>No href</a>
          <a href="">Empty</a>
          <a href="mailto:test@example.com">Email</a>
        </body>
      </html>
    `;

    expect(extractLinks(html, 'https://example.com/')).to.deep.equal([]);
  });

  it('deduplicates repeated links', () => {
    const html = `
      <a href="/dup">One</a>
      <a href="/dup">Two</a>
    `;

    expect(extractLinks(html, 'https://example.com/')).to.deep.equal([
      'https://example.com/dup',
    ]);
  });
});
