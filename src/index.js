#!/usr/bin/env node

const { crawl } = require('./crawler');
const { normalizeUrl } = require('./lib/utils');

const main = (module.exports = {});

main.printUsage = () => {
  console.error(`Usage: node src/index.js <base-url> [options]

Options:
  --concurrency <n>   Maximum concurrent requests (default: 16)
  --timeout <ms>      Per-request timeout in milliseconds (default: 15000)
  --max-pages <n>     Stop after crawling n pages (default: unlimited)

Example:
  node src/index.js https://example.com
  npm start -- https://example.com --concurrency 32`);
};

main.parseArgs = (argv) => {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    main.printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const startUrl = argv[0];
  const options = {};

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--concurrency') {
      options.concurrency = Number(argv[++index]);
    } else if (arg === '--timeout') {
      options.timeoutMs = Number(argv[++index]);
    } else if (arg === '--max-pages') {
      options.maxPages = Number(argv[++index]);
    } else {
      console.error(`Unknown option: ${arg}`);
      main.printUsage();
      process.exit(1);
    }
  }

  return { startUrl, options };
};

main.main = async (argv = process.argv.slice(2), dependencies = {}) => {
  const runCrawl = dependencies.crawl ?? crawl;
  const { startUrl, options } = main.parseArgs(argv);

  if (!normalizeUrl(startUrl)) {
    console.error(`Invalid base URL: ${startUrl}`);
    process.exit(1);
  }

  try {
    await runCrawl(startUrl, options);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  main.main();
}
