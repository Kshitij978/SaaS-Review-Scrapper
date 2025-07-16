import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import UserAgent from "user-agents";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { Browser, Page } from "puppeteer";
dayjs.extend(utc);

puppeteer.use(StealthPlugin());

export interface ScraperOptions {
  headless?: boolean;
  userDataDir?: string;
  userAgent?: string;
}

export abstract class BaseScraper {
  protected browser: Browser | null = null;
  protected page: Page | null = null;
  protected options: ScraperOptions;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      headless: true,
      userDataDir: "./tmp-user-data",
      ...options,
    };
  }

  async initPage(): Promise<Page> {
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      userDataDir: this.options.userDataDir,
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 900 });
    await this.page.setUserAgent(
      this.options.userAgent || new UserAgent().toString()
    );
    return this.page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  filterReviewsByDate<T extends { date: string }>(
    reviews: T[],
    startDate: string,
    endDate: string,
    dateFormat?: string
  ): T[] {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return reviews.filter((r) => {
      const d = dateFormat ? dayjs(r.date, dateFormat) : dayjs(r.date);
      return d.isValid() && !d.isBefore(start) && !d.isAfter(end);
    });
  }
}
