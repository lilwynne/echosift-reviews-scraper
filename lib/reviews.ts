import gplayModule from "google-play-scraper";
import got from "got";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { Agent as HttpAgent } from "node:http";
import type { Agent as HttpsAgent } from "node:https";
import {
  APP_STORE_HEADERS,
  APP_STORE_WEB_HEADERS,
  GOOGLE_PLAY_HEADERS
} from "./http-headers.ts";

export type ReviewSource = "product-hunt" | "app-store" | "google-play";

export type NormalizedReview = {
  id?: string;
  source: ReviewSource;
  sourceUrl?: string;
  productName?: string;
  title?: string;
  text: string;
  author?: string;
  authorUsername?: string;
  rating?: number;
  date?: string;
  votes?: number;
};

export type NormalizedProduct = {
  id?: string;
  source: ReviewSource;
  sourceUrl?: string;
  name?: string;
  slug?: string;
  tagline?: string;
  url?: string;
  website?: string;
  commentsCount?: number;
  reviewsCount?: number;
  reviewsRating?: number;
  votesCount?: number;
  createdAt?: string;
  featuredAt?: string;
};

export type FetchReviewsSuccess = {
  ok: true;
  source: ReviewSource;
  sourceUrl: string;
  provider:
    | "product-hunt-graphql"
    | "apple-rss"
    | "apple-web-page"
    | "google-play-scraper"
    | "google-play-web-page";
  product?: NormalizedProduct;
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

export type FetchReviewsOptions = {
  maxReviews?: number;
};

type ProductHuntConfig = {
  source: "product-hunt";
  provider: "product-hunt-graphql";
  slug: string;
  productUrl: string;
};

type AppStoreConfig = {
  source: "app-store";
  provider: "apple-rss";
  appId: string;
  country: string;
  appSlug?: string;
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
type GooglePlayReviewsOptions = {
  appId: string;
  sort: number;
  num: number;
  lang: string;
  country: string;
  throttle: number;
  requestOptions: {
    headers: typeof GOOGLE_PLAY_HEADERS;
    agent?: {
      http?: HttpAgent;
      https?: HttpsAgent;
    };
    timeout?: {
      request: number;
    };
  };
};
type GooglePlayReviewsResult = {
  data?: unknown[];
};
type GooglePlayModuleWithRuntimeOptions = typeof gplayModule & {
  reviews: (
    options: GooglePlayReviewsOptions
  ) => Promise<GooglePlayReviewsResult>;
};

const DEFAULT_MAX_REVIEWS = 100;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_GOOGLE_PLAY_SCRAPER_THROTTLE = 10;
const APP_STORE_PAGE_SIZE = 50;
const APP_STORE_MAX_PAGES = 10;
const PRODUCT_HUNT_GRAPHQL_ENDPOINT =
  "https://api.producthunt.com/v2/api/graphql";
const PRODUCT_HUNT_COMMENTS_PAGE_SIZE = 50;
const APPLE_SEARCH_ENDPOINT = "https://itunes.apple.com/search";

type ProductHuntGraphqlUser = {
  username?: string;
  name?: string;
};

type ProductHuntGraphqlComment = {
  id?: string;
  body?: string;
  createdAt?: string;
  url?: string;
  votesCount?: number;
  user?: ProductHuntGraphqlUser | null;
};

type ProductHuntPageInfo = {
  hasNextPage?: boolean;
  endCursor?: string | null;
};

type ProductHuntGraphqlPost = {
  id?: string;
  name?: string;
  slug?: string;
  tagline?: string;
  url?: string;
  website?: string;
  commentsCount?: number;
  reviewsCount?: number;
  reviewsRating?: number;
  votesCount?: number;
  createdAt?: string;
  featuredAt?: string;
  comments?: {
    nodes?: ProductHuntGraphqlComment[];
    pageInfo?: ProductHuntPageInfo;
    totalCount?: number;
  };
};

type ProductHuntGraphqlPayload = {
  data?: {
    post?: ProductHuntGraphqlPost | null;
  };
  errors?: Array<{
    message?: string;
  }>;
};

type AppleSearchResult = {
  trackId?: number;
  trackName?: string;
  bundleId?: string;
};

type AppleSearchPayload = {
  resultCount?: number;
  results?: AppleSearchResult[];
};

type AppStoreWebReviewsResult = {
  reviews: NormalizedReview[];
  rawItems: JsonRecord[];
};

const PRODUCT_HUNT_POST_COMMENTS_QUERY = `
  query ProductHuntPostComments($slug: String!, $first: Int!, $after: String) {
    post(slug: $slug) {
      id
      name
      slug
      tagline
      url
      website
      commentsCount
      reviewsCount
      reviewsRating
      votesCount
      createdAt
      featuredAt
      comments(first: $first, after: $after, order: NEWEST) {
        nodes {
          id
          body
          createdAt
          url
          votesCount
          user {
            username
            name
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
`;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getMaxReviews() {
  return getPositiveIntegerEnv("REVIEWS_MAX_REVIEWS", DEFAULT_MAX_REVIEWS);
}

function resolveMaxReviews(options?: FetchReviewsOptions) {
  if (
    typeof options?.maxReviews !== "number" ||
    !Number.isFinite(options.maxReviews)
  ) {
    return getMaxReviews();
  }

  const maxReviews = Math.floor(options.maxReviews);

  return maxReviews > 0 ? maxReviews : getMaxReviews();
}

function getRequestTimeoutMs() {
  return getPositiveIntegerEnv(
    "REVIEWS_REQUEST_TIMEOUT_MS",
    DEFAULT_REQUEST_TIMEOUT_MS
  );
}

function getGooglePlayScraperThrottle() {
  return getPositiveIntegerEnv(
    "GOOGLE_PLAY_SCRAPER_THROTTLE",
    DEFAULT_GOOGLE_PLAY_SCRAPER_THROTTLE
  );
}

function getProxyUrl() {
  return (
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    undefined
  );
}

function createHttpProxyAgent() {
  const proxyUrl = getProxyUrl();

  return proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
}

function getAgentOptions() {
  const agent = createHttpProxyAgent();

  return agent
    ? {
        http: agent,
        https: agent
      }
    : undefined;
}

function createTimeoutError(message: string) {
  const error = new Error(message);
  error.name = "TimeoutError";
  return error;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          reject(createTimeoutError(message));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function getProductHuntApiToken() {
  return process.env.PRODUCT_HUNT_API_TOKEN?.trim() || undefined;
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

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    )
    .replace(/&#x([a-f0-9]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&#x22;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
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

function invalidReviewSourceUrlFailure(message: string): FetchReviewsFailure {
  return {
    ok: false,
    error: {
      code: "INVALID_REVIEW_SOURCE_URL",
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

function isGooglePlayBlockedError(error: unknown) {
  if (!isRecord(error) && !(error instanceof Error)) {
    return false;
  }

  const status =
    isRecord(error) && typeof error.status === "number" ? error.status : undefined;
  const message = error instanceof Error ? error.message : String(error);

  return (
    status === 429 ||
    status === 503 ||
    /429|503|captcha|blocked|too many requests|rate limit/i.test(message)
  );
}

function googlePlayScrapeBlockedFailure(): FetchReviewsFailure {
  return {
    ok: false,
    error: {
      code: "GOOGLE_PLAY_SCRAPE_BLOCKED",
      message:
        "Google Play 暂时限制了评论抓取请求，请稍后重试或降低抓取频率。"
    }
  };
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

function getAppStoreSlug(parsedUrl: URL) {
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const appIndex = pathParts.findIndex((part) => part.toLowerCase() === "app");
  const slug = appIndex >= 0 ? pathParts[appIndex + 1] : undefined;

  if (!slug?.trim()) {
    return undefined;
  }

  try {
    return decodeURIComponent(slug).trim();
  } catch {
    return slug.trim();
  }
}

function formatAppStoreSearchTerm(appSlug: string) {
  return appSlug.replace(/-/g, " ");
}

function normalizeLocalePart(value: string | null, fallback: string) {
  return value?.trim().toLowerCase() || fallback;
}

function getProductHuntSlug(parsedUrl: URL) {
  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const productsIndex = pathParts.findIndex((part) => part === "products");
  const slug = productsIndex >= 0 ? pathParts[productsIndex + 1] : undefined;

  return slug?.trim() || undefined;
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

  if (hostname === "producthunt.com" || hostname.endsWith(".producthunt.com")) {
    const slug = getProductHuntSlug(parsedUrl);

    if (!slug) {
      return invalidReviewSourceUrlFailure(
        "Product Hunt 链接中没有找到产品 slug，请使用 /products/{slug} 格式的链接。"
      );
    }

    return {
      source: "product-hunt",
      provider: "product-hunt-graphql",
      slug,
      productUrl: `https://www.producthunt.com/products/${slug}`
    };
  }

  if (hostname === "apps.apple.com") {
    const appId = getAppStoreAppId(parsedUrl);
    const appSlug = getAppStoreSlug(parsedUrl);

    if (!appId && !appSlug) {
      return invalidReviewSourceUrlFailure(
        "App Store 链接中没有找到应用名称或应用 ID。"
      );
    }

    return {
      source: "app-store",
      provider: "apple-rss",
      appId: appId ?? "",
      appSlug,
      country: getAppStoreCountry(parsedUrl)
    };
  }

  if (hostname === "play.google.com") {
    const appId = parsedUrl.searchParams.get("id")?.trim();

    if (!appId) {
      return invalidReviewSourceUrlFailure("Google Play 链接中没有找到应用 ID。");
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

function normalizeProductHuntProduct(
  post: ProductHuntGraphqlPost,
  productUrl: string
): NormalizedProduct {
  return {
    id: post.id,
    source: "product-hunt",
    sourceUrl: productUrl,
    name: post.name,
    slug: post.slug,
    tagline: post.tagline,
    url: post.url,
    website: post.website,
    commentsCount: post.commentsCount,
    reviewsCount: post.reviewsCount,
    reviewsRating: post.reviewsRating,
    votesCount: post.votesCount,
    createdAt: post.createdAt,
    featuredAt: post.featuredAt
  };
}

function getProductHuntGraphqlReview(
  comment: ProductHuntGraphqlComment,
  product: NormalizedProduct | undefined
): NormalizedReview | null {
  const text = textFromHtml(comment.body) ?? comment.body?.trim();

  if (!text) {
    return null;
  }

  return {
    id: comment.id,
    source: "product-hunt",
    sourceUrl: comment.url ?? product?.sourceUrl,
    productName: product?.name,
    text,
    author: comment.user?.name ?? comment.user?.username,
    authorUsername: comment.user?.username,
    date: comment.createdAt,
    votes: comment.votesCount
  };
}

function normalizeProductHuntGraphqlReviews(
  comments: ProductHuntGraphqlComment[],
  product: NormalizedProduct | undefined
) {
  return comments
    .map((comment) => getProductHuntGraphqlReview(comment, product))
    .filter((review): review is NormalizedReview => Boolean(review));
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

function getAppStoreWebReview(
  item: JsonRecord,
  sourceUrl: string
): NormalizedReview | null {
  const text = stringFrom(item, ["contents"]);

  if (!text) {
    return null;
  }

  return {
    id: stringFrom(item, ["id"]),
    source: "app-store",
    sourceUrl,
    title: stringFrom(item, ["title"]),
    text,
    author: stringFrom(item, ["reviewerName"]),
    rating: numberFrom(item, ["rating"]),
    date: stringFrom(item, ["date"])
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

function getNestedRecord(value: unknown, path: string[]) {
  let current = value;

  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(key, 10);

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= current.length
      ) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[key];
  }

  return isRecord(current) ? current : undefined;
}

function parseAppStoreSerializedServerData(html: string) {
  const match = html.match(
    /<script\b[^>]*\bid=["']serialized-server-data["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (!match?.[1]?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(decodeHtmlEntities(match[1].trim())) as unknown;
  } catch {
    return undefined;
  }
}

function getAppStoreWebReviewDedupKey(review: NormalizedReview) {
  if (review.id) {
    return `id:${review.id}`;
  }

  return `fallback:${review.title ?? ""}:${review.text}:${review.date ?? ""}`;
}

function collectAppStoreWebReviewsFromShelf(
  shelf: unknown,
  sourceUrl: string,
  seenKeys: Set<string>,
  maxReviews: number,
  reviews: NormalizedReview[],
  rawItems: JsonRecord[]
) {
  if (reviews.length >= maxReviews || !isRecord(shelf)) {
    return;
  }

  const items = shelf.items;

  if (!Array.isArray(items)) {
    return;
  }

  for (const item of items) {
    if (reviews.length >= maxReviews || !isRecord(item)) {
      continue;
    }

    const reviewRecord = isRecord(item.review) ? item.review : item;

    if (reviewRecord.$kind !== "Review") {
      continue;
    }

    const review = getAppStoreWebReview(reviewRecord, sourceUrl);

    if (!review) {
      continue;
    }

    const dedupKey = getAppStoreWebReviewDedupKey(review);

    if (seenKeys.has(dedupKey)) {
      continue;
    }

    seenKeys.add(dedupKey);
    reviews.push(review);
    rawItems.push(reviewRecord);
  }
}

function normalizeAppStoreWebReviews(
  payload: unknown,
  sourceUrl: string,
  maxReviews: number
): AppStoreWebReviewsResult {
  const reviews: NormalizedReview[] = [];
  const rawItems: JsonRecord[] = [];
  const seenKeys = new Set<string>();
  const pageData = getNestedRecord(payload, ["data", "0", "data"]);

  if (!pageData) {
    return { reviews, rawItems };
  }

  const shelfMapping = isRecord(pageData.shelfMapping)
    ? pageData.shelfMapping
    : undefined;

  collectAppStoreWebReviewsFromShelf(
    shelfMapping?.allProductReviews,
    sourceUrl,
    seenKeys,
    maxReviews,
    reviews,
    rawItems
  );
  collectAppStoreWebReviewsFromShelf(
    shelfMapping?.userProductReviews,
    sourceUrl,
    seenKeys,
    maxReviews,
    reviews,
    rawItems
  );

  return { reviews, rawItems };
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

function getFirstHtmlMatch(html: string, pattern: RegExp) {
  const value = html.match(pattern)?.[1];

  return value ? decodeHtmlEntities(textFromHtml(value) ?? "") : undefined;
}

function parseGooglePlayVotes(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value.replace(/[^\d]/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getGooglePlayWebReviews(
  html: string,
  sourceUrl: string,
  maxReviews: number
) {
  const reviews: NormalizedReview[] = [];
  const rawItems: JsonRecord[] = [];
  const reviewBlocks = html.match(
    /<div class="EGFGHd"[\s\S]*?(?=<div class="EGFGHd"|<script|<footer class="S9dYaf"|$)/g
  );

  for (const block of reviewBlocks ?? []) {
    if (reviews.length >= maxReviews) {
      break;
    }

    const text = getFirstHtmlMatch(block, /<div class="h3YV2d">([\s\S]*?)<\/div>/);

    if (!text) {
      continue;
    }

    const rawItem: JsonRecord = {
      id: block.match(/data-review-id="([^"]+)"/)?.[1],
      userName: getFirstHtmlMatch(block, /<div class="X5PpBb">([\s\S]*?)<\/div>/),
      date: getFirstHtmlMatch(block, /<span class="bp9Aid">([\s\S]*?)<\/span>/),
      score: numberFrom(
        {
          score: block.match(
            /aria-label="Rated (\d+) stars? out of five stars"/
          )?.[1]
        },
        ["score"]
      ),
      thumbsUp: parseGooglePlayVotes(
        block.match(/data-original-thumbs-up-count="([^"]+)"/)?.[1] ??
          getFirstHtmlMatch(block, /<div class="AJTPZc"[^>]*>([\s\S]*?)<\/div>/)
      ),
      text
    };
    const review = getGooglePlayReview(rawItem);

    if (!review) {
      continue;
    }

    reviews.push({
      ...review,
      sourceUrl
    });
    rawItems.push(rawItem);
  }

  return { reviews, rawItems };
}

async function readJsonError(response: Response) {
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

async function resolveAppStoreAppId(sourceConfig: AppStoreConfig) {
  if (sourceConfig.appId) {
    return sourceConfig.appId;
  }

  if (!sourceConfig.appSlug) {
    return undefined;
  }

  const endpoint = new URL(APPLE_SEARCH_ENDPOINT);
  endpoint.searchParams.set("term", formatAppStoreSearchTerm(sourceConfig.appSlug));
  endpoint.searchParams.set("country", sourceConfig.country);
  endpoint.searchParams.set("entity", "software");
  endpoint.searchParams.set("limit", "1");

  const response = await fetchWithTimeout(endpoint, {
    headers: APP_STORE_HEADERS
  });

  if (!response.ok) {
    throw new Error(`Apple Search request failed with HTTP ${response.status}.`);
  }

  const payload = (await response.json()) as AppleSearchPayload;
  const trackId = payload.results?.[0]?.trackId;

  return typeof trackId === "number" && Number.isFinite(trackId)
    ? String(trackId)
    : undefined;
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

async function fetchGooglePlayWebReviews(
  url: string,
  sourceConfig: GooglePlayConfig,
  maxReviews: number
) {
  const endpoint = new URL(
    process.env.GOOGLE_PLAY_WEB_BASE_URL?.trim() ||
      "https://play.google.com/store/apps/details"
  );
  endpoint.searchParams.set("id", sourceConfig.appId);
  endpoint.searchParams.set("hl", sourceConfig.lang);
  endpoint.searchParams.set("gl", sourceConfig.country);

  const response = await got(endpoint.toString(), {
    agent: getAgentOptions(),
    timeout: {
      request: getRequestTimeoutMs()
    },
    headers: GOOGLE_PLAY_HEADERS
  });
  const { reviews, rawItems } = getGooglePlayWebReviews(
    response.body,
    url,
    maxReviews
  );

  return {
    ok: true as const,
    source: sourceConfig.source,
    sourceUrl: url,
    provider: "google-play-web-page" as const,
    count: reviews.length,
    reviews,
    rawItems
  };
}

async function fetchAppStoreWebReviews(
  url: string,
  maxReviews: number
): Promise<AppStoreWebReviewsResult> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: APP_STORE_WEB_HEADERS
    });

    if (!response.ok) {
      return { reviews: [], rawItems: [] };
    }

    const html = await response.text();
    const payload = parseAppStoreSerializedServerData(html);

    if (!payload) {
      return { reviews: [], rawItems: [] };
    }

    return normalizeAppStoreWebReviews(payload, url, maxReviews);
  } catch {
    return { reviews: [], rawItems: [] };
  }
}

async function fetchProductHuntGraphqlPage(
  sourceConfig: ProductHuntConfig,
  first: number,
  after: string | null
) {
  const productHuntApiToken = getProductHuntApiToken();

  if (!productHuntApiToken) {
    throw new Error("MISSING_PRODUCT_HUNT_API_TOKEN");
  }

  const response = await fetchWithTimeout(PRODUCT_HUNT_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${productHuntApiToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: PRODUCT_HUNT_POST_COMMENTS_QUERY,
      variables: {
        slug: sourceConfig.slug,
        first,
        after
      }
    })
  });

  if (!response.ok) {
    const message = await readJsonError(response);
    throw new Error(
      message ?? `Product Hunt GraphQL request failed with HTTP ${response.status}.`
    );
  }

  const payload = (await response.json()) as ProductHuntGraphqlPayload;

  if (payload.errors?.length) {
    throw new Error(
      payload.errors[0]?.message ??
        "Product Hunt GraphQL request returned GraphQL errors."
    );
  }

  return payload;
}

async function fetchProductHuntReviews(
  url: string,
  sourceConfig: ProductHuntConfig,
  maxReviews: number
): Promise<FetchReviewsResult> {
  if (!getProductHuntApiToken()) {
    return {
      ok: false,
      error: {
        code: "MISSING_PRODUCT_HUNT_API_TOKEN",
        message:
          "缺少 PRODUCT_HUNT_API_TOKEN，请先在 .env.local 中配置 Product Hunt Developer Token。"
      }
    };
  }

  const first = Math.min(PRODUCT_HUNT_COMMENTS_PAGE_SIZE, maxReviews);
  const rawItems: unknown[] = [];
  const comments: ProductHuntGraphqlComment[] = [];
  let product: NormalizedProduct | undefined;
  let after: string | null = null;

  try {
    do {
      const page = await fetchProductHuntGraphqlPage(sourceConfig, first, after);
      const post = page.data?.post;

      rawItems.push(page);

      if (!post) {
        return reviewFetchFailedFailure(
          "Product Hunt GraphQL 没有找到这个产品，请检查链接中的 slug。"
        );
      }

      if (!product) {
        product = normalizeProductHuntProduct(post, sourceConfig.productUrl);
      }

      const pageComments = post.comments?.nodes ?? [];
      comments.push(...pageComments);

      const pageInfo = post.comments?.pageInfo;
      after = pageInfo?.hasNextPage ? pageInfo.endCursor ?? null : null;

      if (pageComments.length === 0) {
        break;
      }
    } while (after && comments.length < maxReviews);

    const reviews = normalizeProductHuntGraphqlReviews(
      comments.slice(0, maxReviews),
      product
    );

    return {
      ok: true,
      source: sourceConfig.source,
      sourceUrl: url,
      provider: sourceConfig.provider,
      product,
      count: reviews.length,
      reviews,
      rawItems
    };
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_PRODUCT_HUNT_API_TOKEN") {
      return {
        ok: false,
        error: {
          code: "MISSING_PRODUCT_HUNT_API_TOKEN",
          message:
            "缺少 PRODUCT_HUNT_API_TOKEN，请先在 .env.local 中配置 Product Hunt Developer Token。"
        }
      };
    }

    return friendlyNetworkError(error);
  }
}

async function fetchAppStoreReviews(
  url: string,
  sourceConfig: AppStoreConfig,
  maxReviews: number
): Promise<FetchReviewsResult> {
  const rawItems: unknown[] = [];
  const reviews: NormalizedReview[] = [];
  const pageLimit = Math.min(
    APP_STORE_MAX_PAGES,
    Math.ceil(maxReviews / APP_STORE_PAGE_SIZE)
  );

  try {
    const appId = await resolveAppStoreAppId(sourceConfig);

    if (!appId) {
      return invalidReviewSourceUrlFailure(
        "App Store 链接中没有找到可抓取评论的应用 ID。请使用包含 id 数字的完整 App Store 链接。"
      );
    }

    for (let page = 1; page <= pageLimit && reviews.length < maxReviews; page += 1) {
      const endpoint = new URL(
        `https://itunes.apple.com/${sourceConfig.country}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`
      );
      const response = await fetchWithTimeout(endpoint, {
        headers: APP_STORE_HEADERS
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

    if (reviews.length === 0) {
      const webResult = await fetchAppStoreWebReviews(url, maxReviews);

      if (webResult.reviews.length > 0) {
        return {
          ok: true,
          source: sourceConfig.source,
          sourceUrl: url,
          provider: "apple-web-page",
          count: webResult.reviews.length,
          reviews: webResult.reviews,
          rawItems: webResult.rawItems
        };
      }
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
  sourceConfig: GooglePlayConfig,
  maxReviews: number
): Promise<FetchReviewsResult> {
  let scrapeError: unknown;

  try {
    const gplay = gplayModule as GooglePlayModuleWithRuntimeOptions;
    const requestTimeoutMs = getRequestTimeoutMs();
    const result = await withTimeout(
      gplay.reviews({
        appId: sourceConfig.appId,
        sort: 2,
        num: maxReviews,
        lang: sourceConfig.lang,
        country: sourceConfig.country,
        throttle: getGooglePlayScraperThrottle(),
        requestOptions: {
          headers: GOOGLE_PLAY_HEADERS,
          agent: getAgentOptions(),
          timeout: {
            request: requestTimeoutMs
          }
        }
      }),
      requestTimeoutMs,
      "Google Play review request timed out."
    );
    const rawItems = Array.isArray(result.data) ? result.data : [];
    const reviews = normalizeGooglePlayReviews(rawItems).slice(0, maxReviews);

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
    scrapeError = error;

    if (isGooglePlayBlockedError(error)) {
      return googlePlayScrapeBlockedFailure();
    }
  }

  try {
    const webResult = await fetchGooglePlayWebReviews(
      url,
      sourceConfig,
      Math.min(maxReviews, 10)
    );

    if (webResult.reviews.length > 0) {
      return webResult;
    }
  } catch {
    // Fall through to the original scraper error.
  }

  {
    const error = scrapeError;

    if (isTimeoutError(error)) {
      return {
        ok: false,
        error: {
          code: "REVIEW_FETCH_TIMEOUT",
          message: "Google Play 评论抓取耗时过长，请稍后重试。"
        }
      };
    }

    if (isGooglePlayBlockedError(error)) {
      return googlePlayScrapeBlockedFailure();
    }

    return reviewFetchFailedFailure("Google Play 评论抓取失败，请检查链接后稍后重试。");
  }
}

export async function fetchReviews(
  url: string,
  options?: FetchReviewsOptions
): Promise<FetchReviewsResult> {
  const sourceConfig = getSourceConfig(url.trim());

  if (isFetchReviewsFailure(sourceConfig)) {
    return sourceConfig;
  }

  const maxReviews = resolveMaxReviews(options);

  if (sourceConfig.source === "product-hunt") {
    return fetchProductHuntReviews(url, sourceConfig, maxReviews);
  }

  if (sourceConfig.source === "app-store") {
    return fetchAppStoreReviews(url, sourceConfig, maxReviews);
  }

  return fetchGooglePlayReviews(url, sourceConfig, maxReviews);
}
