const { Command, CommanderError, InvalidArgumentError } = require('commander');
const crawler = require('./crawler');
const config = require('./config');
const { CliFlag, isHelpFlag } = require('./common/cliFlags');

const _getErrorMessage = (error) => error instanceof Error ? error.message : String(error);

const _exitProcess = (code) => {
  process.exit(code);
  throw new Error(`process.exit:${code}`);
};
const _formatMaxPagesDefault = (maxPages) => maxPages === null ? 'unlimited' : String(maxPages);

const _joinStartUrlFromArgv = (argv) => {
  let startUrl = argv[0];
  let index = 1;

  while (index < argv.length && !argv[index].startsWith(CliFlag.OPTION_PREFIX)) {
    const separator = startUrl.includes('?') ? '&' : '?';
    startUrl += `${separator}${argv[index]}`;
    index += 1;
  }

  return { startUrl, remainingArgv: argv.slice(index) };
};

const _formatUnknownUrlArgumentError = (arg) =>
  arg.includes('=') && !arg.startsWith('-')
    ? `Unknown argument: ${arg}. Query-string fragments are often split by the shell — wrap the full URL in quotes, for example: npm start -- "https://example.com?a=1&b=2"`
    : `Unknown option: ${arg}`;

const _parseRequiredInteger = (label) => (value) => {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) throw new InvalidArgumentError(`Missing or invalid value for ${label}`);

  return parsed;
};

const _buildProgram = () => {
  const crawlerConfig = config.getCrawler();

  return new Command()
    // Commander writes parse errors to stderr before throwing (even with exitOverride).
    // We handle failures in parseArgs and print our own messages, so suppress the default
    // output to avoid duplicate CLI errors and noisy test runs.
    .configureOutput({
      writeErr: () => {},
    })
    .name('zego-crawler')
    .usage('<base-url> [options]')
    .argument('<base-url>', 'URL to start crawling')
    .option(
      '--concurrency <n>',
      `Maximum concurrent requests (default: ${crawlerConfig.concurrency})`,
      _parseRequiredInteger('--concurrency'),
    )
    .option(
      '--timeout <ms>',
      `Per-request timeout in milliseconds (default: ${crawlerConfig.timeoutMs})`,
      _parseRequiredInteger('--timeout'),
    )
    .option(
      '--max-pages <n>',
      `Stop after crawling n pages (default: ${_formatMaxPagesDefault(crawlerConfig.maxPages)})`,
      _parseRequiredInteger('--max-pages'),
    )
    .addHelpText(
      'after',
      `
Examples:
  node src/index.js https://example.com
  npm start -- https://example.com --concurrency 32
  npm start -- "https://example.com/page?utm=1&utm_medium=cpc"

Wrap URLs in quotes if they contain & or other shell-special characters.`,
    );
};

const _getUnknownArgument = (argv) =>
  argv.find((arg) => !arg.startsWith(CliFlag.OPTION_PREFIX) && arg.includes('=') && !arg.startsWith('-')) ?? null;

const _setCrawlerOptions = (options) => {
  const crawlerOptions = {};

  if (options.concurrency !== undefined) crawlerOptions.concurrency = options.concurrency;
  if (options.timeout !== undefined) crawlerOptions.timeoutMs = options.timeout;
  if (options.maxPages !== undefined) crawlerOptions.maxPages = options.maxPages;

  return crawlerOptions;
};

const printUsage = () => console.error(_buildProgram().helpInformation());

const parseArgs = (argv) => {
  if (argv.length === 0) {
    printUsage();
    _exitProcess(1);
  }

  if (argv.some(isHelpFlag)) {
    printUsage();
    _exitProcess(0);
  }

  const { startUrl, remainingArgv } = _joinStartUrlFromArgv(argv);
  const program = _buildProgram();

  program.exitOverride();

  try {
    program.parse([startUrl, ...remainingArgv], { from: 'user' });
  } catch (error) {
    if (error instanceof InvalidArgumentError) {
      console.error(error.message);
      printUsage();
      _exitProcess(1);
    }

    if (error instanceof CommanderError) {
      const unknownArgument = _getUnknownArgument(remainingArgv);
      console.error(
        unknownArgument
          ? _formatUnknownUrlArgumentError(unknownArgument)
          : _formatUnknownUrlArgumentError(
              remainingArgv.find((arg) => arg.startsWith(CliFlag.OPTION_PREFIX)) ?? error.message,
            ),
      );
      printUsage();
      _exitProcess(1);
    }

    throw error;
  }

  return {
    startUrl: program.args[0] ?? startUrl,
    options: _setCrawlerOptions(program.opts()),
  };
};

const runCrawler = async (argv = process.argv.slice(2), dependencies = {}) => {
  const runCrawl = dependencies.crawl ?? crawler.crawl;
  const { startUrl, options } = parseArgs(argv);

  try {
    await runCrawl(startUrl, options);
  } catch (error) {
    const message = _getErrorMessage(error);
    const output = message.startsWith('Invalid ') ? message : `Crawl failed: ${message}`;
    console.error(output);
    _exitProcess(1);
  }
};

module.exports = {
  printUsage,
  parseArgs,
  runCrawler,
};
