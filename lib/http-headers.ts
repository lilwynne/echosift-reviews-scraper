export type HeaderMap = Record<string, string>;

export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export const APP_STORE_HEADERS: HeaderMap = {
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": BROWSER_USER_AGENT
};

export const APP_STORE_WEB_HEADERS: HeaderMap = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  "User-Agent": BROWSER_USER_AGENT
};

export const GOOGLE_PLAY_HEADERS: HeaderMap = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  Origin: "https://play.google.com",
  Referer: "https://play.google.com/",
  "User-Agent": BROWSER_USER_AGENT
};
