// lib/scraper/browser.ts
// Playwright browser manager for scraping Cloudflare-protected sites
// Singleton pattern — reuses browser instance across requests

import type { Browser } from "playwright";

let browserInstance: Browser | null = null;
let launching = false;

async function getBrowser(): Promise<Browser> {
  if (browserInstance?.isConnected()) return browserInstance;

  // Prevent concurrent launches
  if (launching) {
    await new Promise((r) => setTimeout(r, 2000));
    if (browserInstance?.isConnected()) return browserInstance;
  }

  launching = true;
  try {
    const { chromium } = await import("playwright");
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    return browserInstance;
  } finally {
    launching = false;
  }
}

export async function fetchWithBrowser(url: string, waitMs = 8000): Promise<string | null> {
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    console.error("Browser launch failed:", err);
    return null;
  }

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(waitMs);

    const html = await page.content();

    // Still on Cloudflare challenge?
    if (html.includes("Just a moment") && html.length < 10000) {
      // Wait a bit more
      await page.waitForTimeout(5000);
      const html2 = await page.content();
      if (html2.includes("Just a moment") && html2.length < 10000) {
        return null; // Truly blocked
      }
      return html2;
    }

    return html;
  } catch (err) {
    console.error("Browser fetch error:", err);
    return null;
  } finally {
    await context.close();
  }
}

// Graceful shutdown
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
