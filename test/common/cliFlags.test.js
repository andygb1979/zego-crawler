const { expect } = require('chai');
const { CliFlag, isHelpFlag } = require('../../src/common/cliFlags');

describe('common/cliFlags', () => {
  describe('CliFlag', () => {
    it('should expose frozen CLI flag constants', () => {
      expect(CliFlag.HELP_SHORT).to.equal('-h');
      expect(CliFlag.HELP_LONG).to.equal('--help');
      expect(CliFlag.OPTION_PREFIX).to.equal('--');
      expect(Object.isFrozen(CliFlag)).to.be.true;
    });
  });

  describe('isHelpFlag', () => {
    it('should recognise short and long help flags', () => {
      expect(isHelpFlag(CliFlag.HELP_SHORT)).to.be.true;
      expect(isHelpFlag(CliFlag.HELP_LONG)).to.be.true;
    });

    it('should reject non-help arguments', () => {
      expect(isHelpFlag('--max-pages')).to.be.false;
      expect(isHelpFlag('https://example.com')).to.be.false;
    });
  });
});
