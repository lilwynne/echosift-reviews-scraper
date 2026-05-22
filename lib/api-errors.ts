export function statusFromScrapeErrorCode(code: string) {
  if (code === "INVALID_URL" || code === "UNSUPPORTED_REVIEW_SOURCE") {
    return 400;
  }

  if (code === "MISSING_PRODUCT_HUNT_API_TOKEN") {
    return 500;
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
