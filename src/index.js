#!/usr/bin/env node

const { runCrawler } = require('./cli');

runCrawler().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unexpected error: ${message}`);
  process.exit(1);
});
