// Helper functions for the SaaS Review Scraper
// Includes file writing, date validation, input validation, and utility methods
import fs from "fs-extra";
import dayjs, { Dayjs } from "dayjs";
import { Review } from "./types";
import path from "path";
import axios from "axios";

// Checks if a string is a valid date in YYYY-MM-DD format
export function isValidDate(dateStr: string): boolean {
  return dayjs(dateStr, "YYYY-MM-DD", true).isValid();
}

// Writes JSON data to a file with pretty formatting
export function writeJsonToFile(filename: string, data: any): Promise<void> {
  return fs.writeJson(filename, data, { spaces: 2 });
}

// Converts a company name to a URL-friendly slug
export function slugify(company: string): string {
  return company.toLowerCase().replace(/\s+/g, "-");
}

// Validates user input for company, dates, and source
export function validateInputs(
  company: string,
  startDate: string,
  endDate: string,
  source: string,
  allowedSources: string[]
): string | null {
  if (!company || typeof company !== "string") return "Invalid company name.";
  if (!isValidDate(startDate)) return "Invalid start date. Use YYYY-MM-DD.";
  if (!isValidDate(endDate)) return "Invalid end date. Use YYYY-MM-DD.";
  const start = dayjs.utc(startDate);
  const end = dayjs.utc(endDate);
  const now = dayjs.utc();
  if (start.isAfter(end)) return "Start date must be before end date.";
  if (start.isAfter(now) || end.isAfter(now))
    return "Start or end date cannot be in the future.";
  if (!allowedSources.includes(source.toLowerCase()))
    return `Source must be one of: ${allowedSources.join(", ")}`;
  return null;
}

// Parses a date string in YYYY-MM-DD format and throws if invalid
export function parseDate(dateStr: string): Dayjs {
  const date = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!date.isValid()) throw new Error(`Invalid date: ${dateStr}`);
  return date;
}

// Checks if a date is within a given range (inclusive)
export function isDateInRange(
  date: string | Dayjs,
  start: Dayjs,
  end: Dayjs
): boolean {
  const d = typeof date === "string" ? dayjs(date) : date;
  return d.isAfter(start.subtract(1, "day")) && d.isBefore(end.add(1, "day"));
}

// Writes reviews to a JSON file in the project root (legacy, not used in main script)
export function writeJSON(
  company: string,
  source: string,
  data: Review[]
): void {
  const filename = `${company
    .toLowerCase()
    .replace(/\s+/g, "_")}_${source}_reviews.json`;
  const filepath = path.join(__dirname, "..", filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\u2705 Saved ${data.length} reviews to ${filename}`);
}

// Crawlbase API token (from environment or placeholder)
const CRAWLBASE_TOKEN = process.env.CRAWLBASE_TOKEN || "YOUR_API_KEY";

// Fetches a page using the Crawlbase API and returns the HTML as a string
export async function fetchWithCrawlbase(url: string): Promise<string> {
  const apiUrl = `https://api.crawlbase.com/?token=${CRAWLBASE_TOKEN}&url=${encodeURIComponent(
    url
  )}`;
  const response = await axios.get(apiUrl);
  return response.data;
}
