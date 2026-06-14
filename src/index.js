const { Command, CommanderError, InvalidArgumentError } = require('commander');
const crawler = require('./crawler');
const config = require('./config');
const { CliFlag, isHelpFlag } = require('./common/cliFlags');
const utils = require('./lib/utils');

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : String(error);

const exitProcess = (code) => {
  process.exit(code);
  throw new Error(`process.exit:${code}`);
};

const formatMaxPagesDefault = (maxPages) =>
  maxPages === null ? 'unlimited' : String(maxPages);

const joinStartUrlFromArgv = (argv) => {
  let startUrl = argv[0];
  let index = 1;

  while (index < argv.length && !argv[index].startsWith(CliFlag.OPTION_PREFIX)) {
    const separator = startUrl.includes('?') ? '&' : '?';
    startUrl += `${separator}${argv[index]}`;
    index += 1;
  }

  return { startUrl, remainingArgv: argv.slice(index) };
};

const formatUnknownUrlArgumentError = (arg) => {
  if (arg.includes('=') && !arg.startsWith('-')) {
    return (
      `Unknown argument: ${arg}. Query-string fragments are often split by the shell — ` +
      'wrap the full URL in quotes, for example: npm start -- "https://example.com?a=1&b=2"'
    );
  }

  return `Unknown option: ${arg}`;
};

const parseRequiredInteger = (label) => (value) => {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new InvalidArgumentError(`Missing or invalid value for ${label}`);
  }

  return parsed;
};

const buildProgram = () => {
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
      parseRequiredInteger('--concurrency'),
    )
    .option(
      '--timeout <ms>',
      `Per-request timeout in milliseconds (default: ${crawlerConfig.timeoutMs})`,
      parseRequiredInteger('--timeout'),
    )
    .option(
      '--max-pages <n>',
      `Stop after crawling n pages (default: ${formatMaxPagesDefault(crawlerConfig.maxPages)})`,
      parseRequiredInteger('--max-pages'),
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

const getUnknownArgument = (argv) => {
  for (const arg of argv) {
    if (!arg.startsWith(CliFlag.OPTION_PREFIX) && arg.includes('=') && !arg.startsWith('-')) {
      return arg;
    }
  }

  return null;
};

const toCrawlerOptions = (options) => {
  const crawlerOptions = {};

  if (options.concurrency !== undefined) {
    crawlerOptions.concurrency = options.concurrency;
  }

  if (options.timeout !== undefined) {
    crawlerOptions.timeoutMs = options.timeout;
  }

  if (options.maxPages !== undefined) {
    crawlerOptions.maxPages = options.maxPages;
  }

  return crawlerOptions;
};

const printUsage = () => {
  console.error(buildProgram().helpInformation());
};

const parseArgs = (argv) => {
  if (argv.length === 0) {
    printUsage();
    exitProcess(1);
  }

  if (argv.some(isHelpFlag)) {
    printUsage();
    exitProcess(0);
  }

  const { startUrl, remainingArgv } = joinStartUrlFromArgv(argv);
  const program = buildProgram();

  program.exitOverride();

  try {
    program.parse([startUrl, ...remainingArgv], { from: 'user' });
  } catch (error) {
    if (error instanceof InvalidArgumentError) {
      console.error(error.message);
      printUsage();
      exitProcess(1);
    }

    if (error instanceof CommanderError) {
      const unknownArgument = getUnknownArgument(remainingArgv);
      console.error(
        unknownArgument
          ? formatUnknownUrlArgumentError(unknownArgument)
          : formatUnknownUrlArgumentError(
              remainingArgv.find((arg) => arg.startsWith(CliFlag.OPTION_PREFIX)) ?? error.message,
            ),
      );
      printUsage();
      exitProcess(1);
    }

    throw error;
  }

  return {
    startUrl: program.args[0] ?? startUrl,
    options: toCrawlerOptions(program.opts()),
  };
};

const main = async (argv = process.argv.slice(2), dependencies = {}) => {
  const runCrawl = dependencies.crawl ?? crawler.crawl;
  const { startUrl, options } = parseArgs(argv);
  const startUrlValidation = utils.parseStartUrl(startUrl);

  if (startUrlValidation.valid) {
    try {
      await runCrawl(startUrlValidation.url, options);
    } catch (error) {
      console.error(`Crawl failed: ${getErrorMessage(error)}`);
      exitProcess(1);
    }

    return;
  }

  console.error(startUrlValidation.error);
  exitProcess(1);
};

module.exports = {
  printUsage,
  parseArgs,
  main,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Unexpected error: ${getErrorMessage(error)}`);
    exitProcess(1);
  });
}
