const { expect } = require('chai');
const { FetchAbortReason, isAbortOrTimeout } = require('../../src/common/fetchErrors');

describe('common/fetchErrors', () => {
  describe('FetchAbortReason', () => {
    it('should expose frozen abort and timeout identifiers', () => {
      expect(FetchAbortReason.ABORT_ERROR).to.equal('AbortError');
      expect(FetchAbortReason.TIMEOUT_ERROR).to.equal('TimeoutError');
      expect(FetchAbortReason.CANCEL_ERROR).to.equal('CancelError');
      expect(FetchAbortReason.ERR_CANCELED).to.equal('ERR_CANCELED');
      expect(FetchAbortReason.ETIMEDOUT).to.equal('ETIMEDOUT');
      expect(Object.isFrozen(FetchAbortReason)).to.be.true;
    });
  });

  describe('isAbortOrTimeout', () => {
    describe('when the error matches a known abort or timeout signal', () => {
      it('should return true for abort-related error names', () => {
        expect(isAbortOrTimeout(Object.assign(new Error('aborted'), { name: FetchAbortReason.ABORT_ERROR }))).to
          .be.true;
        expect(
          isAbortOrTimeout(Object.assign(new Error('timed out'), { name: FetchAbortReason.TIMEOUT_ERROR })),
        ).to.be.true;
        expect(
          isAbortOrTimeout(Object.assign(new Error('cancelled'), { name: FetchAbortReason.CANCEL_ERROR })),
        ).to.be.true;
      });

      it('should return true for abort-related error codes', () => {
        expect(
          isAbortOrTimeout(Object.assign(new Error('canceled'), { code: FetchAbortReason.ERR_CANCELED })),
        ).to.be.true;
        expect(
          isAbortOrTimeout(Object.assign(new Error('timed out'), { code: FetchAbortReason.ETIMEDOUT })),
        ).to.be.true;
      });
    });

    describe('when the error is not an abort or timeout', () => {
      it('should return false for generic errors', () => {
        expect(isAbortOrTimeout(new Error('network failure'))).to.be.false;
      });

      it('should return false for non-error values', () => {
        expect(isAbortOrTimeout('aborted')).to.be.false;
        expect(isAbortOrTimeout(null)).to.be.false;
      });
    });
  });
});
