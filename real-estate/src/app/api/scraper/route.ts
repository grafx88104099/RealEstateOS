// GET  /api/scraper — list scraped listings
// POST /api/scraper — scrape a URL or trigger text parse

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseUneguiDetailHTML, extractFieldsFromText } from "@/lib/scraper/unegui";
import { parseListingWithAI } from "@/lib/scraper/ai-parser";
import { fetchWithBrowser } from "@/lib/scraper/browser";

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  try {
    let query = supabaseAdmin
      .from("scraped_listings")
      .select("*")
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ listings: data ?? [] });
  } catch (err) {
    console.error("Scraper GET error:", err);
    return NextResponse.json({ listings: [] });
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: { action: string; url?: string; raw_text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "parse_url" && body.url) {
    return await handleParseUrl(body.url, auth.tenantId);
  }

  if (body.action === "parse_text" && body.raw_text) {
    return await handleParseText(body.raw_text, auth.tenantId);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ─── Parse URL (Playwright for Cloudflare bypass) ───────────
async function handleParseUrl(url: string, tenantId: string) {
  try {
    // Use Playwright headless browser to bypass Cloudflare
    const html = await fetchWithBrowser(url, 10000);

    if (!html) {
      return NextResponse.json({
        error: "Хуудсыг ачаалах боломжгүй байна. Дахин оролдоно уу.",
      }, { status: 422 });
    }

    if (url.includes("unegui.mn")) {
      const raw = parseUneguiDetailHTML(html, url);
      if (!raw) {
        return NextResponse.json({ error: "Зарын мэдээлэл задлах боломжгүй" }, { status: 422 });
      }

      return await saveScrapedListing(raw.raw_text, tenantId, {
        source_url: url,
        source_ext_id: raw.source_ext_id,
        source_site: "unegui.mn",
        images: raw.images,
        title_hint: raw.title,
      });
    }

    // Generic site — extract body text and parse with AI
    const bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (bodyText.length < 50) {
      return NextResponse.json({ error: "Хуудаснаас текст олдсонгүй" }, { status: 422 });
    }

    return await saveScrapedListing(bodyText.slice(0, 5000), tenantId, {
      source_url: url,
      source_ext_id: null,
      source_site: new URL(url).hostname,
      images: [],
      title_hint: null,
    });
  } catch (err) {
    console.error("Parse URL error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── Parse Text ─────────────────────────────────────────────
async function handleParseText(rawText: string, tenantId: string) {
  return await saveScrapedListing(rawText, tenantId, {
    source_url: "manual_input",
    source_ext_id: null,
    source_site: "manual",
    images: [],
    title_hint: null,
  });
}

// ─── Shared save logic ──────────────────────────────────────
async function saveScrapedListing(
  rawText: string,
  tenantId: string,
  meta: {
    source_url: string;
    source_ext_id: string | null;
    source_site: string;
    images: string[];
    title_hint: string | null;
  }
) {
  // AI parse
  let aiParsed = null;
  try {
    aiParsed = await parseListingWithAI(rawText);
  } catch (err) {
    console.error("AI parse error:", err);
  }

  const regexFields = extractFieldsFromText(rawText);

  const title = aiParsed?.title || meta.title_hint || (regexFields.rooms ? `${regexFields.rooms} өрөө орон сууц` : "Шинэ зар");
  const description = aiParsed?.description || "";
  const price = aiParsed?.price ?? (regexFields.price as number | undefined) ?? null;
  const rooms = aiParsed?.rooms ?? (regexFields.rooms as number | undefined) ?? null;
  const area_sqm = aiParsed?.area_sqm ?? (regexFields.area_sqm as number | undefined) ?? null;
  const floor = aiParsed?.floor ?? (regexFields.floor as number | undefined) ?? null;
  const total_floors = aiParsed?.total_floors ?? (regexFields.total_floors as number | undefined) ?? null;
  const district = aiParsed?.district ?? (regexFields.district as string | undefined) ?? null;
  const address = aiParsed?.address ?? null;
  const property_type = aiParsed?.property_type ?? (regexFields.property_type as string | undefined) ?? "apartment";
  const listing_type = aiParsed?.listing_type ?? (regexFields.listing_type as string | undefined) ?? "sale";
  const contact_phone = aiParsed?.contact_phone ?? null;
  const confidence = Math.min(aiParsed?.confidence ?? 0.5, 0.99);

  try {
    const insertData = {
      tenant_id: tenantId,
      source_url: meta.source_url,
      source_ext_id: meta.source_ext_id,
      source_site: meta.source_site,
      title,
      description,
      price,
      rooms: rooms ? Number(rooms) : null,
      area_sqm,
      floor: floor ? Number(floor) : null,
      total_floors: total_floors ? Number(total_floors) : null,
      district,
      address,
      property_type,
      listing_type,
      contact_phone,
      images: meta.images,
      raw_text: rawText.slice(0, 5000),
      parsed_data: JSON.parse(JSON.stringify({ ai: aiParsed, regex: regexFields })),
      ai_confidence: confidence,
      ai_parsed_at: new Date().toISOString(),
      status: "pending_review",
      last_seen_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabaseAdmin
      .from("scraped_listings")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({
        error: error.message,
        parsed: { title, price, rooms, area_sqm, district, property_type },
      }, { status: 500 });
    }

    return NextResponse.json({ listing: saved, parsed: { title, price, rooms, area_sqm, district } });
  } catch (err) {
    console.error("Save error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
