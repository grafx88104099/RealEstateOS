// POST /api/ai/market-analysis
// AI-powered market analysis based on tenant's listing data

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const tenantId = auth.tenantId;

  // Gather market data
  const [activeListings, soldListings, allInquiries] = await Promise.all([
    supabaseAdmin.from("listings")
      .select("id, price, rooms, area_sqm, district, property_type, listing_type, created_at")
      .eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null),
    supabaseAdmin.from("listings")
      .select("id, price, rooms, area_sqm, district, property_type, created_at")
      .eq("tenant_id", tenantId).eq("status", "sold").is("deleted_at", null),
    supabaseAdmin.from("inquiries")
      .select("id, listing:listings(district, property_type, price), created_at")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const active = activeListings.data ?? [];
  const sold = soldListings.data ?? [];
  const inquiries = allInquiries.data ?? [];

  // District analysis
  const districtStats: Record<string, { count: number; totalPrice: number; sold: number; inquiries: number }> = {};

  for (const l of active) {
    const d = l.district || "Бусад";
    if (!districtStats[d]) districtStats[d] = { count: 0, totalPrice: 0, sold: 0, inquiries: 0 };
    districtStats[d].count++;
    districtStats[d].totalPrice += Number(l.price);
  }
  for (const l of sold) {
    const d = l.district || "Бусад";
    if (!districtStats[d]) districtStats[d] = { count: 0, totalPrice: 0, sold: 0, inquiries: 0 };
    districtStats[d].sold++;
  }
  for (const inq of inquiries) {
    const listing = inq.listing as { district: string | null } | null;
    const d = listing?.district || "Бусад";
    if (!districtStats[d]) districtStats[d] = { count: 0, totalPrice: 0, sold: 0, inquiries: 0 };
    districtStats[d].inquiries++;
  }

  const districtSummary = Object.entries(districtStats)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([d, s]) => `${d}: ${s.count} зар, дундаж ${s.count > 0 ? Math.round(s.totalPrice / s.count / 1_000_000) : 0} сая₮, ${s.sold} зарагдсан, ${s.inquiries} хүсэлт`)
    .join("\n");

  // Property type analysis
  const typeStats: Record<string, { count: number; avgPrice: number }> = {};
  for (const l of active) {
    const t = l.property_type || "Бусад";
    if (!typeStats[t]) typeStats[t] = { count: 0, avgPrice: 0 };
    typeStats[t].count++;
    typeStats[t].avgPrice += Number(l.price);
  }
  const typeSummary = Object.entries(typeStats)
    .map(([t, s]) => `${t}: ${s.count} зар, дундаж ${s.count > 0 ? Math.round(s.avgPrice / s.count / 1_000_000) : 0} сая₮`)
    .join("\n");

  // Price range analysis
  const prices = active.map((l) => Number(l.price)).filter(Boolean).sort((a, b) => a - b);
  const minPrice = prices[0] ?? 0;
  const maxPrice = prices[prices.length - 1] ?? 0;
  const medianPrice = prices[Math.floor(prices.length / 2)] ?? 0;

  const context = `
Зах зээлийн мэдээлэл (${new Date().toLocaleDateString("mn-MN")}):

Нийт идэвхтэй зар: ${active.length}
Зарагдсан (нийт): ${sold.length}
Нийт хүсэлт (сүүлийн 200): ${inquiries.length}

Үнийн хэлбэлзэл:
- Хамгийн бага: ${(minPrice / 1_000_000).toFixed(0)} сая₮
- Хамгийн их: ${(maxPrice / 1_000_000).toFixed(0)} сая₮
- Медиан: ${(medianPrice / 1_000_000).toFixed(0)} сая₮

Дүүрэг бүрийн шинжилгээ:
${districtSummary}

Төрөл бүрийн шинжилгээ:
${typeSummary}
`.trim();

  const systemPrompt = `Та Улаанбаатар хотын үл хөдлөх хөрөнгийн зах зээлийн AI шинжээч юм.

Дүрэм:
- Монгол хэлээр бичих
- Markdown формат (bold, bullet, headers)
- Тоон мэдээлэлд тулгуурлах
- Бодит зөвлөмж өгөх

Бүтэц:
1. **Зах зээлийн ерөнхий тойм** — Одоогийн байдал
2. **Дүүрэг шинжилгээ** — Хамгийн идэвхтэй дүүргүүд, эрэлт/нийлүүлэлт
3. **Үнийн шинжилгээ** — Хэлбэлзэл, чиг хандлага
4. **Эрэлт шинжилгээ** — Хамгийн их хайгдаж буй төрөл, дүүрэг
5. **Зөвлөмж** — Агентлагийн стратеги (юунд анхаарах, ямар зар нэмэх)`;

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI шинжилгээ алдаа" }, { status: 502 });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Also return raw stats for charts
    return NextResponse.json({
      analysis,
      stats: {
        active_count: active.length,
        sold_count: sold.length,
        inquiry_count: inquiries.length,
        min_price: minPrice,
        max_price: maxPrice,
        median_price: medianPrice,
        districts: Object.entries(districtStats).map(([name, s]) => ({
          name, count: s.count, avg_price: s.count > 0 ? Math.round(s.totalPrice / s.count) : 0,
          sold: s.sold, inquiries: s.inquiries,
        })).sort((a, b) => b.count - a.count),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Market analysis error:", err);
    return NextResponse.json({ error: "AI шинжилгээ алдаа" }, { status: 500 });
  }
}
