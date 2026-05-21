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
  provider: "product-hunt-graphql" | "apple-rss" | "google-play-scraper";
  actorId?: string;
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

const DEFAULT_MAX_REVIEWS = 100;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const APP_STORE_PAGE_SIZE = 50;
const APP_STORE_MAX_PAGES = 10;
const PRODUCT_HUNT_GRAPHQL_ENDPOINT =
  "https://api.producthunt.com/v2/api/graphql";
const PRODUCT_HUNT_COMMENTS_PAGE_SIZE = 50;

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
      return reviewFetchFailedFailure(
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
  sourceConfig: ProductHuntConfig
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

  const maxReviews = getMaxReviews();
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
