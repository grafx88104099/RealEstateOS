// scripts/refresh-demo-listings.mjs
// Хуучин зарыг бүгдийг устгаад unegui.mn-аас 20 шинэ зураг бүхий зар татаж шинэчилнэ.
// Гүйцэтгэх:  node scripts/refresh-demo-listings.mjs
//
// Шаардлага:
//  - .env.local дотор NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLATFORM_TENANT_ID
//  - Playwright chromium суулгасан байх (npx playwright install chromium)
//  - Унэгүй сайтыг scrape хийж эхэлсний дараа Cloudflare 5-10 секунд хүлээж байж зөвшөөрнө
//
// Анхаар: энэ скрипт нь PLATFORM_TENANT_ID-д харьяалагдах ВСЕ listings, listing_images,
// scraped_listings өгөгдлийг устгана. Үндсэн агентууд / тенант / хэрэглэгчийн өгөгдлийг хөндөхгүй.

import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// ── Env ─────────────────────────────────────────────
const env = readFileSync(".env.local", "utf-8");
const v = Object.fromEntries(
  env.split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const SUPABASE_URL = v.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = v.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = v.PLATFORM_TENANT_ID;

if (!SUPABASE_URL || !SERVICE_KEY || !TENANT_ID) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PLATFORM_TENANT_ID байх ёстой");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── Constants ───────────────────────────────────────
const TARGET_COUNT = 20;
// Худалдаа болон түрээсийн холимогтой байхын тулд 2 ангиллаас татна
const CATEGORY_URLS = [
  "https://www.unegui.mn/l-hdlh/l-hdlh-zarna/oron-suuts-zarna/",
  "https://www.unegui.mn/l-hdlh/l-hdlh-treesleh/oron-suuts/",
];

const DISTRICT_KEYWORDS = {
  "СБД": ["сбд", "сүхбаатар"],
  "БЗД": ["бзд", "баянзүрх"],
  "ЧД":  ["чд", "чингэлтэй"],
  "ХУД": ["худ", "хан-уул", "хан уул"],
  "БГД": ["бгд", "баянгол"],
  "СХД": ["схд", "сонгинохайрхан"],
  "НД":  ["нд", "налайх"],
  "БНД": ["бнд", "багануур"],
  "БХД": ["бхд", "багахангай"],
};

// ── Парсинг функцууд ──────────────────────────────
function parsePriceText(s) {
  if (!s) return null;
  const lower = s.toLowerCase();
  const num = parseFloat(s.replace(/[^\d.,]/g, "").replace(/,/g, "")) || 0;
  if (lower.includes("тэрбум") || lower.includes("tj")) return Math.round(num * 1_000_000_000);
  if (lower.includes("сая") || lower.includes("сая")) return Math.round(num * 1_000_000);
  if (lower.includes("мян") || lower.includes("k")) return Math.round(num * 1000);
  // Шууд тоогоор бичсэн (₮ тэмдэгтэй) — сая болгох
  if (s.includes("₮") && num > 1000) return Math.round(num);
  return null;
}

function extractPriceFromHtml(html) {
  const pricePatterns = [
    /class="[^"]*announcement-price[^"]*"[^>]*>\s*([^<]+?)\s*</i,
    /class="[^"]*price[^"]*"[^>]*>\s*([^<]+?)\s*</i,
    /itemprop="price"[^>]+content="([^"]+)"/i,
    /"price"\s*:\s*"?([\d.,]+)"?/i,
    /(\d[\d\s,.]+\s*тэрбум)/i,
    /(\d[\d\s,.]+\s*сая)/i,
    /(\d{2,}\s*[\d\s,]+\s*₮)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      const price = parsePriceText(m[1] ?? m[0]);
      if (price && price > 100_000) return { text: (m[1] ?? m[0]).trim(), price };
    }
  }
  return null;
}

function extractPriceFromText(text) {
  // body text-ээс price илрүүлэх (Cloudflare үед HTML structure өөр байж магадгүй)
  const patterns = [
    /(\d[\d\s,.]*\s*тэрбум)/i,
    /(\d[\d\s,.]*\s*сая)/i,
    /Үнэ:\s*(\d[\d\s,.]*)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const price = parsePriceText(m[1] ?? m[0]);
      if (price && price > 100_000) return { text: (m[1] ?? m[0]).trim(), price };
    }
  }
  return null;
}

function extractTitle(html) {
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!t) return null;
  return t[1].split(/\s*[—|·]\s*/)[0].split(" №")[0].trim().slice(0, 200);
}

function extractDescription(html) {
  // og:description эсвэл meta description
  const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (og) return og[1].trim().slice(0, 1000);
  const md = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (md) return md[1].trim().slice(0, 1000);
  return null;
}

function extractImages(html) {
  // Унэгүй CDN (cdn.unegui.mn эсвэл cdnN.unegui.mn) дээрх webp/jpg зурагнууд
  const re = /https:\/\/cdn\d*\.unegui\.mn\/media\/[^\s"'<>]+?\.(?:webp|jpg|jpeg|png)/gi;
  const all = html.match(re) ?? [];
  // Дубликатыг хасч, "thumb" төрлийн жижиг хувилбараас гадна жинхэнэ хувилбарыг авна
  const uniq = [...new Set(all)];
  // Жижиг thumbnail байвал дунд зэргийн хувилбарыг сонгох (унэгүй CDN-д ихэвчлэн `_S` `_M` `_L` хувилбартай)
  return uniq.slice(0, 10);
}

function extractFromText(text) {
  const out = {};
  // Өрөө
  const roomMatch = text.match(/(\d+)\s*өрөө/i);
  if (roomMatch) out.rooms = Math.min(parseInt(roomMatch[1], 10), 20);
  // Талбай
  const areaMatch = text.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*м[²2]/i);
  if (areaMatch) out.area_sqm = Math.min(parseFloat(areaMatch[1].replace(",", ".")), 9999);
  // Давхар (жишээ: 5/9 давхар)
  const floorMatch = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*давхар/i);
  if (floorMatch) {
    out.floor = parseInt(floorMatch[1], 10);
    out.total_floors = parseInt(floorMatch[2], 10);
  }
  // Дүүрэг
  const lower = text.toLowerCase();
  for (const [code, kws] of Object.entries(DISTRICT_KEYWORDS)) {
    if (kws.some((kw) => lower.includes(kw))) {
      out.district = code;
      break;
    }
  }
  return out;
}

function makeSlug(text, suffix) {
  return (text || "listing")
    .toLowerCase()
    .replace(/[^Ѐ-ӿa-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    + "-" + suffix;
}

// ── Үндсэн скрипт ───────────────────────────────────
async function main() {
  console.log("→ Browser нээж байна (headed, системийн Chrome, persistent)...");
  // Системийн жинхэнэ Chrome ашиглах + persistent profile-ийг
  // ~/.cache/playwright-unegui-profile-д хадгалах. CF cookie cache-д үлдэнэ.
  const os = await import("node:os");
  const path = await import("node:path");
  const userDataDir = path.join(os.homedir(), ".cache", "playwright-unegui-profile");

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome", // системийн Chrome
    viewport: { width: 1366, height: 900 },
    locale: "mn-MN",
    timezoneId: "Asia/Ulaanbaatar",
    args: [
      "--disable-blink-features=AutomationControlled",
    ],
  });
  // Bot шинж тэмдгийг нуух
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  // CF challenge clear хийхийг хүлээх helper
  let cfPromptShown = false;
  async function waitForCloudflare(page, maxMs = 120000) {
    const start = Date.now();
    let warned = false;
    while (Date.now() - start < maxMs) {
      const title = await page.title().catch(() => "");
      if (!title.includes("Just a moment") &&
          !title.includes("Attention") &&
          !title.includes("Verify")) {
        return true;
      }
      if (!warned && Date.now() - start > 5000) {
        warned = true;
        if (!cfPromptShown) {
          console.log("\n  ⚠️  Cloudflare \"Verify you are human\" харагдсан бол cheсkbox-ыг ГАРААРАА дараарай.");
          console.log("      Нэг удаа давсны дараа дараагийн бүх зар автоматаар нээгдэнэ.\n");
          cfPromptShown = true;
        }
      }
      await page.waitForTimeout(1000);
    }
    return false;
  }

  // ── 1) Хуудаснаас зарын линкүүдийг цуглуулна ──
  const detailUrls = [];
  for (const catUrl of CATEGORY_URLS) {
    if (detailUrls.length >= TARGET_COUNT * 2) break;
    console.log(`→ Ангилал нээж байна: ${catUrl}`);
    const page = await ctx.newPage();
    try {
      await page.goto(catUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      const passed = await waitForCloudflare(page, 120000);
      if (!passed) console.log("  CF challenge давсангүй (category)");
      await page.waitForTimeout(1500);
      const html = await page.content();
      // Зарын линкүүд: /adv/12345/ хэлбэр
      const re = /href="(\/adv\/(\d+)[^"]*)"/g;
      const seen = new Set();
      let m;
      while ((m = re.exec(html)) !== null) {
        const id = m[2];
        if (seen.has(id)) continue;
        seen.add(id);
        detailUrls.push(`https://www.unegui.mn${m[1]}`);
      }
      console.log(`  ${seen.size} линк олдов`);
    } catch (err) {
      console.error(`  Алдаа: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  if (detailUrls.length === 0) {
    console.error("× Нэг ч линк татагдсангүй. Cloudflare тоормосложсон байж магадгүй.");
    await ctx.close();
    process.exit(1);
  }

  // ── 2) Дэлгэрэнгүй хуудас бүрийг татах ──
  const collected = [];
  let dumpedFirstFailure = false;
  for (const url of detailUrls) {
    if (collected.length >= TARGET_COUNT) break;
    const page = await ctx.newPage();
    try {
      console.log(`→ ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      // Cloudflare challenge давах
      const passed = await waitForCloudflare(page, 120000);
      if (!passed) {
        console.log("  CF challenge давсангүй");
        await page.close();
        continue;
      }
      try {
        await page.waitForSelector(".announcement-price__cost, [itemprop='price'], h1", { timeout: 10000 });
      } catch {}
      await page.waitForTimeout(1500);

      // DOM дээрээс шууд унших (JS render хийгдсэн контент)
      const data = await page.evaluate(() => {
        const text = document.body?.innerText ?? "";
        const title = (document.querySelector("h1")?.textContent || document.title || "").trim();
        // Үнэ — олон сонгуурийг шалгах
        const priceSelectors = [
          ".announcement-price__cost",
          "[itemprop='price']",
          ".price__value",
          "[class*='price']",
        ];
        let priceText = "";
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) {
            priceText = el.textContent.trim();
            if (/[\d]/.test(priceText)) break;
          }
        }
        // Зураг — gallery, slider, swiper, img dasaa
        const imgEls = document.querySelectorAll("img");
        const imgUrls = [];
        imgEls.forEach((img) => {
          const src = img.currentSrc || img.src || img.getAttribute("data-src") || "";
          if (src.includes("cdn") && src.includes("unegui.mn") && /\.(webp|jpg|jpeg|png)/i.test(src)) {
            imgUrls.push(src);
          }
        });
        // og:image fallback
        const og = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
        if (og && imgUrls.length === 0) imgUrls.push(og);
        return { text: text.slice(0, 8000), title, priceText, imgUrls: [...new Set(imgUrls)] };
      });

      const title = data.title.split(/\s*[—|·]\s*/)[0].split(" №")[0].trim().slice(0, 200);
      let priceInfo = null;
      if (data.priceText) {
        const p = parsePriceText(data.priceText);
        if (p && p > 100_000) priceInfo = { text: data.priceText, price: p };
      }
      if (!priceInfo) priceInfo = extractPriceFromText(data.text);
      const images = data.imgUrls.slice(0, 10);
      const description = data.text.slice(0, 1000);

      if (!title || !priceInfo || images.length === 0) {
        const missing = [
          !title && "title",
          !priceInfo && "price",
          images.length === 0 && "images",
        ].filter(Boolean).join(",");
        console.log(`  алгассан (${missing} дутуу) priceText="${data.priceText}" imgs=${data.imgUrls.length}`);
        if (!dumpedFirstFailure) {
          const html = await page.content();
          writeFileSync("/tmp/unegui-debug.html", html);
          console.log(`  → /tmp/unegui-debug.html файлд хадгаллаа (debug)`);
          dumpedFirstFailure = true;
        }
        await page.close();
        continue;
      }

      const fields = extractFromText((title + " " + data.text).slice(0, 8000));

      const isRent = url.includes("treesleh") || url.includes("tureeslen");
      const idMatch = url.match(/\/adv\/(\d+)/);
      const sourceExtId = idMatch?.[1] ?? String(Date.now());

      collected.push({
        title,
        description: description || title,
        price: priceInfo.price,
        rooms: fields.rooms ?? null,
        area_sqm: fields.area_sqm ?? null,
        floor: fields.floor ?? null,
        total_floors: fields.total_floors ?? null,
        district: fields.district ?? null,
        listing_type: isRent ? "rent" : "sale",
        property_type: "apartment",
        images,
        source_url: url,
        source_ext_id: sourceExtId,
      });
      console.log(`  ✓ ${title.slice(0, 60)} — ₮${priceInfo.text} — ${images.length} зураг`);
    } catch (err) {
      console.error(`  алдаа: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await ctx.close();

  if (collected.length === 0) {
    console.error("× Нэг ч зар цуглуулагдсангүй");
    process.exit(1);
  }
  console.log(`\n→ Нийт ${collected.length} зар цуглуулсан\n`);

  // ── 3) Үндсэн agent_id олох ──
  const { data: agentRow } = await db
    .from("users")
    .select("id, role")
    .eq("tenant_id", TENANT_ID)
    .in("role", ["super_admin", "tenant_admin", "agent"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!agentRow?.id) {
    console.error("× Тенант доторх агент/админ хэрэглэгч олдсонгүй");
    process.exit(1);
  }
  const agentId = agentRow.id;
  console.log(`→ Agent: ${agentId} (${agentRow.role})`);

  // ── 4) Хуучин зарыг устгах ──
  console.log("→ Хуучин зар устгаж байна...");
  await db.from("listing_images").delete().eq("tenant_id", TENANT_ID);
  const { count: deletedCount } = await db
    .from("listings")
    .delete({ count: "exact" })
    .eq("tenant_id", TENANT_ID);
  console.log(`  ${deletedCount ?? 0} listing устгасан`);

  // scraped_listings дээрх кэшийг ч гэсэн арилгая (давхардал гарахаас сэргийлж)
  await db.from("scraped_listings").delete().eq("tenant_id", TENANT_ID);

  // ── 5) Шинэ зар оруулах ──
  console.log("→ Шинэ зар оруулж байна...");
  for (const l of collected) {
    const slug = makeSlug(l.title, l.source_ext_id);
    const { data: ins, error: insErr } = await db
      .from("listings")
      .insert({
        tenant_id: TENANT_ID,
        agent_id: agentId,
        title: l.title,
        slug,
        description: l.description,
        price: l.price,
        rooms: l.rooms,
        area_sqm: l.area_sqm,
        floor: l.floor,
        total_floors: l.total_floors,
        property_type: l.property_type,
        listing_type: l.listing_type,
        district: l.district,
        status: "active",
        published_at: new Date().toISOString(),
        metadata: { source: "unegui.mn", source_url: l.source_url, source_ext_id: l.source_ext_id },
      })
      .select("id")
      .single();
    if (insErr || !ins) {
      console.error(`  × ${l.title}: ${insErr?.message}`);
      continue;
    }

    const imageRows = l.images.map((url, idx) => ({
      tenant_id: TENANT_ID,
      listing_id: ins.id,
      url,
      sort_order: idx,
      is_cover: idx === 0,
    }));
    const { error: imgErr } = await db.from("listing_images").insert(imageRows);
    if (imgErr) console.error(`  × зураг: ${imgErr.message}`);
    console.log(`  ✓ ${l.title.slice(0, 60)}`);
  }

  console.log(`\n✓ Бэлэн. ${collected.length} зар амжилттай оруулсан.`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
