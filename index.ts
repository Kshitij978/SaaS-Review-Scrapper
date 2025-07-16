import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { G2Scraper } from "./scrapers/g2";
import { CapterraScraper } from "./scrapers/capterra";
import { TrustpilotScraper } from "./scrapers/trustpilot";
import { writeJsonToFile, validateInputs } from "./utils/helpers";
import { Review } from "./utils/types";
import fs from "fs";
import path from "path";

// List of allowed review sources
const allowedSources = ["g2", "capterra", "trustpilot"];

// Parse command-line arguments using yargs
const argv = yargs(hideBin(process.argv))
  .option("company", {
    type: "string",
    demandOption: true,
    describe: "Company name to scrape reviews for",
  })
  .option("startDate", {
    type: "string",
    demandOption: true,
    describe: "Start date (YYYY-MM-DD)",
  })
  .option("endDate", {
    type: "string",
    demandOption: true,
    describe: "End date (YYYY-MM-DD)",
  })
  .option("source", {
    type: "string",
    demandOption: true,
    choices: allowedSources,
    describe: "Review source (g2, capterra, trustpilot)",
  })
  .help().argv as any;

// Helper function to generate the output file path based on input parameters
function getOutputPath(
  source: string,
  company: string,
  startDate: string,
  endDate: string
): string {
  const slug = company.toLowerCase().replace(/\s+/g, "_");
  const dir = path.join("output", source);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(
    dir,
    `${source}_${slug}_${startDate}_${endDate}_reviews.json`
  );
}

// Main function: validates input, selects the scraper, runs the scrape, and writes output
async function main() {
  const { company, startDate, endDate, source } = argv;
  // Validate user inputs
  const validationError = validateInputs(
    company,
    startDate,
    endDate,
    source,
    allowedSources
  );
  if (validationError) {
    console.error("Input error:", validationError);
    process.exit(1);
  }

  let scraper;
  // Select the appropriate scraper based on the source
  switch (source.toLowerCase()) {
    case "g2":
      scraper = new G2Scraper();
      break;
    case "capterra":
      scraper = new CapterraScraper();
      break;
    case "trustpilot":
      scraper = new TrustpilotScraper();
      break;
    default:
      console.error("Unknown source.");
      process.exit(1);
  }

  try {
    console.log(
      `Scraping ${source} reviews for ${company} from ${startDate} to ${endDate}...`
    );
    // Run the scraper and collect reviews
    const reviews: Review[] = await scraper.scrapeReviews(
      company,
      startDate,
      endDate
    );
    // Write the reviews to a JSON file
    const outPath = getOutputPath(source, company, startDate, endDate);
    await writeJsonToFile(outPath, reviews);
    console.log(`Done! Saved ${reviews.length} reviews to ${outPath}`);
  } catch (err) {
    console.error("Error during scraping:", err);
    process.exit(1);
  }
}

main();
