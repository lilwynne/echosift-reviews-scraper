import gplayModule from "google-play-scraper";

export type ReviewSource = "product-hunt" | "app-store" | "google-play";

export type NormalizedReview = {
  id?: string;
  source: ReviewSource;
  sourceUrl?: string;
  productName?: string;
  title?: string;
  text: string;
  author?: string;
  rating?: number;
  date?: string;
  votes?: number;
};

export type FetchReviewsSuccess = {
  ok: true;
  source: ReviewSource;
  sourceUrl: string;
  provider: "apify" | "apple-rss" | "google-play-scraper";
  actorId?: string;
  count: number;
  reviews: NormalizedReview[];
  rawItems: unknown[];
};

export type FetchReviewsFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type FetchReviewsResult = FetchReviewsSuccess | FetchReviewsFailure;

type ProductHuntConfig = {
  source: "product-hunt";
  provider: "apify";
  actorId: string;
  input: Record<string, unknown>;
};

type AppStoreConfig = {
  source: "app-store";
  provider: "apple-rss";
  appId: string;
  country: string;
};

type GooglePlayConfig = {
  source: "google-play";
  provider: "google-play-scraper";
  appId: string;
  lang: string;
  country: string;
};

type SourceConfig = ProductHuntConfig | AppStoreConfig | GooglePlayConfig;
type JsonRecord = Record<string, unknown>;

const DEFAULT_PRODUCT_HUNT_ACTOR_ID = "vulnv~producthunt-scraper";
const DEFAULT_MAX_REVIEWS = 100;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_RUN_TIMEOUT_SECS = 120;
const APIFY_MAX_SYNC_TIMEOUT_SECS = 300;
const APP_STORE_PAGE_SIZE = 50;
const APP_STORE_MAX_PAGES = 10;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getMaxReviews() {
  return getPositiveIntegerEnv(
    "REVIEWS_MAX_REVIEWS",
    getPositiveIntegerEnv("APIFY_MAX_REVIEWS", DEFAULT_MAX_REVIEWS)
  );
}

function getRequestTimeoutMs() {
  return getPositiveIntegerEnv(
    "REVIEWS_REQUEST_TIMEOUT_MS",
    getPositiveIntegerEnv("APIFY_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS)
  );
}

function getRunTimeoutSecs() {
  return Math.min(
    getPositiveIntegerEnv("APIFY_RUN_TIMEOUT_SECS", DEFAULT_RUN_TIMEOUT_SECS),
    APIFY_MAX_SYNC_TIMEOUT_SECS
  );
}

function normalizeActorId(actorId: string) {
  return actorId.trim().replace("/", "~");
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFetchReviewsFailure(
  value: SourceConfig | FetchReviewsFailure
): value is FetchReviewsFailure {
  return "error" in value;
}

function stringFrom(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function numberFrom(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseFloat(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function nestedStringFrom(record: JsonRecord, key: string, nestedKeys: string[]) {
  const value = record[key];

  if (!isRecord(value)) {
    return undefined;
  }

  return stringFrom(value, nestedKeys);
}

function textFromHtml(html?: string) {
  return html
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function invalidUrlFailure(): FetchReviewsFailure {
  return {
    ok: false,
    error: {
      code: "INVALID_URL",
      message: "请输入有效的产品链接。"
    }
  };
}

function unsupportedSourceFailure(): FetchReviewsFailure {
  return {
    ok: false,
    error: {
      code: "UNSUPPORTED_REVIEW_SOURCE",
      message: "当前仅支持 Product Hunt、Apple App Store 和 Google Play 链接。"
    }
  };
}

function reviewFetchFailedFailure(
  message = "评论抓取失败，请检查链接后稍后重试。"
): FetchReviewsFailure {
  return {
    ok: false,
    error: {
      code: "REVIEW_FETCH_FAILED",
      message
    }
  };
}

function friendlyNetworkError(error: unknown): FetchReviewsFailure {
  if (isTimeoutError(error)) {
    return {
      ok: false,
      error: {
        code: "REVIEW_FETCH_TIMEOUT",
        message: "评论抓取耗时过长，请稍后重试或缩小抓取范围。"
      }
    };
  }

  return {
    ok: false,
    error: {
      code: "REVIEW_FETCH_NETWORK_ERROR",
      message: "暂时无法连接评论来源，请检查网络或稍后重试。"
    }
  };
}

function isTimeoutError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && /timeout|timed out|etimedout/i.test(error.message))
  );
}

function getAppStoreCountry(parsedUrl: URL) {
  const firstPathSegment = parsedUrl.pathname
    .split("/")
    .filter(Boolean)[0]
    ?.toLowerCase();

  return firstPathSegment && /^[a-z]{2}$/.test(firstPathSegment)
    ? firstPathSegment
    : "us";
}

function getAppStoreAppId(parsedUrl: URL) {
  const idMatch = parsedUrl.pathname.match(/\/id(\d+)(?:[/?#]|$)/i);
  return idMatch?.[1];
}

function normalizeLocalePart(value: string | null, fallback: string) {
  return value?.trim().toLowerCase() || fallback;
}

function getSourceConfig(url: string): SourceConfig | FetchReviewsFailure {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    return invalidUrlFailure();
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return invalidUrlFailure();
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const maxReviews = getMaxReviews();

  if (hostname === "producthunt.com" || hostname.endsWith(".producthunt.com")) {
    const actorId = normalizeActorId(
      process.env.APIFY_PRODUCT_HUNT_ACTOR_ID ?? DEFAULT_PRODUCT_HUNT_ACTOR_ID
    );

    return {
      source: "product-hunt",
      provider: "apify",
      actorId,
      input: {
        start_urls: [{ url }],
        max_products: 1,
        max_comments: maxReviews,
        scrape_comments: true,
        scrape_products: true,
        scrape_users: false
      }
    };
  }

  if (hostname === "apps.apple.com") {
    const appId = getAppStoreAppId(parsedUrl);

    if (!appId) {
      return reviewFetchFailedFailure("App Store 链接中没有找到应用 ID。");
    }

    return {
      source: "app-store",
      provider: "apple-rss",
      appId,
      country: getAppStoreCountry(parsedUrl)
    };
  }

  if (hostname === "play.google.com") {
    const appId = parsedUrl.searchParams.get("id")?.trim();

    if (!appId) {
      return reviewFetchFailedFailure("Google Play 链接中没有找到应用 ID。");
    }

    return {
      source: "google-play",
      provider: "google-play-scraper",
      appId,
      lang: normalizeLocalePart(parsedUrl.searchParams.get("hl"), "en"),
      country: normalizeLocalePart(parsedUrl.searchParams.get("gl"), "us")
    };
  }

  return unsupportedSourceFailure();
}

function getProductHuntReview(
  item: JsonRecord,
  parent?: JsonRecord
): NormalizedReview | null {
  const htmlText = textFromHtml(stringFrom(item, ["body_html", "html"]));
  const text =
    stringFrom(item, ["body", "text", "comment", "content", "review"]) ??
    htmlText;

  if (!text) {
    return null;
  }

  return {
    id: stringFrom(item, ["id", "comment_id", "commentId"]),
    source: "product-hunt",
    sourceUrl:
      stringFrom(item, ["product_url", "productUrl", "url"]) ??
      (parent ? stringFrom(parent, ["product_url", "productUrl", "url"]) : undefined),
    productName:
      stringFrom(item, ["product_name", "productName", "product"]) ??
      (parent
        ? stringFrom(parent, ["name", "product_name", "productName"])
        : undefined),
    text,
    author:
      nestedStringFrom(item, "user", ["name", "username"]) ??
      stringFrom(item, ["author", "username", "user_name", "userName"]),
    date: stringFrom(item, ["created_at", "createdAt", "date", "publishedAt"]),
    votes: numberFrom(item, ["vote_count", "voteCount", "votes", "upvotes"])
  };
}

function normalizeProductHuntReviews(rawItems: unknown[]) {
  const reviews: NormalizedReview[] = [];

  for (const rawItem of rawItems) {
    if (!isRecord(rawItem)) {
      continue;
    }

    const comments = rawItem.comments;

    if (Array.isArray(comments)) {
      for (const comment of comments) {
        if (isRecord(comment)) {
          const review = getProductHuntReview(comment, rawItem);

          if (review) {
            reviews.push(review);
          }
        }
      }
    }

    const review = getProductHuntReview(rawItem);

    if (review) {
      reviews.push(review);
    }
  }

  return reviews;
}

function getRssLabel(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  return typeof value.label === "string" && value.label.trim()
    ? value.label.trim()
    : undefined;
}

function getAppStoreReview(item: JsonRecord): NormalizedReview | null {
  const text = getRssLabel(item.content) ?? getRssLabel(item.summary);

  if (!text) {
    return null;
  }

  const author = isRecord(item.author)
    ? getRssLabel(item.author.name)
    : undefined;

  return {
    id: getRssLabel(item.id),
    source: "app-store",
    title: getRssLabel(item.title),
    text,
    author,
    rating: numberFrom(item, ["im:rating"]),
    date: getRssLabel(item.updated),
    votes: numberFrom(item, ["im:voteSum", "im:voteCount"])
  };
}

function normalizeAppStoreReviews(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.feed)) {
    return [];
  }

  const entries = payload.feed.entry;

  if (!Array.isArray(entries)) {
    return [];
  }

  const reviews: NormalizedReview[] = [];

  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
    }

    const review = getAppStoreReview(entry);

    if (review) {
      reviews.push(review);
    }
  }

  return reviews;
}

function getGooglePlayReview(item: JsonRecord): NormalizedReview | null {
  const text = stringFrom(item, ["text"]);

  if (!text) {
    return null;
  }

  return {
    id: stringFrom(item, ["id"]),
    source: "google-play",
    sourceUrl: stringFrom(item, ["url"]),
    title: stringFrom(item, ["title"]) ?? undefined,
    text,
    author: stringFrom(item, ["userName"]),
    rating: numberFrom(item, ["score"]),
    date: stringFrom(item, ["date"]),
    votes: numberFrom(item, ["thumbsUp"])
  };
}

function normalizeGooglePlayReviews(rawItems: unknown[]) {
  const reviews: NormalizedReview[] = [];

  for (const item of rawItems) {
    if (!isRecord(item)) {
      continue;
    }

    const review = getGooglePlayReview(item);

    if (review) {
      reviews.push(review);
    }
  }

  return reviews;
}

async function readApifyError(response: Response) {
  try {
    const payload = await response.json();

    if (
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.message === "string"
    ) {
      return payload.error.message;
    }
  } catch {
    // Fall through to a generic error. The user-facing message stays friendly.
  }

  return undefined;
}

async function fetchWithTimeout(url: URL | string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchProductHuntReviews(
  url: string,
  sourceConfig: ProductHuntConfig
): Promise<FetchReviewsResult> {
  const token = process.env.APIFY_API_TOKEN?.trim();

  if (!token) {
    return {
      ok: false,
      error: {
        code: "MISSING_APIFY_API_TOKEN",
        message: "缺少 APIFY_API_TOKEN，请先在 .env.local 中配置 Apify API Token。"
      }
    };
  }

  const runTimeoutSecs = getRunTimeoutSecs();
  const endpoint = new URL(
    `https://api.apify.com/v2/acts/${sourceConfig.actorId}/run-sync-get-dataset-items`
  );

  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("clean", "true");
  endpoint.searchParams.set("timeout", String(runTimeoutSecs));

  try {
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sourceConfig.input)
    });

    if (!response.ok) {
      const apifyMessage = await readApifyError(response);

      return {
        ok: false,
        error: {
          code: "APIFY_REQUEST_FAILED",
          message:
            apifyMessage ??
            "Apify 抓取请求失败，请检查 Actor 配置或稍后重试。"
        }
      };
    }

    const payload = await response.json();
    const rawItems = Array.isArray(payload) ? payload : [];
    const reviews = normalizeProductHuntReviews(rawItems).slice(0, getMaxReviews());

    return {
      ok: true,
      source: sourceConfig.source,
      sourceUrl: url,
      provider: sourceConfig.provider,
      actorId: sourceConfig.actorId,
      count: reviews.length,
      reviews,
      rawItems
    };
  } catch (error) {
    return friendlyNetworkError(error);
  }
}

async function fetchAppStoreReviews(
  url: string,
  sourceConfig: AppStoreConfig
): Promise<FetchReviewsResult> {
  const maxReviews = getMaxReviews();
  const rawItems: unknown[] = [];
  const reviews: NormalizedReview[] = [];
  const pageLimit = Math.min(
    APP_STORE_MAX_PAGES,
    Math.ceil(maxReviews / APP_STORE_PAGE_SIZE)
  );

  try {
    for (let page = 1; page <= pageLimit && reviews.length < maxReviews; page += 1) {
      const endpoint = new URL(
        `https://itunes.apple.com/${sourceConfig.country}/rss/customerreviews/page=${page}/id=${sourceConfig.appId}/sortby=mostrecent/json`
      );
      const response = await fetchWithTimeout(endpoint, {
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        return reviewFetchFailedFailure("Apple RSS 评论抓取失败，请稍后重试。");
      }

      const payload = await response.json();
      const pageReviews = normalizeAppStoreReviews(payload);

      rawItems.push(payload);

      if (pageReviews.length === 0) {
        break;
      }

      reviews.push(...pageReviews);
    }

    return {
      ok: true,
      source: sourceConfig.source,
      sourceUrl: url,
      provider: sourceConfig.provider,
      count: Math.min(reviews.length, maxReviews),
      reviews: reviews.slice(0, maxReviews),
      rawItems
    };
  } catch (error) {
    return friendlyNetworkError(error);
  }
}

async function fetchGooglePlayReviews(
  url: string,
  sourceConfig: GooglePlayConfig
): Promise<FetchReviewsResult> {
  try {
    const gplay = gplayModule;
    const result = await gplay.reviews({
      appId: sourceConfig.appId,
      sort: 2,
      num: getMaxReviews(),
      lang: sourceConfig.lang,
      country: sourceConfig.country
    });
    const rawItems = Array.isArray(result.data) ? result.data : [];
    const reviews = normalizeGooglePlayReviews(rawItems).slice(0, getMaxReviews());

    return {
      ok: true,
      source: sourceConfig.source,
      sourceUrl: url,
      provider: sourceConfig.provider,
      count: reviews.length,
      reviews,
      rawItems
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      return {
        ok: false,
        error: {
          code: "REVIEW_FETCH_TIMEOUT",
          message: "Google Play 评论抓取耗时过长，请稍后重试。"
        }
      };
    }

    return reviewFetchFailedFailure("Google Play 评论抓取失败，请检查链接后稍后重试。");
  }
}

export async function fetchReviews(url: string): Promise<FetchReviewsResult> {
  const sourceConfig = getSourceConfig(url.trim());

  if (isFetchReviewsFailure(sourceConfig)) {
    return sourceConfig;
  }

  if (sourceConfig.source === "product-hunt") {
    return fetchProductHuntReviews(url, sourceConfig);
  }

  if (sourceConfig.source === "app-store") {
    return fetchAppStoreReviews(url, sourceConfig);
  }

  return fetchGooglePlayReviews(url, sourceConfig);
}
