import axios from "axios";
import * as cheerio from "cheerio";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Review, Scraper } from "../utils/types";
import { validateInputs } from "../utils/helpers";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export class TrustpilotScraper implements Scraper {
  private _baseUrl: string = "https://www.trustpilot.com";
  private _keepFetching: boolean = true;
  private _foundAny: boolean = true;
  private page: number = 1;
  private allReviews: Review[] = [];
  private _delayMs: number;

  constructor(delayMs: number = 2000) {
    this._delayMs = delayMs;
  }

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
      "trustpilot",
      ["trustpilot"]
    );
    if (validationError) {
      console.error(validationError);
      return [];
    }
    // 1. Find the company page link from search
    const companyLink = await this._findCompanyLink(company);
    if (!companyLink) {
      console.error("Company not found on Trustpilot.");
      return [];
    }
    // 2. Scrape reviews from the company page
    await this._parseReview(
      companyLink,
      dayjs.utc(startDate),
      dayjs.utc(endDate)
    );
    if (!this._foundAny) {
      console.warn(
        `No reviews found for ${company} on Trustpilot in the specified date range.`
      );
    }
    return this.allReviews;
  }

  private async _findCompanyLink(company: string): Promise<string | null> {
    const searchUrl = `${this._baseUrl}/search?query=${encodeURIComponent(
      company
    )}`;
    const response = await axios.get(searchUrl);

    const $ = cheerio.load(response.data);
    const link = $('[data-business-unit-card-link="true"]')
      .first()
      .attr("href");
    console.log(link);
    if (link) {
      return this._baseUrl + link;
    }
    return null;
  }

  private async _parseReview(
    companyUrl: string,
    start: Dayjs,
    end: Dayjs
  ): Promise<void> {
    this.page = 1;
    this._keepFetching = true;
    while (this._keepFetching) {
      const url = `${companyUrl}?page=${this.page}`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const reviews = $(
        '[data-reviews-list-start="true"] > .styles_cardWrapper__g8amG.styles_show__Z8n7u'
      );
      console.log("reviews.children", reviews.children().length);
      if (reviews.length === 0) break;
      let pageHasValid = false;
      reviews.children().each((_, element) => {
        const reviewEl = $(element);
        const title = reviewEl
          .find('[data-service-review-title-typography="true"]')
          .text()
          .trim();
        const description = reviewEl
          .find('[data-service-review-text-typography="true"]')
          .text()
          .trim();
        const dateStr = reviewEl.find("time").attr("datetime") || "";
        console.log({ title, description, dateStr });
        const date = dayjs.utc(dateStr);
        if (!date.isValid()) return;
        if (date.isBefore(start)) {
          this._keepFetching = false;
          return false; // break out of .each
        }
        if (date.isAfter(end)) {
          return;
        }
        pageHasValid = true;
        this._foundAny = true;
        const reviewer = reviewEl
          .find('[data-consumer-name-typography="true"]')
          .text()
          .trim();
        const ratingStr =
          reviewEl
            .find(".styles_reviewHeader__DzoAZ")
            .attr("data-service-review-rating") || "";
        const rating = ratingStr ? parseFloat(ratingStr) : undefined;
        const review: Review = {
          title,
          description,
          date: date.toISOString(),
          reviewer,
          rating,
        };
        this.allReviews.push(review);
      });
      console.log(this.allReviews);
      if (!pageHasValid && this._foundAny) break;
      this.page++;
      await this._wait(this._delayMs);
    }
  }

  private async _wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
