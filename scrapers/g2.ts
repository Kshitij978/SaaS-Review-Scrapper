import * as cheerio from "cheerio";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Review, Scraper } from "../utils/types";
import { CrawlingAPI } from "crawlbase";
import dotenv from "dotenv";
import utc from "dayjs/plugin/utc";
import { slugify, validateInputs } from "../utils/helpers";

dayjs.extend(utc);

dotenv.config();
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// G2Scraper: Scrapes reviews for a company from G2.com using Crawlbase and Cheerio
// Implements the Scraper interface
export class G2Scraper implements Scraper {
  private _api: CrawlingAPI;
  private _slug: string = "";
  private _baseUrl: string = "";

  private _keepFetching: boolean = true; // Controls pagination loop
  private _foundAny: boolean = true; // Tracks if any reviews were found
  private page: number = 1;
  private allReviews: Review[] = [];
  private _delayMs: number; // Delay between requests (ms)

  // Constructor accepts an optional delay between requests
  constructor(delayMs: number = 2000) {
    this._api = new CrawlingAPI({ token: process.env.CRAWLBASE_TOKEN || "" });
    this._delayMs = delayMs;
  }

  // Main method to scrape reviews for a company within a date range
  public async scrapeReviews(
    company: string,
    startDate: string,
    endDate: string
  ): Promise<Review[]> {
    // --- Validation ---
    const validationError = validateInputs(company, startDate, endDate, "g2", [
      "g2",
    ]);
    if (validationError) {
      console.error(validationError);
      return [];
    }
    this._slug = slugify(company);
    this._baseUrl = `https://www.g2.com/products/${this._slug}/reviews`;
    // --- End Validation ---

    // Start parsing reviews
    await this._parseReview(dayjs.utc(startDate), dayjs.utc(endDate));

    if (!this._foundAny) {
      console.warn(
        `No reviews found for ${company} on G2 in the specified date range.`
      );
    }
    return this.allReviews;
  }

  // Fetches HTML content for a given URL using Crawlbase
  private async _getHtml(url: string): Promise<string> {
    const response = await this._api.get(url);
    if (response.status === 404 || response.body.includes("Page not found")) {
      throw new Error("Page not found");
    }
    return response.body;
  }

  // Parses reviews from G2, paginating until all relevant reviews are fetched
  private async _parseReview(start: Dayjs, end: Dayjs): Promise<any> {
    const maxRetries = 3;
    while (this._keepFetching) {
      let attempt = 0;
      let success = false;
      while (attempt < maxRetries && !success) {
        try {
          const url = `${this._baseUrl}?page=${this.page}`;
          const html = await this._getHtml(url);
          const $ = cheerio.load(html);
          const articles = $(".nested-ajax-loading > div > article");
          if (articles.length === 0) break;
          let pageHasValid = false;
          articles.each((_, element) => {
            const reviewEl = $(element);
            // Extract review fields
            const title = reviewEl
              .find('[itemprop="name"] h5')
              .first()
              .text()
              .trim();
            const dateStr =
              reviewEl.find('meta[itemprop="datePublished"]').attr("content") ||
              "";
            console.log(dateStr);
            const date = dayjs.utc(dateStr, "YYYY-MM-DD");
            if (!date.isValid()) return; // skip invalid dates
            if (date.isBefore(start)) {
              // All further reviews will be older (G2 sorts newest first)
              this._keepFetching = false;
              return false; // break out of .each
            }
            if (date.isAfter(end)) {
              // Too new, skip
              return;
            }
            // In range
            pageHasValid = true;
            this._foundAny = true;
            const ratingRaw =
              reviewEl.find('meta[itemprop="ratingValue"]').attr("content") ||
              "";
            const rating = ratingRaw ? Number(ratingRaw) : undefined;
            const reviewerName = reviewEl
              .find('[itemprop="author"] h5')
              .first()
              .text()
              .trim();
            const reviewerTitle = reviewEl
              .find(".elv-tracking-normal.elv-font-figtree.elv-text-xs")
              .eq(0)
              .text()
              .trim();
            const companySize = reviewEl
              .find(".elv-tracking-normal.elv-font-figtree.elv-text-xs")
              .eq(1)
              .text()
              .trim();
            const reviewUrl =
              reviewEl
                .find("[data-clipboard-text]")
                .attr("data-clipboard-text") || "";
            let description = "";
            reviewEl.find('[itemprop="reviewBody"] section p').each((_, p) => {
              description +=
                $(p)
                  .text()
                  .replace(/Review collected by and hosted on G2\.com\./g, "")
                  .trim() + " ";
            });
            description = description.trim();
            const review: Review = {
              title,
              description,
              date: date.toISOString(),
              reviewer: reviewerName,
              reviewerTitle,
              companySize,
              rating,
              reviewUrl,
            };
            console.log(review);
            this.allReviews.push(review);
          });
          if (!pageHasValid) {
            // No valid reviews on this page, stop if we already found some
            if (this._foundAny) break;
          }
          this.page++;
          await this._wait(this._delayMs);
          success = true;
        } catch (err: any) {
          attempt++;
          // Check for 404 error
          if (err && err.message && err.message.includes("Page not found")) {
            console.warn(`404 encountered on page ${this.page}. Stopping.`);
            return;
          } else {
            if (attempt < maxRetries) {
              console.warn(
                `Error fetching/parsing G2 page ${
                  this.page
                } (attempt ${attempt}): ${
                  err && err.message ? err.message : err
                }`
              );
              console.log(`Retrying page ${this.page} in 2 seconds...`);
              await this._wait(2000);
            } else {
              console.error(
                `Failed to fetch/parse G2 page ${this.page} after ${maxRetries} attempts. Last error:`,
                err
              );
              return;
            }
          }
        }
      }
    }
  }

  // Waits for a specified number of milliseconds
  private async _wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
