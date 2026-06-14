const { expect } = require('chai');
const { isAbortOrTimeout } = require('../../src/common/fetchErrors');

describe('common/fetchErrors', () => {
  describe('isAbortOrTimeout', () => {
    it('should return true for abort-related error names and codes', () => {
      expect(isAbortOrTimeout(Object.assign(new Error('aborted'), { name: 'AbortError' }))).to.be
        .true;
      expect(isAbortOrTimeout(Object.assign(new Error('timed out'), { name: 'TimeoutError' }))).to
        .be.true;
      expect(isAbortOrTimeout(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' }))).to
        .be.true;
    });

    it('should return false for other errors', () => {
      expect(isAbortOrTimeout(new Error('network failure'))).to.be.false;
      expect(isAbortOrTimeout('aborted')).to.be.false;
    });
  });
});
