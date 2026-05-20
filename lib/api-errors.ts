export function statusFromScrapeErrorCode(code: string) {
  if (code === "INVALID_URL" || code === "UNSUPPORTED_REVIEW_SOURCE") {
    return 400;
  }

  if (code === "MISSING_APIFY_API_TOKEN") {
    return 500;
  }

  if (code === "APIFY_TIMEOUT" || code === "REVIEW_FETCH_TIMEOUT") {
    return 504;
  }

  if (
    code === "APIFY_REQUEST_FAILED" ||
    code === "APIFY_NETWORK_ERROR" ||
    code === "REVIEW_FETCH_FAILED" ||
    code === "REVIEW_FETCH_NETWORK_ERROR"
  ) {
    return 502;
  }

  return 502;
}
