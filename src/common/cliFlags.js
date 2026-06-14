const CliFlag = Object.freeze({
  HELP_SHORT: '-h',
  HELP_LONG: '--help',
  OPTION_PREFIX: '--',
});

const isHelpFlag = (arg) => arg === '-h' || arg === '--help';

module.exports = {
  CliFlag,
  isHelpFlag,
};
