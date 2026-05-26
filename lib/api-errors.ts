export function statusFromScrapeErrorCode(code: string) {
  if (
    code === "INVALID_URL" ||
    code === "INVALID_REVIEW_SOURCE_URL" ||
    code === "UNSUPPORTED_REVIEW_SOURCE"
  ) {
    return 400;
  }

  if (code === "MISSING_PRODUCT_HUNT_API_TOKEN") {
    return 503;
  }

  if (code === "GOOGLE_PLAY_SCRAPE_BLOCKED") {
    return 503;
  }

  if (code === "REVIEW_FETCH_TIMEOUT") {
    return 504;
  }

  if (
    code === "REVIEW_FETCH_FAILED" ||
    code === "REVIEW_FETCH_NETWORK_ERROR"
  ) {
    return 502;
  }

  return 502;
}
