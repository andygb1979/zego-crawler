# Zego Crawler

A command-line web crawler written in Node.js. Given a base URL, it discovers pages on the same hostname and prints each page URL together with every link found on that page.

Built for speed using concurrent HTTP requests and lightweight HTML parsing — no browser automation or crawling frameworks.

## Requirements

- Node.js 18 or later

## Installation

```bash
npm install
```

## Usage

```bash
npm start -- <base-url>
```

Examples:

```bash
npm start -- https://example.com
node src/index.js https://example.com
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--concurrency <n>` | Maximum concurrent requests | `16` |
| `--timeout <ms>` | Per-request timeout in milliseconds | `15000` |
| `--max-pages <n>` | Stop after crawling `n` pages | unlimited |
| `-h`, `--help` | Show usage information | |

```bash
npm start -- https://example.com --concurrency 32 --max-pages 100
```

## Output

For each crawled page, the crawler prints the page URL followed by all links found on that page (indented):

```
https://example.com/
  https://example.com/about
  https://other-site.com/contact

https://example.com/about
  https://example.com/
```

## Crawling rules

- **Same hostname only** — only pages on the exact hostname of the base URL are crawled. Other domains and subdomains are ignored for crawling but still appear in the printed link list.
- **HTML pages** — link extraction runs on HTML responses. Non-HTML resources on the same host may be fetched but will not be parsed for links.
- **Deduplication** — URLs are normalised (fragments removed, trailing slashes standardised) to avoid revisiting the same page.
- **Redirects** — redirects to a different hostname are rejected.

## How it works

- **Concurrent BFS** — pages are discovered breadth-first with a configurable worker pool for parallel fetching.
- **Native `fetch`** — uses Node's built-in HTTP client (Undici) with connection reuse.
- **Cheerio** — fast server-side HTML parsing to extract `<a href>` links.

## Project structure

```
src/
  index.js           CLI entry point
  crawler.js         Crawl orchestration and concurrency
  linkExtractor.js   HTML link extraction
  urlUtils.js        URL normalisation and host checks
```

## License

MIT
