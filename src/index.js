#!/usr/bin/env node

import { crawl } from './crawler.js';
import { normalizeUrl } from './urlUtils.js';

function printUsage() {
  console.error(`Usage: node src/index.js <base-url> [options]

Options:
  --concurrency <n>   Maximum concurrent requests (default: 16)
  --timeout <ms>      Per-request timeout in milliseconds (default: 15000)
  --max-pages <n>     Stop after crawling n pages (default: unlimited)

Example:
  node src/index.js https://example.com
  npm start -- https://example.com --concurrency 32`);
}

function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    printUsage();
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
      printUsage();
      process.exit(1);
    }
  }

  return { startUrl, options };
}

async function main() {
  const { startUrl, options } = parseArgs(process.argv.slice(2));

  if (!normalizeUrl(startUrl)) {
    console.error(`Invalid base URL: ${startUrl}`);
    process.exit(1);
  }

  try {
    await crawl(startUrl, options);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
