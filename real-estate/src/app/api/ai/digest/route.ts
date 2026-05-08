// POST /api/ai/digest
// Generates an AI-powered weekly/period digest for the tenant admin
// Summarizes agent performance, market trends, and recommendations

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const tenantId = auth.tenantId;

  // Gather data for digest
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    agents, listings7d, listings30d,
    inquiries7d, inquiriesNew, soldListings,
    allActiveListings,
  ] = await Promise.all([
    supabaseAdmin.from("users")
      .select("id, full_name, is_active")
      .eq("tenant_id", tenantId).eq("role", "agent").is("deleted_at", null),
    supabaseAdmin.from("listings")
      .select("id, title, price, district, property_type, status")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("listings")
      .select("id, title, price, district, property_type, status")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("inquiries")
      .select("id, status, created_at")
      .eq("tenant_id", tenantId).is("deleted_at", null)
      .gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("status", "new").is("deleted_at", null),
    supabaseAdmin.from("listings")
      .select("id, price, district")
      .eq("tenant_id", tenantId).eq("status", "sold").is("deleted_at", null)
      .gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("listings")
      .select("id, price, district, property_type")
      .eq("tenant_id", tenantId).eq("status", "active").is("deleted_at", null),
  ]);

  // District distribution
  const districtCounts: Record<string, number> = {};
  for (const l of allActiveListings.data ?? []) {
    if (l.district) districtCounts[l.district] = (districtCounts[l.district] ?? 0) + 1;
  }
  const topDistricts = Object.entries(districtCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([d, c]) => `${d}: ${c} зар`)
    .join(", ");

  // Average price
  const activePrices = (allActiveListings.data ?? []).map((l) => Number(l.price)).filter(Boolean);
  const avgPrice = activePrices.length > 0
    ? Math.round(activePrices.reduce((a, b) => a + b, 0) / activePrices.length)
    : 0;

  const salesValue = (soldListings.data ?? []).reduce((s, l) => s + Number(l.price), 0);

  const context = `
Агентлагийн тоймын мэдээлэл:

Баг:
- Нийт агент: ${agents.data?.length ?? 0} (идэвхтэй: ${agents.data?.filter((a) => a.is_active).length ?? 0})

Сүүлийн 7 хоногийн үзүүлэлт:
- Шинэ зар: ${listings7d.data?.length ?? 0}
- Шинэ хүсэлт: ${inquiries7d.data?.length ?? 0}
- Хариулаагүй хүсэлт: ${inquiriesNew.count ?? 0}

Сүүлийн 30 хоногийн үзүүлэлт:
- Нийт шинэ зар: ${listings30d.data?.length ?? 0}
- Зарагдсан: ${soldListings.data?.length ?? 0} (${salesValue > 0 ? (salesValue / 1_000_000).toFixed(0) + " сая₮" : "0₮"})

Идэвхтэй зарын тойм:
- Нийт идэвхтэй: ${allActiveListings.data?.length ?? 0}
- Дундаж үнэ: ${avgPrice > 0 ? (avgPrice / 1_000_000).toFixed(0) + " сая₮" : "—"}
- Топ дүүргүүд: ${topDistricts || "—"}
`.trim();

  const systemPrompt = `Та RealEstateOS платформын AI шинжээч юм. Агентлагийн удирдлагад зориулсан долоо хоногийн тойм бичнэ.

Дүрэм:
- Монгол хэлээр бичих
- 4-6 догол мөр, товч тодорхой
- Тоон мэдээлэл оруулах
- Бодит зөвлөмж, action items өгөх
- Эерэг тон, гэхдээ шударга байх
- Markdown format ашиглах (bold, bullet)

Бүтэц:
1. **Ерөнхий тойм** — Гол тоонууд
2. **Сайн талууд** — Юу сайн болсон
3. **Анхаарах зүйлс** — Юуг сайжруулах
4. **Зөвлөмж** — Дараагийн долоо хоногт юу хийх`;

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
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI тойм үүсгэхэд алдаа" }, { status: 502 });
    }

    const data = await response.json();
    const digest = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ digest, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error("Digest error:", err);
    return NextResponse.json({ error: "AI тойм үүсгэхэд алдаа" }, { status: 500 });
  }
}
