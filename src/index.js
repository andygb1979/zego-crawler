#!/usr/bin/env node
const { runCrawler } = require('./cli');

(async () => await runCrawler())().catch((error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
