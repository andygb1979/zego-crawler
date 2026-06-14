#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { crawl } from './crawler.js';
import { normalizeUrl } from './urlUtils.js';

export function printUsage() {
  console.error(`Usage: node src/index.js <base-url> [options]

Options:
  --concurrency <n>   Maximum concurrent requests (default: 16)
  --timeout <ms>      Per-request timeout in milliseconds (default: 15000)
  --max-pages <n>     Stop after crawling n pages (default: unlimited)

Example:
  node src/index.js https://example.com
  npm start -- https://example.com --concurrency 32`);
}

export function parseArgs(argv) {
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

export async function main(argv = process.argv.slice(2), dependencies = {}) {
  const runCrawl = dependencies.crawl ?? crawl;
  const { startUrl, options } = parseArgs(argv);

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
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  main();
}
