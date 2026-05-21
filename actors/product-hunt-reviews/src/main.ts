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
  let metadataWarningLogged = false;

  if (urls.length === 0) {
    throw new Error("Input must include at least one Product Hunt product URL.");
  }

  for (const sourceUrl of urls) {
    log.info("Scraping Product Hunt reviews", { sourceUrl });

    const result = await scrapeProductHuntReviews(sourceUrl, input, {
      productHuntApiToken: input.productHuntApiToken
    });

    if (result.metadataWarning && !metadataWarningLogged) {
      log.warning("Product Hunt metadata enrichment skipped", {
        sourceUrl,
        message: result.metadataWarning
      });
      metadataWarningLogged = true;
    }

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
    for (const warning of result.scrapeWarnings) {
      log.warning("Product Hunt review scrape warning", {
        sourceUrl,
        message: warning
      });
    }

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
