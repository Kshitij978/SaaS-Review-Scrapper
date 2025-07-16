export interface Review {
  title: string; // Review title or headline
  description: string; // Main review text
  date: string; // ISO format date string
  reviewer?: string; // Name of the reviewer (optional)
  rating?: number; // Numeric rating (optional)
  [key: string]: any; // For additional fields (platform-specific)
}

// Interface for a scraper class that can fetch reviews for a company
export interface Scraper {
  scrapeReviews(
    company: string,
    startDate: string,
    endDate: string
  ): Promise<Review[]>;
}
