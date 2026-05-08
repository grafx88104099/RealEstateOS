// scraper-worker/worker.mjs
//
// Render Docker worker. Drains scrape jobs sent by Upstash QStash (or any HTTP
// scheduler). Runs Playwright with a warm browser singleton. After scraping +
// AI parsing, inserts rows into scraped_listings, then notifies the Next.js
// /api/scraper/ingest endpoint with the new IDs so Vercel can run the
// dedup/spam/image/listing-insert pipeline.

import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const PORT = parseInt(process.env.PORT ?? "7777", 10);
const HMAC_SECRET = process.env.SCRAPER_WORKER_HMAC_SECRET ?? "";
const INGEST_URL = process.env.INGEST_CALLBACK_URL ?? "";
const INGEST_TOKEN = process.env.INGEST_CALLBACK_TOKEN ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Browser singleton ─────────────────────────────────────────
let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    });
  }
  return browserPromise;
}

async function fetchHtml(url, waitMs = 5000) {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    userAgent:
      "RealEstateOS-Bot/1.0 (+contact@realestateos.example) PlaywrightWorker",
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(waitMs);
    const html = await page.content();
    if (html.includes("Just a moment") && html.length < 10_000) {
      await page.waitForTimeout(5000);
      return await page.content();
    }
    return html;
  } finally {
    await page.close().catch(() => undefined);
    await ctx.close().catch(() => undefined);
  }
}

// ── unegui.mn parser ──────────────────────────────────────────
function extractListingLinks(html) {
  const re = /href="(\/adv\/(\d+)[^"]*?)"/gi;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    if (seen.has(m[2])) continue;
    seen.add(m[2]);
    out.push({ url: `https://www.unegui.mn${m[1]}`, extId: m[2] });
  }
  return out;
}

function parseDetailHtml(html, url) {
  const idMatch = url.match(/\/adv\/(\d+)/);
  if (!idMatch) return null;
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = (t?.[1] ?? "").split(" №")[0].split(" in ")[0].trim();
  const priceMatch =
    html.match(/(\d[\d\s,.]+)\s*₮/) ||
    html.match(/(\d[\d\s,.]+)\s*сая/i) ||
    html.match(/(\d[\d\s,.]+)\s*тэрбум/i);
  const imgRe =
    /https:\/\/cdn\d*\.unegui\.mn\/media\/[^"'\s]+\.(?:webp|jpg|jpeg|png)/gi;
  const images = [...new Set(html.match(imgRe) ?? [])].slice(0, 20);
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html;
  const rawText = body
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
  if (!title && !priceMatch) return null;
  return {
    source_ext_id: idMatch[1],
    source_url: url,
    title,
    raw_text: rawText,
    images,
  };
}

function regexFields(rawText) {
  const f = {};
  const p1 = rawText.match(/(\d[\d\s,.]*)\s*сая\s*₮?/i);
  if (p1) f.price = Math.round(parseFloat(p1[1].replace(/[\s,]/g, "")) * 1e6);
  const p2 = rawText.match(/(\d[\d\s,.]*)\s*тэрбум/i);
  if (p2) f.price = Math.round(parseFloat(p2[1].replace(/[\s,]/g, "")) * 1e9);
  const a = rawText.match(/Талбай:\s*([\d.]+)\s*м²/i) || rawText.match(/([\d.]+)\s*м²/i);
  if (a) f.area_sqm = parseFloat(a[1]);
  const fl = rawText.match(/Хэдэн давхарт:\s*(\d+)/i);
  if (fl) f.floor = parseInt(fl[1]);
  const tf = rawText.match(/Барилгын давхар:\s*(\d+)/i);
  if (tf) f.total_floors = parseInt(tf[1]);
  const r = rawText.match(/(\d+)\s*өрөө/i);
  if (r) f.rooms = parseInt(r[1]);
  const districts = {
    Баянзүрх: "БЗД", Баянгол: "БГД", Сүхбаатар: "СБД",
    Чингэлтэй: "ЧД", "Хан-Уул": "ХУД", Сонгинохайрхан: "СХД",
    Налайх: "НД", Багахангай: "БХД", Багануур: "БНД",
  };
  for (const k of Object.keys(districts)) {
    if (rawText.includes(k)) { f.district = districts[k]; break; }
  }
  if (rawText.match(/Орон сууц|өрөө байр/)) f.property_type = "apartment";
  else if (rawText.match(/Байшин|хашаа/)) f.property_type = "house";
  else if (rawText.includes("Газар")) f.property_type = "land";
  else if (rawText.match(/Оффис|офис/)) f.property_type = "office";
  if (rawText.match(/түрээс/)) f.listing_type = "rent";
  else f.listing_type = "sale";
  return f;
}

// ── AI parser (gpt-4o-mini) ───────────────────────────────────
async function aiParse(rawText) {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "Та Монгол хэлний үл хөдлөх хөрөнгийн зарын текстийг JSON болгож задална. Бүх дутуу талбарыг null болгоно. Талбарууд: title, description, price (төгрөгөөр, 185 сая=185000000), rooms, area_sqm, floor, total_floors, district (БЗД|БГД|СБД|ЧД|ХУД|СХД|НД|БХД|БНД), address, property_type (apartment|house|land|commercial|office), listing_type (sale|rent), contact_phone, confidence (0-1).",
          },
          { role: "user", content: rawText.slice(0, 3000) },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return {
      ...JSON.parse(content),
      tokens: {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      },
    };
  } catch {
    return null;
  }
}

// ── Run scrape job (async, non-blocking) ───────────────────────
async function runJob(payload) {
  const { run_id, source_id, tenant_id } = payload;
  const startedAt = new Date().toISOString();

  const categories = [
    { path: "/l-hdlh/l-hdlh-zarna/oron-suuts/", listing_type: "sale" },
    { path: "/l-hdlh/l-hdlh-zarna/baishin-haashaa/", listing_type: "sale" },
    { path: "/l-hdlh/l-hdlh-treesllne/oron-suuts/", listing_type: "rent" },
  ];

  let pagesScraped = 0;
  let listingsFound = 0;
  let listingsNew = 0;
  const newScrapedIds = [];
  const errors = [];
  let parserInputTokens = 0;
  let parserOutputTokens = 0;

  const { data: existing } = await supabase
    .from("scraped_listings")
    .select("source_ext_id")
    .eq("source_site", "unegui.mn");
  const existingIds = new Set((existing ?? []).map((r) => r.source_ext_id));

  for (const cat of categories) {
    try {
      const html = await fetchHtml(`https://www.unegui.mn${cat.path}`, 6000);
      if (!html) {
        errors.push(`fetch_failed:${cat.path}`);
        continue;
      }
      pagesScraped++;
      const links = extractListingLinks(html).slice(0, 20);
      listingsFound += links.length;

      for (const link of links) {
        if (existingIds.has(link.extId)) continue;
        try {
          const detailHtml = await fetchHtml(link.url, 3000);
          if (!detailHtml) continue;
          const raw = parseDetailHtml(detailHtml, link.url);
          if (!raw) continue;

          const ai = await aiParse(raw.raw_text);
          if (ai?.tokens) {
            parserInputTokens += ai.tokens.input;
            parserOutputTokens += ai.tokens.output;
          }
          const rx = regexFields(raw.raw_text);

          const merged = {
            tenant_id,
            source_url: link.url,
            source_ext_id: link.extId,
            source_site: "unegui.mn",
            title: ai?.title || raw.title,
            description: ai?.description || "",
            price: ai?.price ?? rx.price ?? null,
            rooms: ai?.rooms ?? rx.rooms ?? null,
            area_sqm: ai?.area_sqm ?? rx.area_sqm ?? null,
            floor: ai?.floor ?? rx.floor ?? null,
            total_floors: ai?.total_floors ?? rx.total_floors ?? null,
            district: ai?.district ?? rx.district ?? null,
            address: ai?.address ?? null,
            property_type:
              ai?.property_type ?? rx.property_type ?? "apartment",
            listing_type: ai?.listing_type ?? cat.listing_type,
            contact_phone: ai?.contact_phone ?? null,
            images: raw.images,
            raw_text: raw.raw_text,
            parsed_data: { ai, regex: rx },
            ai_confidence: ai?.confidence ?? 0.5,
            ai_parsed_at: ai ? new Date().toISOString() : null,
            status: "pending_review",
            last_seen_at: new Date().toISOString(),
          };

          const { data: inserted, error: insErr } = await supabase
            .from("scraped_listings")
            .upsert(merged, { onConflict: "source_site,source_ext_id" })
            .select("id")
            .single();
          if (insErr) {
            console.error(`[insert error] ${link.extId}:`, insErr.message, insErr.code);
            errors.push(`insert:${insErr.code ?? "x"}:${(insErr.message ?? "").slice(0, 60)}`);
            continue;
          }
          if (inserted?.id) newScrapedIds.push(inserted.id);
          listingsNew++;
          existingIds.add(link.extId);
        } catch (err) {
          errors.push(`listing:${String(err).slice(0, 80)}`);
        }
        await sleep(2000 + Math.random() * 2000);
      }
    } catch (err) {
      errors.push(`category:${String(err).slice(0, 80)}`);
    }
    await sleep(2500);
  }

  const finishedAt = new Date().toISOString();
  const usdCents =
    (parserInputTokens / 1_000_000) * 0.15 * 100 +
    (parserOutputTokens / 1_000_000) * 0.6 * 100;

  await supabase
    .from("scraper_runs")
    .update({
      status: errors.length > 0 && listingsNew === 0 ? "failed" : "completed",
      pages_scraped: pagesScraped,
      listings_found: listingsFound,
      listings_new: listingsNew,
      errors: errors.slice(0, 20),
      finished_at: finishedAt,
      token_usage: {
        parser_input_tokens: parserInputTokens,
        parser_output_tokens: parserOutputTokens,
        total_usd_cents: usdCents,
      },
    })
    .eq("id", run_id);

  await supabase
    .from("scraper_sources")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", source_id);

  // Notify Vercel ingest endpoint to run dedup/spam/image/listings INSERT
  if (INGEST_URL && newScrapedIds.length > 0) {
    try {
      await fetch(INGEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Token": INGEST_TOKEN,
        },
        body: JSON.stringify({
          run_id,
          source_id,
          scraped_ids: newScrapedIds,
        }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      console.warn("ingest callback failed:", err);
    }
  }

  console.log(
    `[run ${run_id}] pages=${pagesScraped} found=${listingsFound} new=${listingsNew} usd=${(usdCents / 100).toFixed(4)}`,
  );

  return {
    run_id,
    pages_scraped: pagesScraped,
    listings_found: listingsFound,
    listings_new: listingsNew,
    errors: errors.length,
    started_at: startedAt,
    finished_at: finishedAt,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function verifyHmac(rawBody, header) {
  if (!HMAC_SECRET) return true; // dev: allow when not configured
  if (!header) return false;
  const expected = crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(header),
    );
  } catch {
    return false;
  }
}

// ── HTTP server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
    return;
  }
  if (req.method !== "POST" || !req.url.startsWith("/run")) {
    res.writeHead(404).end("not found");
    return;
  }

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");

  if (!verifyHmac(raw, req.headers["x-signature"])) {
    res.writeHead(401, { "Content-Type": "text/plain" }).end("bad signature");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    res.writeHead(400).end("bad json");
    return;
  }

  if (!payload.run_id || !payload.source_id || !payload.tenant_id) {
    res
      .writeHead(400, { "Content-Type": "application/json" })
      .end(JSON.stringify({ error: "run_id, source_id, tenant_id required" }));
    return;
  }

  // Fire-and-forget so QStash gets a quick 202 ack.
  res
    .writeHead(202, { "Content-Type": "application/json" })
    .end(JSON.stringify({ accepted: true, run_id: payload.run_id }));

  runJob(payload).catch((err) => console.error("job failed:", err));
});

server.listen(PORT, () => {
  console.log(`[scraper-worker] listening on :${PORT}`);
});
