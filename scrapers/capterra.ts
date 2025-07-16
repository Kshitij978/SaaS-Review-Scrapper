import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

puppeteer.use(StealthPlugin());

import { Review, Scraper } from "../utils/types";
import { BaseScraper } from "./base";
import { slugify, validateInputs } from "../utils/helpers";

// CapterraScraper: Scrapes reviews for a company from Capterra using Puppeteer
// Inherits from BaseScraper and implements the Scraper interface
export class CapterraScraper extends BaseScraper implements Scraper {
  private _url: string = ""; // URL of the company's Capterra reviews page
  private _reviews: Review[] = []; // Collected reviews

  // Main method to scrape reviews for a company within a date range
  public async scrapeReviews(
    company: string,
    startDate: string,
    endDate: string
  ): Promise<Review[]> {
    // --- Validation ---
    const validationError = validateInputs(
      company,
      startDate,
      endDate,
      "capterra",
      ["capterra"]
    );
    if (validationError) {
      console.error(validationError);
      return [];
    }
    // Dynamically get company ID and slug from search page
    const link = await this._getCompanyLink(company);
    if (!link) {
      console.error(
        "Could not find company ID or slug on Capterra search page."
      );
      return [];
    }
    this._url = `${link}`;
    await this.initPage();
    const page = this.page!;
    try {
      // Go to the company's reviews page and sort by most recent
      await page.goto(this._url, { waitUntil: "networkidle2", timeout: 60000 });
      await page.waitForSelector('[data-testid="filters-sort-by"]', {
        timeout: 10000,
      });
      await page.click('[data-testid="filters-sort-by"]');
      await page.evaluate(() => {
        const mostRecent = document.querySelector(
          '[data-testid="filter-sort-MOST_RECENT"]'
        );
        (mostRecent as HTMLElement).click();
      });
      await this.wait(2000);
      // Load all reviews within the date range
      await this._loadAllReviews(startDate);
      // Extract reviews from the loaded page
      const reviews = await this._extractReviewsFromPage();
      // Filter reviews by the specified date range
      const filteredReviews = this._filterReviewsByDate(
        reviews,
        startDate,
        endDate
      );
      this._reviews = filteredReviews;
      return this._reviews;
    } catch (err) {
      console.error("Error scraping Capterra reviews:", err);
      return [];
    } finally {
      await this.close();
    }
  }

  // Finds the Capterra reviews page link for the given company
  private async _getCompanyLink(company: string): Promise<string | null> {
    const page = await this.initPage();
    const searchUrl = `https://www.capterra.com/search/?query=${encodeURIComponent(
      company
    )}`;
    try {
      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 60000 });
      // Wait for the first product card header
      await page.waitForSelector(
        '[data-testid="shortlist-product-card-header"]',
        { timeout: 10000 }
      );
      // Extract the href using Puppeteer DOM methods
      const link = await page.evaluate(() => {
        const header = document.querySelector(
          '[data-testid="shortlist-product-card-header"]'
        );
        if (!header) return null;
        const anchor = header.querySelector(
          '[data-evt-name="engagement_product_click"]'
        );
        if (!anchor) return null;
        let href = (anchor as HTMLAnchorElement).getAttribute("href");
        if (!href) return null;
        // Ensure full URL
        if (!href.startsWith("http")) {
          href = "https://www.capterra.com" + href;
        }
        // Ensure /reviews at the end
        if (!href.endsWith("/reviews")) {
          href = href.replace(/\/$/, "") + "/reviews";
        }
        return href;
      });
      if (!link) return null;
      return link;
    } catch (err) {
      console.error(
        "Error fetching company link from Capterra search page:",
        err
      );
      return null;
    } finally {
      await this.close();
    }
  }

  // Loads all reviews by clicking the "Show more reviews" button until the earliest review is before the start date
  private async _loadAllReviews(startDate: string): Promise<void> {
    const page = this.page!;
    let loadMore = true;
    while (loadMore) {
      // Get the date of the last review currently loaded
      const lastReviewDate = await page.evaluate(() => {
        const reviewNodes = Array.from(
          document.querySelectorAll(".e1xzmg0z.c1ofrhif")
        );
        if (reviewNodes.length === 0) return null;
        const last = reviewNodes[reviewNodes.length - 3];
        const dateStr =
          (
            last.querySelector("div.typo-0.text-neutral-90") as HTMLElement
          )?.innerText.trim() || "";
        return dateStr;
      });
      if (
        !lastReviewDate ||
        dayjs
          .utc(lastReviewDate, "MMMM DD, YYYY")
          .isBefore(dayjs.utc(startDate, "YYYY-MM-DD"))
      ) {
        break;
      }
      // Click the "Show more reviews" button if available
      const clicked = await page.evaluate(() => {
        const btn = document.querySelector(
          'button[data-testid="show-more-reviews"]'
        );
        if (btn && !btn.hasAttribute("disabled")) {
          (btn as HTMLElement).click();
          return true;
        }
        return false;
      });
      if (!clicked) break;
      await this.wait(2000);
    }
  }

  // Extracts all reviews currently loaded on the page
  private async _extractReviewsFromPage(): Promise<Review[]> {
    const page = this.page!;
    return await page.evaluate(() => {
      const reviewNodes = document.querySelectorAll(".e1xzmg0z.c1ofrhif");
      const data: any[] = [];
      reviewNodes.forEach((el) => {
        const reviewer =
          (
            el.querySelector(
              "span.typo-20.text-neutral-99.font-semibold"
            ) as HTMLElement
          )?.innerText.trim() || "";
        const title =
          (
            el.querySelector("h3.typo-20.font-semibold") as HTMLElement
          )?.innerText.trim() || "";
        const date =
          (
            el.querySelector("div.typo-0.text-neutral-90") as HTMLElement
          )?.innerText.trim() || "";

        const ratingNode = el.querySelector('[data-testid="rating"]');
        const rating = Number(
          (
            ratingNode?.querySelector("span.e1xzmg0z.sr2r3oj") as HTMLElement
          )?.innerText.trim() ?? undefined
        );
        const reviewNode = el.querySelector("div.space-y-6");
        const description =
          reviewNode?.querySelector("p")?.innerText.trim() || "";
        data.push({ title, description, date, reviewer, rating });
      });
      return data;
    });
  }

  // Filters reviews to only those within the specified date range
  private _filterReviewsByDate(
    reviews: Review[],
    startDate: string,
    endDate: string
  ): Review[] {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return reviews.filter((r) => {
      const d = dayjs(r.date);
      return d.isValid() && !d.isBefore(start) && !d.isAfter(end);
    });
  }
}

