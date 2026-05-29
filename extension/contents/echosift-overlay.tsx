import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import cssText from "data-text:~style.css"

import { AnalyzeOverlay } from "~src/components/AnalyzeOverlay"
import { isSupportedProductUrl } from "~src/url-rules"

const URL_CHANGE_EVENT = "echosift:urlchange"
const FALLBACK_URL_CHECK_DELAY_MS = 120

declare global {
  interface Window {
    __echosiftHistoryPatched?: boolean
  }
}

export const config: PlasmoCSConfig = {
  matches: [
    "https://www.producthunt.com/*",
    "https://apps.apple.com/*",
    "https://play.google.com/*"
  ]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

function patchHistoryOnce() {
  if (window.__echosiftHistoryPatched) {
    return
  }

  window.__echosiftHistoryPatched = true

  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method]

    history[method] = function (...args) {
      const result = original.apply(this, args)
      window.dispatchEvent(new Event(URL_CHANGE_EVENT))
      return result
    }
  }
}

function useSpaUrl() {
  const [url, setUrl] = useState(location.href)

  useEffect(() => {
    patchHistoryOnce()

    let lastUrl = location.href
    let fallbackCheckId: number | undefined

    const notify = () => {
      if (location.href === lastUrl) {
        return
      }

      lastUrl = location.href
      setUrl(lastUrl)
    }

    const scheduleFallbackCheck = () => {
      if (fallbackCheckId !== undefined) {
        window.clearTimeout(fallbackCheckId)
      }

      fallbackCheckId = window.setTimeout(() => {
        fallbackCheckId = undefined
        notify()
      }, FALLBACK_URL_CHECK_DELAY_MS)
    }

    window.addEventListener("popstate", notify)
    window.addEventListener("hashchange", notify)
    window.addEventListener(URL_CHANGE_EVENT, notify)
    window.addEventListener("pageshow", notify)
    window.addEventListener("focus", notify)
    document.addEventListener("visibilitychange", notify)
    document.addEventListener("click", scheduleFallbackCheck, true)

    return () => {
      window.removeEventListener("popstate", notify)
      window.removeEventListener("hashchange", notify)
      window.removeEventListener(URL_CHANGE_EVENT, notify)
      window.removeEventListener("pageshow", notify)
      window.removeEventListener("focus", notify)
      document.removeEventListener("visibilitychange", notify)
      document.removeEventListener("click", scheduleFallbackCheck, true)

      if (fallbackCheckId !== undefined) {
        window.clearTimeout(fallbackCheckId)
      }
    }
  }, [])

  return url
}

export default function EchoSiftContent() {
  const url = useSpaUrl()

  if (!isSupportedProductUrl(url)) {
    return null
  }

  return <AnalyzeOverlay currentUrl={url} />
}
