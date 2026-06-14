const { expect } = require('chai');
const {
  HttpStatus,
  getHttpStatusDescription,
  parseHttpStatusErrorMessage,
} = require('../../src/common/httpStatus');

describe('common/httpStatus', () => {
  describe('HttpStatus', () => {
    it('should expose frozen HTTP status codes', () => {
      expect(HttpStatus.NOT_FOUND).to.equal(404);
      expect(HttpStatus.SERVER_ERROR_MIN).to.equal(500);
      expect(Object.isFrozen(HttpStatus)).to.be.true;
    });
  });

  describe('getHttpStatusDescription', () => {
    it('should return a description for known client error statuses', () => {
      expect(getHttpStatusDescription(HttpStatus.UNAUTHORIZED)).to.equal('unauthorized');
      expect(getHttpStatusDescription(HttpStatus.FORBIDDEN)).to.equal('access forbidden');
      expect(getHttpStatusDescription(HttpStatus.NOT_FOUND)).to.equal('page not found');
      expect(getHttpStatusDescription(HttpStatus.GONE)).to.equal('page gone');
      expect(getHttpStatusDescription(HttpStatus.TOO_MANY_REQUESTS)).to.equal('too many requests');
    });

    it('should treat 5xx responses as server errors', () => {
      expect(getHttpStatusDescription(500)).to.equal('server error');
      expect(getHttpStatusDescription(503)).to.equal('server error');
    });

    it('should fall back to a generic HTTP error label', () => {
      expect(getHttpStatusDescription(418)).to.equal('HTTP error');
    });
  });

  describe('parseHttpStatusErrorMessage', () => {
    it('should parse crawler HTTP error messages', () => {
      expect(parseHttpStatusErrorMessage('HTTP 404')).to.equal(404);
      expect(parseHttpStatusErrorMessage('HTTP 500')).to.equal(500);
    });

    it('should return null for non-HTTP error messages', () => {
      expect(parseHttpStatusErrorMessage('network failure')).to.be.null;
      expect(parseHttpStatusErrorMessage('HTTP 404 extra')).to.be.null;
    });
  });
});
