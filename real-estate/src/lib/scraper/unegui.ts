// lib/scraper/unegui.ts
// Scraper for unegui.mn real estate listings
// Uses fetch + HTML parsing (Cloudflare requires special handling in production)

export interface ScrapedRawListing {
  source_ext_id: string;
  source_url: string;
  title: string;
  price_text: string;
  raw_text: string;
  images: string[];
  scraped_at: string;
}

// ─── Parse listing detail page HTML ─────────────────────────────
export function parseUneguiDetailHTML(html: string, url: string): ScrapedRawListing | null {
  // Extract listing ID from URL
  const idMatch = url.match(/\/adv\/(\d+)/);
  if (!idMatch) return null;
  const sourceExtId = idMatch[1];

  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const fullTitle = titleMatch?.[1] ?? "";
  const title = fullTitle.split(" №")[0].split(" in ")[0].trim();

  // Extract price
  const pricePatterns = [
    /(\d[\d\s,.]+)\s*₮/,
    /(\d[\d\s,.]+)\s*сая/i,
    /(\d[\d\s,.]+)\s*тэрбум/i,
  ];
  let priceText = "";
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) { priceText = m[0].trim(); break; }
  }

  // Extract images from CDN
  const imageRegex = /https:\/\/cdn\d*\.unegui\.mn\/media\/[^"'\s]+\.(?:webp|jpg|jpeg|png)/gi;
  const imagesRaw = html.match(imageRegex) ?? [];
  const images = [...new Set(imagesRaw)].slice(0, 20);

  // Extract body text (strip HTML tags)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch?.[1] ?? html;
  const rawText = bodyHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);

  if (!title && !priceText) return null;

  return {
    source_ext_id: sourceExtId,
    source_url: url,
    title,
    price_text: priceText,
    raw_text: rawText,
    images,
    scraped_at: new Date().toISOString(),
  };
}

// ─── Extract listing links from main page HTML ─────────────────
export function extractListingLinks(html: string): { url: string; extId: string }[] {
  const linkRegex = /href="(\/adv\/(\d+)[^"]*?)"/gi;
  const links: { url: string; extId: string }[] = [];
  const seen = new Set<string>();
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const extId = match[2];
    if (!seen.has(extId)) {
      seen.add(extId);
      links.push({
        url: `https://www.unegui.mn${match[1]}`,
        extId,
      });
    }
  }

  return links;
}

// ─── Parse structured fields from raw text using regex ──────────
// (Fallback when AI is not available)
export function extractFieldsFromText(rawText: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // Price
  const priceMatch = rawText.match(/(\d[\d\s,.]*)\s*сая\s*₮/i);
  if (priceMatch) {
    fields.price = Math.round(parseFloat(priceMatch[1].replace(/[\s,]/g, "")) * 1_000_000);
  }
  const priceTerbumMatch = rawText.match(/(\d[\d\s,.]*)\s*тэрбум/i);
  if (priceTerbumMatch) {
    fields.price = Math.round(parseFloat(priceTerbumMatch[1].replace(/[\s,]/g, "")) * 1_000_000_000);
  }

  // Area
  const areaMatch = rawText.match(/Талбай:\s*([\d.]+)\s*м²/i) || rawText.match(/([\d.]+)\s*м²/i) || rawText.match(/([\d.]+)\s*мкв/i);
  if (areaMatch) fields.area_sqm = parseFloat(areaMatch[1]);

  // Floor
  const floorMatch = rawText.match(/Хэдэн давхарт:\s*(\d+)/i) || rawText.match(/(\d+)\s*давхарт/i);
  if (floorMatch) fields.floor = parseInt(floorMatch[1]);

  const totalFloorMatch = rawText.match(/Барилгын давхар:\s*(\d+)/i);
  if (totalFloorMatch) fields.total_floors = parseInt(totalFloorMatch[1]);

  // Rooms
  const roomMatch = rawText.match(/(\d+)\s*өрөө/i);
  if (roomMatch) fields.rooms = parseInt(roomMatch[1]);

  // District
  const districts = ["Баянзүрх", "Баянгол", "Сүхбаатар", "Чингэлтэй", "Хан-Уул", "Сонгинохайрхан", "Налайх", "Багахангай", "Багануур"];
  const districtMap: Record<string, string> = {
    "Баянзүрх": "БЗД", "Баянгол": "БГД", "Сүхбаатар": "СБД",
    "Чингэлтэй": "ЧД", "Хан-Уул": "ХУД", "Сонгинохайрхан": "СХД",
    "Налайх": "НД", "Багахангай": "БХД", "Багануур": "БНД",
  };
  for (const d of districts) {
    if (rawText.includes(d)) {
      fields.district = districtMap[d] ?? d;
      break;
    }
  }

  // Property type
  if (rawText.includes("Орон сууц") || rawText.includes("өрөө байр")) fields.property_type = "apartment";
  else if (rawText.includes("Байшин") || rawText.includes("хашаа")) fields.property_type = "house";
  else if (rawText.includes("Газар")) fields.property_type = "land";
  else if (rawText.includes("Оффис") || rawText.includes("офис")) fields.property_type = "office";
  else if (rawText.includes("Худалдаа")) fields.property_type = "commercial";

  // Listing type
  if (rawText.includes("түрээс") || rawText.includes("түрээслүүлнэ")) fields.listing_type = "rent";
  else fields.listing_type = "sale";

  return fields;
}
