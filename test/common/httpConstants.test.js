const { expect } = require('chai');
const { RedirectMode, HttpHeader } = require('../../src/common/httpConstants');

describe('common/httpConstants', () => {
  it('should expose frozen redirect and header constants', () => {
    expect(RedirectMode.FOLLOW).to.equal('follow');
    expect(HttpHeader.CONTENT_TYPE).to.equal('content-type');
    expect(Object.isFrozen(RedirectMode)).to.be.true;
    expect(Object.isFrozen(HttpHeader)).to.be.true;
  });
});
