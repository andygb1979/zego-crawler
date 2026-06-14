const CliFlag = Object.freeze({
  HELP_SHORT: '-h',
  HELP_LONG: '--help',
  OPTION_PREFIX: '--',
});

const HELP_FLAGS = new Set([CliFlag.HELP_SHORT, CliFlag.HELP_LONG]);

const isHelpFlag = (arg) => HELP_FLAGS.has(arg);

module.exports = {
  CliFlag,
  isHelpFlag,
};
