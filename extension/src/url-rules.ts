export function isSupportedProductUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)

    if (url.hostname === "www.producthunt.com") {
      return /^\/products\/[^/]+\/?$/.test(url.pathname)
    }

    if (url.hostname === "apps.apple.com") {
      return /^\/[^/]+\/app\/[^/]+/.test(url.pathname)
    }

    if (url.hostname === "play.google.com") {
      return url.pathname === "/store/apps/details" && url.searchParams.has("id")
    }

    return false
  } catch {
    return false
  }
}

export function normalizeAnalysisUrl(rawUrl: string) {
  const url = new URL(rawUrl.trim())

  url.protocol = url.protocol.toLowerCase()
  url.hostname = url.hostname.toLowerCase()
  url.hash = ""

  if (url.hostname === "www.producthunt.com") {
    url.pathname = url.pathname.replace(/\/+$/, "")
  }

  const sortedSearchParams = Array.from(url.searchParams.entries()).sort(
    ([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  )

  url.search = ""

  for (const [key, value] of sortedSearchParams) {
    url.searchParams.append(key, value)
  }

  return url.toString()
}
