// lib/scraper/site-configs.ts
// Site-specific scraper configurations
// Each site has its own URL patterns, selectors, pagination rules

export interface SiteConfig {
  id: string;
  name: string;
  baseUrl: string;
  // Category pages to scan
  categories: {
    name: string;
    path: string;               // e.g. "/l-hdlh/l-hdlh-zarna/oron-suuts/"
    listingType: "sale" | "rent";
  }[];
  // Pagination
  pagination: {
    type: "query" | "path";     // ?page=2 or /page/2/
    param: string;              // "page" or path segment
    startPage: number;
    maxPages: number;           // safety limit
  };
  // How to extract listing links from category page
  listingLinkPattern: RegExp;   // regex to match listing URLs
  listingIdExtractor: RegExp;   // extract unique ID from URL
  // Rate limiting
  delayMs: { min: number; max: number }; // random delay between requests
  // Request headers
  headers: Record<string, string>;
  // Cloudflare handling
  requiresBrowser: boolean;     // needs Playwright instead of fetch
  cloudflareWaitMs: number;     // how long to wait for CF challenge
}

export const SITE_CONFIGS: Record<string, SiteConfig> = {
  "unegui.mn": {
    id: "unegui.mn",
    name: "Unegui.mn",
    baseUrl: "https://www.unegui.mn",
    categories: [
      { name: "Орон сууц зарна", path: "/l-hdlh/l-hdlh-zarna/oron-suuts/", listingType: "sale" },
      { name: "Байшин зарна", path: "/l-hdlh/l-hdlh-zarna/baishin-haashaa/", listingType: "sale" },
      { name: "Газар зарна", path: "/l-hdlh/l-hdlh-zarna/gazar/", listingType: "sale" },
      { name: "Арилжааны зарна", path: "/l-hdlh/l-hdlh-zarna/arilzhaa-hdlh/", listingType: "sale" },
      { name: "Орон сууц түрээслүүлнэ", path: "/l-hdlh/l-hdlh-treesllne/oron-suuts/", listingType: "rent" },
    ],
    pagination: {
      type: "query",
      param: "page",
      startPage: 1,
      maxPages: 50,
    },
    listingLinkPattern: /\/adv\/(\d+)[^"']*/g,
    listingIdExtractor: /\/adv\/(\d+)/,
    delayMs: { min: 3000, max: 5000 },
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "mn,en;q=0.9",
    },
    requiresBrowser: true,
    cloudflareWaitMs: 8000,
  },
};

// ─── Scan Modes ─────────────────────────────────────────────
export type ScanMode = "quick" | "full" | "deep";

export interface ScanConfig {
  mode: ScanMode;
  description: string;
  pagesPerCategory: number;
  checkPriceChanges: boolean;
  markStaleListings: boolean;
  intervalMinutes: number;
}

export const SCAN_MODES: Record<ScanMode, ScanConfig> = {
  quick: {
    mode: "quick",
    description: "Шинэ зар шалгах (эхний 2 хуудас)",
    pagesPerCategory: 2,
    checkPriceChanges: false,
    markStaleListings: false,
    intervalMinutes: 30,
  },
  full: {
    mode: "full",
    description: "Бүх хуудас scan (үнэ өөрчлөлт)",
    pagesPerCategory: 10,
    checkPriceChanges: true,
    markStaleListings: false,
    intervalMinutes: 360, // 6 hours
  },
  deep: {
    mode: "deep",
    description: "Deep scan + устсан зар тэмдэглэх",
    pagesPerCategory: 50,
    checkPriceChanges: true,
    markStaleListings: true,
    intervalMinutes: 1440, // 24 hours
  },
};

// ─── Helpers ───────────────────���────────────────────────────
export function randomDelay(config: SiteConfig): Promise<void> {
  const ms = config.delayMs.min + Math.random() * (config.delayMs.max - config.delayMs.min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildPageUrl(config: SiteConfig, categoryPath: string, page: number): string {
  const base = `${config.baseUrl}${categoryPath}`;
  if (page <= config.pagination.startPage) return base;
  if (config.pagination.type === "query") {
    return `${base}?${config.pagination.param}=${page}`;
  }
  return `${base}${config.pagination.param}/${page}/`;
}
