# SaaS Review Scrapper

A Node.js/TypeScript project for scraping reviews from SaaS platforms (Capterra, G2, Trustpilot).

## Features

- Modular scraper architecture (Capterra, G2, Trustpilot)
- Uses Puppeteer, Cheerio, Axios for robust web scraping
- TypeScript for type safety
- CLI interface for flexible usage

# Alternative (planned but not implemented due to timing constraint)

- **LLM-based scraping :** Can leverage LLM to extract data from rendered pages, reducing reliance on brittle HTML selectors. This will work efficiently on smaller datasets. It can also add additional data like sentiments of the review.

## Prerequisites

- Node.js (v16 or higher recommended)
- npm

## Installation

```bash
npm install
```

## Environment Setup

### Crawlbase API Key (Required for G2 Scraper)

The G2 scraper uses the [Crawlbase API](https://crawlbase.com/) to fetch review pages. You **must** provide a Crawlbase API key via a `.env` file in the project root.

### Why Crawlbase Usage?

Because G2 has advanced antibot detection and blocks the headless puppeteer scraping as well.

#### Steps to Get a Crawlbase API Key:

1. Go to [Crawlbase Signup](https://app.crawlbase.com/signup) and create a free account.
2. After logging in, navigate to the **API Dashboard**.
3. Copy your API key (token).
4. In your project root, create a file named `.env` and add:

```
CRAWLBASE_TOKEN=your_crawlbase_api_key_here
```

Replace `your_crawlbase_api_key_here` with your actual token.

## Usage

The main entry point is `index.ts`, which supports scraping from any of the three sources via CLI options.

### CLI Usage

```bash
npx ts-node index.ts --company "<Company Name>" --startDate YYYY-MM-DD --endDate YYYY-MM-DD --source <source>
```

- `--company` : Name of the company to scrape reviews for (e.g., "Notion")
- `--startDate` : Start date for reviews (format: YYYY-MM-DD)
- `--endDate` : End date for reviews (format: YYYY-MM-DD)
- `--source` : Review source (`g2`, `capterra`, or `trustpilot`)

#### Example: Scrape G2 Reviews

```bash
npx ts-node index.ts --company "Notion" --startDate 2024-01-01 --endDate 2024-07-01 --source g2
```

#### Example: Scrape Capterra Reviews

```bash
npx ts-node index.ts --company "Notion" --startDate 2024-01-01 --endDate 2024-07-01 --source capterra
```

#### Example: Scrape Trustpilot Reviews

```bash
npx ts-node index.ts --company "Notion" --startDate 2024-01-01 --endDate 2024-07-01 --source trustpilot
```

### Output

- Scraped reviews are saved as JSON files in the `output/<source>/` directory.
- Filenames follow the pattern: `<source>_<company>_<startDate>_<endDate>_reviews.json`

## Project Structure

```
SaaS-Review-Scrapper/
  index.ts            # Main entry point (CLI)
  scrapers/           # Individual scrapers for each SaaS review site
  utils/              # Helper functions and type definitions
  output/             # Script output - Scraped review data (auto-generated)
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
- [crawlbase](https://www.npmjs.com/package/crawlbase) (for G2)

## License

ISC
