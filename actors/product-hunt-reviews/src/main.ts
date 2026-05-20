import { getInput, log, pushData } from "./apify-platform.js";
import {
  ActorInput,
  buildEmptyOrBlockedItem,
  getInputUrls,
  scrapeProductHuntReviews
} from "./product-hunt.js";

async function main() {
  const input = (await getInput<ActorInput>()) ?? {};
  const urls = getInputUrls(input);

  if (urls.length === 0) {
    throw new Error("Input must include at least one Product Hunt product URL.");
  }

  for (const sourceUrl of urls) {
    log.info("Scraping Product Hunt reviews", { sourceUrl });

    const result = await scrapeProductHuntReviews(sourceUrl, input, {
      productHuntApiToken: process.env.PRODUCT_HUNT_API_TOKEN
    });
    const items =
      result.reviews.length > 0
        ? result.reviews
        : [
            buildEmptyOrBlockedItem(
              result.normalizedUrl,
              result.productName,
              result.metadata,
              result.metadataWarning,
              result.scrapeWarnings
            )
          ];

    await pushData(items);
    log.info("Finished Product Hunt reviews scrape", {
      sourceUrl,
      count: result.reviews.length,
      warnings: result.scrapeWarnings.length
    });
  }
}

main().catch((error) => {
  log.error("Actor failed", {
    message: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
