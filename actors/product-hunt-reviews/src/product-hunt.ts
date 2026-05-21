import { createHash } from "node:crypto";

export type StartUrl = {
  url?: string;
};

export type ProxyConfiguration = {
  useApifyProxy?: boolean;
  apifyProxyGroups?: string[];
  apifyProxyCountry?: string;
  countryCode?: string;
  proxyUrls?: string[];
};

export type ActorInput = {
  start_urls?: Array<StartUrl | string>;
  startUrls?: Array<StartUrl | string>;
  url?: string;
  max_comments?: number;
  maxComments?: number;
  max_page_retries?: number;
  maxPageRetries?: number;
  productHuntApiToken?: string;
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
  scrapeWarnings?: string[];
  accessWarning?: string;
};

type ScrapeOptions = {
  productHuntApiToken?: string;
  minDelayMs?: number;
  maxDelayMs?: number;
  requestTimeoutMs?: number;
  fetchHtml?: (url: string) => Promise<string>;
  renderHtml?: (
    url: string,
    proxyConfiguration: ProxyConfiguration | undefined,
    requestTimeoutMs: number,
    attempt?: PageAttempt
  ) => Promise<string>;
};

type MetadataResult = {
  metadata?: ProductMetadata;
  warning?: string;
};

type TokenResolution = {
  token?: string;
};

type JsonRecord = Record<string, unknown>;

type PageAttempt = {
  attempt: number;
  sessionId?: string;
};

type PageHtmlResult = {
  html: string;
  rendered: boolean;
  warning?: string;
};

type ProxyResolution = {
  configuration?: ProxyConfiguration;
  warning?: string;
};

const DEFAULT_MAX_REVIEWS = 100;
const MAX_REVIEWS = 300;
const DEFAULT_PAGE_RETRIES = 2;
const MAX_PAGE_RETRIES = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_MIN_DELAY_MS = 1_500;
const DEFAULT_MAX_DELAY_MS = 3_000;
const DEFAULT_RENDER_WAIT_MS = 3_000;
const DEFAULT_REVIEW_SCROLL_STEPS = 5;
const DEFAULT_APIFY_PROXY_GROUPS = ["RESIDENTIAL"];
const PRODUCT_HUNT_GRAPHQL_ENDPOINT =
  "https://api.producthunt.com/v2/api/graphql";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const REVIEW_METADATA_PATTERN = /^([\d,.]+[KMB]?)\s+views?\s+(.+)$/i;
const TAG_PATTERN = /([A-Za-z][A-Za-z0-9 &/+._-]{1,60}?)\s*\((\d+)\)/g;

function clampMaxReviews(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_REVIEWS;
  }

  return Math.min(Math.max(Math.floor(value), 1), MAX_REVIEWS);
}

function clampPageRetries(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_PAGE_RETRIES;
  }

  return Math.min(Math.max(Math.floor(value), 0), MAX_PAGE_RETRIES);
}

function normalizeToken(value: string | undefined) {
  const token = value?.trim();
  return token ? token : undefined;
}

export function resolveProductHuntApiToken(explicitToken?: string): TokenResolution {
  return {
    token:
      normalizeToken(explicitToken) ??
      normalizeToken(process.env.PRODUCT_HUNT_API_TOKEN) ??
      normalizeToken(process.env.APIFY_PRODUCT_HUNT_API_TOKEN)
  };
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringFrom(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return normalizeSpaces(decodeHtml(value));
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
      const compact = numberFromCompact(value);

      if (compact !== undefined) {
        return compact;
      }

      const parsed = Number.parseFloat(value.replace(/,/g, ""));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function nestedRecordFrom(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

function nestedStringFrom(record: JsonRecord, key: string, keys: string[]) {
  const nested = record[key];

  if (!isRecord(nested)) {
    return undefined;
  }

  return stringFrom(nested, keys);
}

function flattenHtmlText(value: string | undefined) {
  return value
    ?.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function getAccessChallengeWarning(html: string, proxyEnabled = false) {
  const proxyHint = proxyEnabled
    ? "The configured proxy was still challenged; switch to a residential proxy group your Apify account can access."
    : "Enable Apify Proxy with a residential group your account can access.";

  if (
    /<title[^>]*>\s*Just a moment\.\.\.\s*<\/title>/i.test(html) ||
    /cdn-cgi\/challenge-platform/i.test(html) ||
    /__cf_chl_/i.test(html) ||
    /cf-browser-verification/i.test(html) ||
    /cf-challenge/i.test(html)
  ) {
    return `Product Hunt returned a Cloudflare challenge page instead of review HTML. ${proxyHint}`;
  }

  if (/enable javascript and cookies to continue/i.test(html)) {
    return `Product Hunt returned a JavaScript/cookie challenge instead of review HTML. ${proxyHint}`;
  }

  return undefined;
}

function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
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

function looksLikeReviewRecord(record: JsonRecord) {
  const text = getRecordReviewText(record);

  if (!text || text.length < 20) {
    return false;
  }

  const hasReviewSignal = [
    "review",
    "reviews",
    "reviewRating",
    "reviewType",
    "rating",
    "helpfulCount",
    "founderReview",
    "whatIsGreat",
    "whatNeedsImprovement"
  ].some((key) => key in record);

  const hasCommentNoise = "body" in record && ("post" in record || "thread" in record);

  return hasReviewSignal || !hasCommentNoise;
}

function getRecordReviewText(record: JsonRecord) {
  const explicitText =
    stringFrom(record, [
      "body",
      "text",
      "content",
      "description",
      "review",
      "summary",
      "value",
      "comment"
    ]) ?? flattenHtmlText(stringFrom(record, ["bodyHtml", "body_html", "html"]));

  if (explicitText) {
    return explicitText;
  }

  const sections = [
    stringFrom(record, ["whatIsGreat", "whatsGreat", "great"]),
    stringFrom(record, [
      "whatNeedsImprovement",
      "needsImprovement",
      "improvement",
      "couldBeBetter"
    ]),
    stringFrom(record, ["alternatives", "vsAlternatives", "alternativesConsidered"])
  ].filter((value): value is string => Boolean(value));

  return sections.length > 0 ? sections.join("\n") : undefined;
}

function getRecordAuthor(record: JsonRecord) {
  return (
    nestedStringFrom(record, "user", ["name", "username", "headline"]) ??
    nestedStringFrom(record, "maker", ["name", "username"]) ??
    nestedStringFrom(record, "author", ["name", "username"]) ??
    stringFrom(record, ["author", "authorName", "username", "userName", "name"])
  );
}

function getRecordProductName(record: JsonRecord, context: ParseContext) {
  const product =
    nestedRecordFrom(record, ["product", "post", "topic"]) ??
    nestedRecordFrom(record, ["reviewable"]);

  return (
    context.metadata?.name ??
    stringFrom(record, ["productName", "product_name", "product"]) ??
    (product ? stringFrom(product, ["name", "title"]) : undefined) ??
    context.productName ??
    slugToName(new URL(context.productUrl).pathname.split("/").pop() ?? "")
  );
}

function getRecordProductUrl(record: JsonRecord, context: ParseContext) {
  const product =
    nestedRecordFrom(record, ["product", "post", "topic"]) ??
    nestedRecordFrom(record, ["reviewable"]);
  const path = product ? stringFrom(product, ["slug", "url"]) : undefined;

  if (path?.startsWith("http")) {
    return path;
  }

  if (path?.startsWith("/")) {
    return `https://www.producthunt.com${path}`;
  }

  return context.productUrl;
}

function getRecordTags(record: JsonRecord) {
  const rawTags = record.tags;

  if (!Array.isArray(rawTags)) {
    return undefined;
  }

  const tags = rawTags
    .map((tag) => {
      if (typeof tag === "string") {
        return normalizeSpaces(tag);
      }

      if (isRecord(tag)) {
        return stringFrom(tag, ["name", "title", "slug"]);
      }

      return undefined;
    })
    .filter((tag): tag is string => Boolean(tag));

  return tags.length > 0 ? [...new Set(tags)] : undefined;
}

function reviewFromRecord(
  record: JsonRecord,
  context: ParseContext
): ProductHuntDatasetItem | null {
  if (!looksLikeReviewRecord(record)) {
    return null;
  }

  const body = getRecordReviewText(record);

  if (!body) {
    return null;
  }

  const productName = getRecordProductName(record, context);
  const productUrl = getRecordProductUrl(record, context);
  const sections: ReviewSections = {};
  const great = stringFrom(record, ["whatIsGreat", "whatsGreat", "great"]);
  const improvement = stringFrom(record, [
    "whatNeedsImprovement",
    "needsImprovement",
    "improvement",
    "couldBeBetter"
  ]);
  const alternatives = stringFrom(record, [
    "alternatives",
    "vsAlternatives",
    "alternativesConsidered"
  ]);

  if (great) {
    sections.great = great;
  }

  if (improvement) {
    sections.improvement = improvement;
  }

  if (alternatives) {
    sections.alternatives = alternatives;
  }

  const author = getRecordAuthor(record);
  const createdAt = stringFrom(record, [
    "createdAt",
    "created_at",
    "date",
    "postedAt",
    "updatedAt",
    "updated_at"
  ]);
  const helpfulCount = numberFrom(record, [
    "helpfulCount",
    "helpful_count",
    "voteCount",
    "vote_count",
    "votesCount",
    "votes",
    "upvotes"
  ]);
  const id =
    stringFrom(record, ["id", "databaseId", "objectID", "uuid"]) ??
    hashReview([productUrl, author ?? "", body.slice(0, 200), createdAt ?? ""]);

  return {
    id,
    source: "product-hunt",
    sourceUrl: context.sourceUrl,
    product_name: productName,
    product_url: productUrl,
    url: context.reviewsUrl,
    title: productName ? `${productName} review` : undefined,
    body,
    text: body,
    author,
    created_at: createdAt,
    vote_count: helpfulCount,
    review_type:
      stringFrom(record, ["reviewType", "review_type", "type"])?.toLowerCase() ===
      "founder"
        ? "founder"
        : undefined,
    views: numberFrom(record, ["views", "viewsCount", "viewCount"]),
    helpful_count: helpfulCount,
    sections: Object.keys(sections).length > 0 ? sections : undefined,
    rating: numberFrom(record, ["rating", "score", "reviewRating"]),
    tags: getRecordTags(record),
    metadata: context.metadata,
    scrape_warnings: context.scrapeWarnings
  };
}

function collectReviewRecords(value: unknown, context: ParseContext) {
  const reviews: ProductHuntDatasetItem[] = [];
  const seenObjects = new Set<object>();
  const queue: unknown[] = [value];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }

      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    if (seenObjects.has(current)) {
      continue;
    }

    seenObjects.add(current);

    const review = reviewFromRecord(current, context);

    if (review) {
      reviews.push(review);
    }

    for (const value of Object.values(current)) {
      if (isRecord(value) || Array.isArray(value)) {
        queue.push(value);
      }
    }
  }

  return reviews;
}

function parseJsonScriptsFromHtml(html: string) {
  const values: unknown[] = [];
  const scriptPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    const rawScript = decodeHtml(match[1]).trim();

    if (!rawScript) {
      continue;
    }

    const directJson = rawScript.match(/^\s*({[\s\S]*}|\[[\s\S]*])\s*$/);

    if (directJson) {
      try {
        values.push(JSON.parse(directJson[1]));
      } catch {
        // Some scripts contain JavaScript object syntax, not JSON.
      }
    }

    const nextFlightMatches = rawScript.matchAll(/self\.__next_f\.push\(([\s\S]*?)\)/g);

    for (const flightMatch of nextFlightMatches) {
      try {
        values.push(JSON.parse(flightMatch[1]));
      } catch {
        // Ignore non-JSON script payloads.
      }
    }

    const apolloMatches = rawScript.matchAll(
      /ApolloSSRDataTransport[^{]*({[\s\S]*?})\s*[);]/g
    );

    for (const apolloMatch of apolloMatches) {
      try {
        values.push(JSON.parse(apolloMatch[1]));
      } catch {
        // Product Hunt may embed escaped chunks that are not standalone JSON.
      }
    }
  }

  return values;
}

function parseReviewsFromStructuredData(html: string, context: ParseContext) {
  const reviews: ProductHuntDatasetItem[] = [];

  for (const value of parseJsonScriptsFromHtml(html)) {
    reviews.push(...collectReviewRecords(value, context));
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
  const reviews: ProductHuntDatasetItem[] = [
    ...parseReviewsFromStructuredData(html, parseContext)
  ];
  let segmentStart = 0;
  let reportMetadataMarkers = 0;
  const accessChallengeWarning =
    context.accessWarning ?? getAccessChallengeWarning(html);

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^report$/i.test(lines[index])) {
      continue;
    }

    const metadata = parseMetadataLine(lines[index + 1]);

    if (!metadata) {
      continue;
    }

    reportMetadataMarkers += 1;
    const segment = lines.slice(segmentStart, index + 2);
    const review = extractReviewFromSegment(segment, parseContext);

    if (review) {
      reviews.push(review);
    }

    segmentStart = index + 2;
  }

  if (reportMetadataMarkers === 0 && reviews.length === 0) {
    context.scrapeWarnings?.push(
      accessChallengeWarning ??
        "No Product Hunt review markers were found in the fetched HTML. Product Hunt may have returned a client-rendered, blocked, or changed page."
    );
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

function normalizeProxyConfiguration(
  proxyConfiguration?: ProxyConfiguration
): ProxyResolution {
  if (proxyConfiguration) {
    if (
      proxyConfiguration.useApifyProxy === true &&
      !proxyConfiguration.proxyUrls?.some((url) => url.trim()) &&
      !process.env.APIFY_PROXY_PASSWORD
    ) {
      return {
        configuration: proxyConfiguration,
        warning:
          "Apify Proxy is configured for Product Hunt scraping, but APIFY_PROXY_PASSWORD is unavailable. Requests will run without Apify Proxy and may be blocked by Cloudflare."
      };
    }

    return {
      configuration: proxyConfiguration
    };
  }

  if (process.env.APIFY_PROXY_PASSWORD) {
    return {
      configuration: {
        useApifyProxy: true,
        apifyProxyGroups: DEFAULT_APIFY_PROXY_GROUPS
      }
    };
  }

  return {
    warning:
      "Product Hunt review scraping is running without a proxy. Cloudflare commonly blocks non-proxied Apify traffic; pass proxyConfiguration with a residential Apify Proxy group your account can access."
  };
}

function hasUsableProxy(proxyConfiguration?: ProxyConfiguration) {
  return Boolean(
    proxyConfiguration?.proxyUrls?.some((url) => url.trim()) ||
      (proxyConfiguration?.useApifyProxy === true && process.env.APIFY_PROXY_PASSWORD)
  );
}

function getProxySessionId(slug: string, pageIndex: number, attempt: number) {
  const seed = `${slug}-${pageIndex}-${attempt}-${Date.now()}-${Math.random()}`;
  return `ph${hashReview([seed])}`;
}

function buildApifyProxyUrl(
  proxyConfiguration?: ProxyConfiguration,
  attempt?: PageAttempt
) {
  const proxyUrl = proxyConfiguration?.proxyUrls?.find((url) => url.trim());

  if (proxyUrl) {
    return proxyUrl.trim();
  }

  if (proxyConfiguration?.useApifyProxy !== true) {
    return undefined;
  }

  const password = process.env.APIFY_PROXY_PASSWORD;

  if (!password) {
    return undefined;
  }

  const groups = proxyConfiguration?.apifyProxyGroups?.length
    ? proxyConfiguration.apifyProxyGroups
    : DEFAULT_APIFY_PROXY_GROUPS;
  const usernameParts = groups.length > 0 ? [`groups-${groups.join(",")}`] : ["auto"];
  const countryCode =
    proxyConfiguration?.apifyProxyCountry ?? proxyConfiguration?.countryCode;

  if (countryCode?.trim()) {
    usernameParts.push(`country-${countryCode.trim().toUpperCase()}`);
  }

  if (attempt?.sessionId) {
    usernameParts.push(`session-${attempt.sessionId}`);
  }

  const username = usernameParts.join(",");
  const hostname = process.env.APIFY_PROXY_HOSTNAME ?? "proxy.apify.com";
  const port = process.env.APIFY_PROXY_PORT ?? "8000";

  return `http://${encodeURIComponent(username)}:${encodeURIComponent(
    password
  )}@${hostname}:${port}`;
}

async function getProxyDispatcher(
  proxyConfiguration?: ProxyConfiguration,
  attempt?: PageAttempt
) {
  const proxyUrl = buildApifyProxyUrl(proxyConfiguration, attempt);

  if (!proxyUrl) {
    return undefined;
  }

  const { ProxyAgent } = await import("undici");
  return new ProxyAgent(proxyUrl);
}

function buildPlaywrightProxyOptions(
  proxyConfiguration?: ProxyConfiguration,
  attempt?: PageAttempt
) {
  const proxyUrl = buildApifyProxyUrl(proxyConfiguration, attempt);

  if (!proxyUrl) {
    return undefined;
  }

  const parsedUrl = new URL(proxyUrl);
  const username = decodeURIComponent(parsedUrl.username);
  const password = decodeURIComponent(parsedUrl.password);
  parsedUrl.username = "";
  parsedUrl.password = "";

  return {
    server: parsedUrl.toString(),
    username: username || undefined,
    password: password || undefined
  };
}

async function fetchHtmlPage(
  url: string,
  proxyConfiguration: ProxyConfiguration | undefined,
  requestTimeoutMs: number,
  attempt?: PageAttempt
) {
  const dispatcher = await getProxyDispatcher(proxyConfiguration, attempt);
  const response = await fetchWithTimeout(
    url,
    {
      dispatcher,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": BROWSER_USER_AGENT
      }
    },
    requestTimeoutMs
  );
  const html = await response.text();

  if (!response.ok) {
    throw new Error(
      getAccessChallengeWarning(html, hasUsableProxy(proxyConfiguration)) ??
        `Product Hunt page request failed: ${response.status}`
    );
  }

  return html;
}

async function renderHtmlPage(
  url: string,
  proxyConfiguration: ProxyConfiguration | undefined,
  requestTimeoutMs: number,
  attempt?: PageAttempt
) {
  const { chromium } = await import("playwright");
  const proxy = buildPlaywrightProxyOptions(proxyConfiguration, attempt);
  const browser = await chromium.launch({
    headless: true,
    proxy
  });

  try {
    const context = await browser.newContext({
      userAgent: BROWSER_USER_AGENT,
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    const page = await context.newPage();

    page.setDefaultNavigationTimeout(requestTimeoutMs);
    page.setDefaultTimeout(requestTimeoutMs);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: requestTimeoutMs
    });

    try {
      await page.waitForLoadState("networkidle", {
        timeout: Math.min(requestTimeoutMs, 15_000)
      });
    } catch {
      // Product Hunt can keep analytics/socket requests open. DOM parsing is enough.
    }

    await page.waitForTimeout(DEFAULT_RENDER_WAIT_MS);

    for (let index = 0; index < DEFAULT_REVIEW_SCROLL_STEPS; index += 1) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(700);
    }

    const html = await page.content();
    return html;
  } finally {
    await browser.close();
  }
}

async function getPageHtml(
  pageUrl: string,
  proxyConfiguration: ProxyConfiguration | undefined,
  requestTimeoutMs: number,
  options: ScrapeOptions,
  attempt?: PageAttempt
): Promise<PageHtmlResult> {
  let fallbackWarning: string | undefined;

  if (options.fetchHtml) {
    const html = await options.fetchHtml(pageUrl);
    const warning = getAccessChallengeWarning(
      html,
      hasUsableProxy(proxyConfiguration)
    );

    if (!warning || !options.renderHtml) {
      return {
        html,
        rendered: false,
        warning
      };
    }

    fallbackWarning = warning;
  } else {
    try {
      const html = await fetchHtmlPage(
        pageUrl,
        proxyConfiguration,
        requestTimeoutMs,
        attempt
      );
      const warning = getAccessChallengeWarning(
        html,
        hasUsableProxy(proxyConfiguration)
      );

      if (!warning) {
        return {
          html,
          rendered: false,
          warning
        };
      }

      fallbackWarning = warning;
    } catch (error) {
      fallbackWarning = errorMessage(error);
    }
  }

  const renderHtml = options.renderHtml ?? renderHtmlPage;

  try {
    return {
      html: await renderHtml(pageUrl, proxyConfiguration, requestTimeoutMs, attempt),
      rendered: true,
      warning: fallbackWarning
    };
  } catch (error) {
    throw new Error(
      `${fallbackWarning ? `${fallbackWarning}; ` : ""}Browser render fallback failed: ${errorMessage(
        error
      )}`
    );
  }
}

async function fetchProductMetadata(
  slug: string,
  token: string | undefined,
  requestTimeoutMs: number
): Promise<MetadataResult> {
  if (!token) {
    return {
      warning:
        "Product Hunt API token is not configured; official metadata enrichment was skipped."
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
        Accept: "application/json",
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
    if (response.status === 401 || response.status === 403) {
      return {
        warning:
          "Product Hunt metadata request was rejected. Check that productHuntApiToken is a valid Product Hunt Developer Token with access to the v2 GraphQL API; public reviews scraping will continue without metadata enrichment."
      };
    }

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
  const maxPageRetries = clampPageRetries(
    input.max_page_retries ?? input.maxPageRetries
  );
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const tokenResolution = resolveProductHuntApiToken(
    options.productHuntApiToken ?? input.productHuntApiToken
  );
  const metadataResult = await fetchProductMetadata(
    normalizedUrl.slug,
    tokenResolution.token,
    requestTimeoutMs
  );
  const scrapeWarnings: string[] = [];
  const allReviews: ProductHuntDatasetItem[] = [];
  const seen = new Set<string>();
  const pageUrls = buildReviewPageUrls(normalizedUrl.reviewsUrl);
  const proxyResolution = normalizeProxyConfiguration(input.proxyConfiguration);
  const proxyConfiguration = proxyResolution.configuration;

  if (proxyResolution.warning) {
    scrapeWarnings.push(proxyResolution.warning);
  }

  for (const [index, pageUrl] of pageUrls.entries()) {
    if (allReviews.length >= maxReviews) {
      break;
    }

    const pageWarnings: string[] = [];

    for (let attemptIndex = 0; attemptIndex <= maxPageRetries; attemptIndex += 1) {
      const attempt: PageAttempt = {
        attempt: attemptIndex + 1,
        sessionId: hasUsableProxy(proxyConfiguration)
          ? getProxySessionId(normalizedUrl.slug, index, attemptIndex)
          : undefined
      };
      const attemptWarnings: string[] = [];

      try {
        const pageResult = await getPageHtml(
          pageUrl,
          proxyConfiguration,
          requestTimeoutMs,
          options,
          attempt
        );
        let reviews = parseReviewsFromHtml(pageResult.html, {
          sourceUrl: normalizedUrl.sourceUrl,
          productUrl: normalizedUrl.productUrl,
          reviewsUrl: pageUrl,
          productName: metadataResult.metadata?.name ?? slugToName(normalizedUrl.slug),
          metadata: metadataResult.metadata,
          scrapeWarnings: attemptWarnings,
          accessWarning: pageResult.warning
        });

        if (reviews.length === 0 && !pageResult.rendered) {
          const renderHtml = options.renderHtml ?? renderHtmlPage;

          try {
            const renderedHtml = await renderHtml(
              pageUrl,
              proxyConfiguration,
              requestTimeoutMs,
              attempt
            );
            reviews = parseReviewsFromHtml(renderedHtml, {
              sourceUrl: normalizedUrl.sourceUrl,
              productUrl: normalizedUrl.productUrl,
              reviewsUrl: pageUrl,
              productName:
                metadataResult.metadata?.name ?? slugToName(normalizedUrl.slug),
              metadata: metadataResult.metadata,
              scrapeWarnings: attemptWarnings,
              accessWarning: getAccessChallengeWarning(
                renderedHtml,
                hasUsableProxy(proxyConfiguration)
              )
            });
          } catch (error) {
            if (attemptWarnings.length === 0) {
              attemptWarnings.push(
                pageResult.warning ??
                  `Browser render fallback failed: ${errorMessage(error)}`
              );
            }
          }
        }

        if (reviews.length === 0) {
          const warning =
            attemptWarnings[0] ??
            "No Product Hunt reviews were found in the fetched page.";

          pageWarnings.push(
            `${pageUrl} attempt ${attempt.attempt}: ${warning}`
          );

          if (attemptIndex < maxPageRetries) {
            await delay(
              randomDelay(
                options.minDelayMs ?? DEFAULT_MIN_DELAY_MS,
                options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
              )
            );
            continue;
          }

          break;
        }

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

        pageWarnings.length = 0;
        break;
      } catch (error) {
        pageWarnings.push(
          `${pageUrl} attempt ${attempt.attempt}: ${errorMessage(error)}`
        );

        if (attemptIndex < maxPageRetries) {
          await delay(
            randomDelay(
              options.minDelayMs ?? DEFAULT_MIN_DELAY_MS,
              options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
            )
          );
        }
      }
    }

    if (pageWarnings.length > 0) {
      scrapeWarnings.push(pageWarnings[pageWarnings.length - 1]);
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
