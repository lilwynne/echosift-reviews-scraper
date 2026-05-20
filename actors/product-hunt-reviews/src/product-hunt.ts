import { createHash } from "node:crypto";

export type StartUrl = {
  url?: string;
};

export type ProxyConfiguration = {
  useApifyProxy?: boolean;
  apifyProxyGroups?: string[];
  proxyUrls?: string[];
};

export type ActorInput = {
  start_urls?: Array<StartUrl | string>;
  startUrls?: Array<StartUrl | string>;
  url?: string;
  max_comments?: number;
  maxComments?: number;
  proxyConfiguration?: ProxyConfiguration;
  scrape_comments?: boolean;
  scrape_products?: boolean;
  scrape_users?: boolean;
};

export type ProductMetadata = {
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
};

export type ReviewSections = {
  summary?: string;
  great?: string;
  improvement?: string;
  alternatives?: string;
};

export type ProductHuntDatasetItem = {
  id?: string;
  source: "product-hunt";
  sourceUrl?: string;
  product_name?: string;
  product_url?: string;
  url?: string;
  title?: string;
  body?: string;
  text?: string;
  author?: string;
  created_at?: string;
  vote_count?: number;
  review_type?: "founder" | "other";
  views?: number;
  helpful_count?: number;
  sections?: ReviewSections;
  rating?: number;
  tags?: string[];
  metadata?: ProductMetadata;
  metadata_warning?: string;
  scrape_warnings?: string[];
  code?: string;
  message?: string;
};

type NormalizedProductUrl = {
  slug: string;
  sourceUrl: string;
  productUrl: string;
  reviewsUrl: string;
};

type ParseContext = {
  sourceUrl: string;
  productUrl: string;
  reviewsUrl: string;
  productName?: string;
  metadata?: ProductMetadata;
  metadataWarning?: string;
  scrapeWarnings?: string[];
};

type ScrapeOptions = {
  productHuntApiToken?: string;
  minDelayMs?: number;
  maxDelayMs?: number;
  requestTimeoutMs?: number;
  fetchHtml?: (url: string) => Promise<string>;
};

type MetadataResult = {
  metadata?: ProductMetadata;
  warning?: string;
};

const DEFAULT_MAX_REVIEWS = 100;
const MAX_REVIEWS = 300;
const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_MIN_DELAY_MS = 1_500;
const DEFAULT_MAX_DELAY_MS = 3_000;
const PRODUCT_HUNT_GRAPHQL_ENDPOINT =
  "https://api.producthunt.com/v2/api/graphql";

const REVIEW_METADATA_PATTERN = /^([\d,.]+[KMB]?)\s+views?\s+(.+)$/i;
const TAG_PATTERN = /([A-Za-z][A-Za-z0-9 &/+._-]{1,60}?)\s*\((\d+)\)/g;

function clampMaxReviews(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_REVIEWS;
  }

  return Math.min(Math.max(Math.floor(value), 1), MAX_REVIEWS);
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTitle(html: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) {
    return undefined;
  }

  return decodeHtml(titleMatch[1])
    .replace(/\s*\(\d{4}\)\s*\|\s*Product Hunt\s*$/i, "")
    .replace(/\s*Reviews\s*$/i, "")
    .trim();
}

function htmlToLines(html: string) {
  const withoutScripts = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "\n")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "\n");

  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/?(?:address|article|aside|blockquote|button|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi,
      "\n"
    )
    .replace(/<[^>]+>/g, " ");

  const rawLines = decodeHtml(withBreaks)
    .split(/\n+/)
    .map((line) => normalizeSpaces(line))
    .filter(Boolean);

  const lines: string[] = [];

  for (let index = 0; index < rawLines.length; index += 1) {
    const line = rawLines[index];
    const nextLine = rawLines[index + 1];

    if (line === "•" && nextLine && /^\d[\d,.]*\s+reviews?$/i.test(nextLine)) {
      lines.push(`• ${nextLine}`);
      index += 1;
      continue;
    }

    lines.push(line);
  }

  return lines;
}

function numberFromCompact(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  const match = normalized.match(/^([\d.]+)([KMB])?$/i);

  if (!match) {
    return undefined;
  }

  const base = Number.parseFloat(match[1]);

  if (!Number.isFinite(base)) {
    return undefined;
  }

  const suffix = match[2]?.toUpperCase();

  if (suffix === "K") {
    return Math.round(base * 1_000);
  }

  if (suffix === "M") {
    return Math.round(base * 1_000_000);
  }

  if (suffix === "B") {
    return Math.round(base * 1_000_000_000);
  }

  return Math.round(base);
}

function isNoiseLine(line: string) {
  return (
    /^image:/i.test(line) ||
    /^view all/i.test(line) ||
    /^(founder reviews|other reviews|all reviews|most informative)$/i.test(line) ||
    /^reviews(?:\s+\(\d+\))?$/i.test(line) ||
    /^(share|report)$/i.test(line) ||
    /^(ease of use|reliability|value for money|customization)$/i.test(line)
  );
}

function isReviewCountLine(line: string) {
  return /^•?\s*\d[\d,.]*\s+reviews?\s*$/i.test(line);
}

function getSectionKey(line: string): keyof ReviewSections | undefined {
  const normalized = line.toLowerCase();

  if (normalized === "what's great" || normalized === "whats great") {
    return "great";
  }

  if (normalized === "what needs improvement") {
    return "improvement";
  }

  if (normalized === "vs alternatives" || normalized === "alternatives considered") {
    return "alternatives";
  }

  return undefined;
}

function extractTags(line: string) {
  const tags: string[] = [];
  const matches = line.matchAll(TAG_PATTERN);

  for (const match of matches) {
    tags.push(normalizeSpaces(match[1]));
  }

  return tags;
}

function isPureTagLine(line: string) {
  const tags = extractTags(line);
  if (tags.length === 0) {
    return false;
  }

  return line.replace(TAG_PATTERN, "").trim().length === 0;
}

function parseHelpfulCount(line: string | undefined) {
  if (!line) {
    return undefined;
  }

  const match = line.match(/^Helpful(?:\s*\((\d+)\))?$/i);
  if (!match) {
    return undefined;
  }

  return match[1] ? Number.parseInt(match[1], 10) : 0;
}

function parseMetadataLine(line: string | undefined) {
  if (!line) {
    return undefined;
  }

  const match = line.match(REVIEW_METADATA_PATTERN);
  if (!match) {
    return undefined;
  }

  return {
    views: numberFromCompact(match[1]),
    createdAt: match[2].trim()
  };
}

function slugToName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function hashReview(parts: string[]) {
  return createHash("sha1")
    .update(parts.filter(Boolean).join("|"))
    .digest("hex")
    .slice(0, 16);
}

function findAuthor(
  lines: string[],
  markerIndex: number,
  usedIndex: number,
  productName?: string
) {
  const headerLines = lines.slice(0, markerIndex).filter((line) => {
    if (isNoiseLine(line) || isReviewCountLine(line)) {
      return false;
    }

    if (/^used\s+.+\s+to build\s+.+$/i.test(line)) {
      return false;
    }

    if (productName && line.toLowerCase() === productName.toLowerCase()) {
      return false;
    }

    return true;
  });

  if (headerLines.length === 0) {
    return undefined;
  }

  if (usedIndex >= 0) {
    return headerLines[headerLines.length - 1];
  }

  const last = headerLines[headerLines.length - 1];
  const previous = headerLines[headerLines.length - 2];

  if (previous && !/\s/.test(last) && /\s/.test(previous)) {
    return previous;
  }

  return last;
}

function appendSectionLine(
  sections: Record<keyof ReviewSections, string[]>,
  section: keyof ReviewSections,
  line: string
) {
  if (!line || isNoiseLine(line)) {
    return;
  }

  sections[section].push(line);
}

function extractReviewFromSegment(
  segment: string[],
  context: ParseContext
): ProductHuntDatasetItem | null {
  const reportIndex = segment.findIndex((line) => /^report$/i.test(line));
  const metadataIndex = segment.findIndex((line) => parseMetadataLine(line));
  const helpfulIndex = segment.findIndex((line) => /^Helpful(?:\s*\(\d+\))?$/i.test(line));
  const contentEnd = helpfulIndex >= 0 ? helpfulIndex : metadataIndex;

  if (contentEnd <= 0) {
    return null;
  }

  const reviewLines = segment.slice(0, contentEnd);
  const usedIndex = reviewLines.findIndex((line) =>
    /^used\s+.+\s+to build\s+.+$/i.test(line)
  );
  const reviewCountIndex = reviewLines.findIndex(isReviewCountLine);
  const firstSectionIndex = reviewLines.findIndex((line) => Boolean(getSectionKey(line)));
  const markerCandidates = [reviewCountIndex, usedIndex, firstSectionIndex].filter(
    (index) => index >= 0
  );
  const markerIndex = markerCandidates.length > 0 ? Math.min(...markerCandidates) : 0;
  const author = findAuthor(reviewLines, markerIndex, usedIndex, context.productName);
  const bodyStart =
    reviewCountIndex >= 0
      ? reviewCountIndex + 1
      : usedIndex >= 0
        ? usedIndex + 1
        : markerIndex + 1;
  const contentLines = reviewLines.slice(bodyStart);
  const sections: Record<keyof ReviewSections, string[]> = {
    summary: [],
    great: [],
    improvement: [],
    alternatives: []
  };
  const tags = new Set<string>();
  let currentSection: keyof ReviewSections = "summary";

  for (const rawLine of contentLines) {
    const line = normalizeSpaces(rawLine);
    const sectionKey = getSectionKey(line);

    if (sectionKey) {
      currentSection = sectionKey;
      continue;
    }

    if (/^ratings$/i.test(line)) {
      currentSection = "summary";
      continue;
    }

    for (const tag of extractTags(line)) {
      tags.add(tag);
    }

    if (isPureTagLine(line)) {
      continue;
    }

    appendSectionLine(sections, currentSection, line);
  }

  const bodyLines = [
    ...sections.summary,
    ...sections.great,
    ...sections.improvement,
    ...sections.alternatives
  ];
  const body = bodyLines.join("\n").trim();

  if (!body) {
    return null;
  }

  const metadata = parseMetadataLine(segment[metadataIndex]);
  const helpfulCount = parseHelpfulCount(segment[helpfulIndex]);
  const productName =
    context.metadata?.name ?? context.productName ?? slugToName(new URL(context.productUrl).pathname.split("/").pop() ?? "");
  const id = hashReview([
    context.productUrl,
    author ?? "",
    body.slice(0, 200),
    metadata?.createdAt ?? ""
  ]);
  const reviewSections: ReviewSections = {};

  for (const [key, value] of Object.entries(sections) as Array<
    [keyof ReviewSections, string[]]
  >) {
    const sectionValue = value.join("\n").trim();

    if (sectionValue) {
      reviewSections[key] = sectionValue;
    }
  }

  return {
    id,
    source: "product-hunt",
    sourceUrl: context.sourceUrl,
    product_name: productName,
    product_url: context.productUrl,
    url: context.reviewsUrl,
    title: productName ? `${productName} review` : undefined,
    body,
    text: body,
    author,
    created_at: metadata?.createdAt,
    vote_count: helpfulCount,
    review_type: usedIndex >= 0 ? "founder" : "other",
    views: metadata?.views,
    helpful_count: helpfulCount,
    sections: Object.keys(reviewSections).length > 0 ? reviewSections : undefined,
    tags: tags.size > 0 ? [...tags] : undefined,
    metadata: context.metadata,
    metadata_warning: context.metadataWarning,
    scrape_warnings: context.scrapeWarnings
  };
}

function fingerprintReview(review: ProductHuntDatasetItem) {
  return hashReview([
    review.product_url ?? "",
    review.author ?? "",
    review.body ?? "",
    review.created_at ?? ""
  ]);
}

export function normalizeProductHuntUrl(sourceUrl: string): NormalizedProductUrl {
  const parsedUrl = new URL(sourceUrl);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname !== "producthunt.com" && !hostname.endsWith(".producthunt.com")) {
    throw new Error("Only Product Hunt URLs are supported.");
  }

  const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
  const productsIndex = pathParts.findIndex((part) => part === "products");
  const slug = productsIndex >= 0 ? pathParts[productsIndex + 1] : undefined;

  if (!slug) {
    throw new Error("Product Hunt product URL must include /products/{slug}.");
  }

  const productUrl = `https://www.producthunt.com/products/${slug}`;

  return {
    slug,
    sourceUrl,
    productUrl,
    reviewsUrl: `${productUrl}/reviews`
  };
}

export function buildReviewPageUrls(reviewsUrl: string) {
  return [
    reviewsUrl,
    `${reviewsUrl}?filter=founder`,
    `${reviewsUrl}?feed=single&filter=all`
  ];
}

export function getInputUrls(input: ActorInput | undefined) {
  const startUrls = input?.start_urls ?? input?.startUrls ?? [];
  const urls = startUrls
    .map((item) => (typeof item === "string" ? item : item.url))
    .filter((url): url is string => Boolean(url?.trim()));

  if (input?.url?.trim()) {
    urls.unshift(input.url.trim());
  }

  return [...new Set(urls)];
}

export function parseReviewsFromHtml(html: string, context: ParseContext) {
  const productNameFromTitle = extractTitle(html);
  const parseContext = {
    ...context,
    productName: context.metadata?.name ?? context.productName ?? productNameFromTitle
  };
  const lines = htmlToLines(html);
  const reviews: ProductHuntDatasetItem[] = [];
  let segmentStart = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^report$/i.test(lines[index])) {
      continue;
    }

    const metadata = parseMetadataLine(lines[index + 1]);

    if (!metadata) {
      continue;
    }

    const segment = lines.slice(segmentStart, index + 2);
    const review = extractReviewFromSegment(segment, parseContext);

    if (review) {
      reviews.push(review);
    }

    segmentStart = index + 2;
  }

  const seen = new Set<string>();

  return reviews.filter((review) => {
    const key = fingerprintReview(review);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { dispatcher?: unknown },
  timeoutMs: number
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function buildApifyProxyUrl(proxyConfiguration?: ProxyConfiguration) {
  if (proxyConfiguration?.proxyUrls?.[0]) {
    return proxyConfiguration.proxyUrls[0];
  }

  if (proxyConfiguration?.useApifyProxy === false) {
    return undefined;
  }

  const password = process.env.APIFY_PROXY_PASSWORD;

  if (!password) {
    return undefined;
  }

  const groups = proxyConfiguration?.apifyProxyGroups?.length
    ? proxyConfiguration.apifyProxyGroups.join(",")
    : "DATACENTER";
  const username = groups ? `groups-${groups}` : "auto";

  return `http://${encodeURIComponent(username)}:${encodeURIComponent(
    password
  )}@proxy.apify.com:8000`;
}

async function getProxyDispatcher(proxyConfiguration?: ProxyConfiguration) {
  const proxyUrl = buildApifyProxyUrl(proxyConfiguration);

  if (!proxyUrl) {
    return undefined;
  }

  const { ProxyAgent } = await import("undici");
  return new ProxyAgent(proxyUrl);
}

async function fetchHtmlPage(
  url: string,
  proxyConfiguration: ProxyConfiguration | undefined,
  requestTimeoutMs: number
) {
  const dispatcher = await getProxyDispatcher(proxyConfiguration);
  const response = await fetchWithTimeout(
    url,
    {
      dispatcher,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (compatible; FeatureMapProductHuntReviews/0.1; +https://www.producthunt.com)"
      }
    },
    requestTimeoutMs
  );

  if (!response.ok) {
    throw new Error(`Product Hunt page request failed: ${response.status}`);
  }

  return response.text();
}

async function fetchProductMetadata(
  slug: string,
  token: string | undefined,
  requestTimeoutMs: number
): Promise<MetadataResult> {
  if (!token) {
    return {
      warning:
        "PRODUCT_HUNT_API_TOKEN is not configured; official metadata enrichment was skipped."
    };
  }

  const query = `
    query ProductHuntPost($slug: String!) {
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
      }
    }
  `;
  const response = await fetchWithTimeout(
    PRODUCT_HUNT_GRAPHQL_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: {
          slug
        }
      })
    },
    requestTimeoutMs
  );

  if (!response.ok) {
    return {
      warning: `Product Hunt metadata request failed with HTTP ${response.status}.`
    };
  }

  const payload = (await response.json()) as {
    data?: {
      post?: ProductMetadata | null;
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    return {
      warning:
        payload.errors[0]?.message ??
        "Product Hunt metadata request returned GraphQL errors."
    };
  }

  if (!payload.data?.post) {
    return {
      warning:
        "Product Hunt metadata lookup returned no post for this slug; reviews were still scraped from the public page."
    };
  }

  return {
    metadata: payload.data.post
  };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomDelay(minDelayMs: number, maxDelayMs: number) {
  const min = Math.max(0, minDelayMs);
  const max = Math.max(min, maxDelayMs);
  return Math.round(min + Math.random() * (max - min));
}

export function buildEmptyOrBlockedItem(
  normalizedUrl: NormalizedProductUrl,
  productName: string | undefined,
  metadata: ProductMetadata | undefined,
  metadataWarning: string | undefined,
  scrapeWarnings: string[]
): ProductHuntDatasetItem {
  return {
    source: "product-hunt",
    sourceUrl: normalizedUrl.sourceUrl,
    product_name: metadata?.name ?? productName ?? slugToName(normalizedUrl.slug),
    product_url: normalizedUrl.productUrl,
    url: normalizedUrl.reviewsUrl,
    metadata,
    metadata_warning: metadataWarning,
    scrape_warnings: scrapeWarnings,
    code: "SCRAPE_EMPTY_OR_BLOCKED",
    message:
      "No public Product Hunt reviews could be extracted from the requested pages. The page may be empty, blocked, or structurally changed."
  };
}

export async function scrapeProductHuntReviews(
  sourceUrl: string,
  input: ActorInput,
  options: ScrapeOptions = {}
) {
  const normalizedUrl = normalizeProductHuntUrl(sourceUrl);
  const maxReviews = clampMaxReviews(input.max_comments ?? input.maxComments);
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const metadataResult = await fetchProductMetadata(
    normalizedUrl.slug,
    options.productHuntApiToken,
    requestTimeoutMs
  );
  const scrapeWarnings: string[] = [];
  const allReviews: ProductHuntDatasetItem[] = [];
  const seen = new Set<string>();
  const pageUrls = buildReviewPageUrls(normalizedUrl.reviewsUrl);

  for (const [index, pageUrl] of pageUrls.entries()) {
    if (allReviews.length >= maxReviews) {
      break;
    }

    try {
      const html = options.fetchHtml
        ? await options.fetchHtml(pageUrl)
        : await fetchHtmlPage(pageUrl, input.proxyConfiguration, requestTimeoutMs);
      const reviews = parseReviewsFromHtml(html, {
        sourceUrl: normalizedUrl.sourceUrl,
        productUrl: normalizedUrl.productUrl,
        reviewsUrl: pageUrl,
        productName: metadataResult.metadata?.name ?? slugToName(normalizedUrl.slug),
        metadata: metadataResult.metadata,
        metadataWarning: metadataResult.warning,
        scrapeWarnings
      });

      for (const review of reviews) {
        const key = fingerprintReview(review);

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        allReviews.push(review);

        if (allReviews.length >= maxReviews) {
          break;
        }
      }
    } catch (error) {
      scrapeWarnings.push(
        `${pageUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (index < pageUrls.length - 1 && allReviews.length < maxReviews) {
      await delay(
        randomDelay(
          options.minDelayMs ?? DEFAULT_MIN_DELAY_MS,
          options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
        )
      );
    }
  }

  const productName =
    metadataResult.metadata?.name ??
    allReviews.find((review) => review.product_name)?.product_name ??
    slugToName(normalizedUrl.slug);

  return {
    normalizedUrl,
    metadata: metadataResult.metadata,
    metadataWarning: metadataResult.warning,
    productName,
    scrapeWarnings,
    reviews: allReviews
  };
}
