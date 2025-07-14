# SaaS Review Scrapper

A Node.js/TypeScript project for scraping reviews from SaaS platforms.

## Features

- Modular scraper architecture (Capterra, G2, and more can be added)
- Uses Puppeteer, Cheerio, and Axios for robust web scraping
- TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm

### Installation

```bash
npm install
```

### Usage

The main entry point is `index.ts`. (Implementation required)

Scrapers are located in the `scrapers/` directory:

- `capterra.ts`: Scraper for Capterra reviews (to be implemented)
- `g2.ts`: Scraper for G2 reviews (to be implemented)

You can extend the project by adding more scrapers in the `scrapers/` directory.

## Project Structure

```
SaaS-Review-Scrapper/
  index.ts            # Main entry point
  scrapers/           # Individual scrapers for each SaaS review site
  utils/              # Helper functions and type definitions
  package.json        # Project metadata and dependencies
  tsconfig.json       # TypeScript configuration
```

## Dependencies

- [puppeteer](https://www.npmjs.com/package/puppeteer)
- [cheerio](https://www.npmjs.com/package/cheerio)
- [axios](https://www.npmjs.com/package/axios)
- [dayjs](https://www.npmjs.com/package/dayjs)
- [fs-extra](https://www.npmjs.com/package/fs-extra)
- [yargs](https://www.npmjs.com/package/yargs)

## License

ISC
