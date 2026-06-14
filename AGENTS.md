# AGENTS.md

## Cursor Cloud specific instructions

Zego Crawler is a single Node.js (ES modules, Node ≥ 18) command-line web crawler. There are no servers, databases, or background services to start — the product is the `node src/index.js <url>` CLI.

- Standard commands live in `package.json` scripts: `npm test` (Mocha), `npm run check` (Mocha + c8 coverage, 75% gate), `npm start -- <url>` / `npm run crawl -- <url>`. There is no lint script.
- Tests stub `globalThis.fetch` with Sinon, so `npm test`/`npm run check` need no network access.
- Running the crawler against a remote site (e.g. `npm start -- https://example.com`) requires outbound network. For deterministic multi-page end-to-end testing without network, serve local HTML and crawl it, e.g. `python3 -m http.server 8765` in a folder of cross-linked `.html` files, then `node src/index.js http://localhost:8765/`.
- Crawling is restricted to the base URL's exact hostname; links to other hosts are printed but not crawled.
