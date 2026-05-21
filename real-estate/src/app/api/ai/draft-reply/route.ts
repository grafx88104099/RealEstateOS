// POST /api/ai/draft-reply
// Generates a draft reply for an inquiry
// Agent can review and edit before sending

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { aiCostGuard, recordOpenAiUsage } from "@/lib/ai/cost-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const gate = await aiCostGuard(req, { route: "draft-reply", identifier: auth.userId });
  if (!gate.ok) return gate.response;

  let body: { inquiry_id: string; tone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.inquiry_id) {
    return NextResponse.json({ error: "inquiry_id шаардлагатай" }, { status: 400 });
  }

  // Fetch inquiry with full context
  const { data: inquiry, error } = await supabaseAdmin
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, price, rooms, district, property_type, area_sqm, floor, total_floors, address, description),
      buyer:users!buyer_id(id, full_name, email)
    `)
    .eq("id", body.inquiry_id)
    .single();

  if (error || !inquiry) {
    return NextResponse.json({ error: "Хүсэлт олдсонгүй" }, { status: 404 });
  }

  const listing = inquiry.listing as {
    title: string; price: number; rooms: number; district: string;
    property_type: string; area_sqm: number; floor: number;
    total_floors: number; address: string; description: string;
  } | null;
  const buyer = inquiry.buyer as { full_name: string | null; email: string } | null;

  const tone = body.tone || "professional"; // professional, friendly, brief

  const toneGuide: Record<string, string> = {
    professional: "Мэргэжлийн, албан ёсны хэл ашиглах",
    friendly: "Найрсаг, дулаан хэл ашиглах",
    brief: "Маш товч, шууд утгаараа хариулах",
  };

  const context = `
Худалдан авагчийн мессеж: "${inquiry.message || "(хоосон)"}"
Худалдан авагчийн нэр: ${buyer?.full_name || "Тодорхойгүй"}

Зарын мэдээлэл:
- Гарчиг: ${listing?.title || "—"}
- Үнэ: ${listing?.price?.toLocaleString() || "—"}₮
- Дүүрэг: ${listing?.district || "—"}
- Хаяг: ${listing?.address || "—"}
- Төрөл: ${listing?.property_type || "—"}
- Талбай: ${listing?.area_sqm || "—"} м²
- Өрөө: ${listing?.rooms || "—"}
- Давхар: ${listing?.floor || "—"}/${listing?.total_floors || "—"}
- Тайлбар: ${listing?.description?.slice(0, 200) || "—"}
`.trim();

  const systemPrompt = `Та үл хөдлөх хөрөнгийн агентын нэрийн өмнөөс хариу бичиж өгөх AI туслах юм.

Дүрэм:
- Монгол хэлээр бичих
- ${toneGuide[tone] || toneGuide.professional}
- Зарын мэдээллийг зохистой хэмжээнд ашиглах
- Үзлэг хийх боломж санал болгох
- Холбоо барих дугаар/цаг санал болгохгүй (агент өөрөө нэмнэ)
- 3-6 өгүүлбэрт багтаах
- Зөвхөн хариу текст буцаах, нэмэлт тайлбар оруулахгүй`;

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
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI хариу үүсгэхэд алдаа" }, { status: 502 });
    }

    const data = await response.json();
    recordOpenAiUsage("gpt-4o-mini", data.usage).catch(() => {});
    const reply = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ reply, tone });
  } catch (err) {
    console.error("Draft reply error:", err);
    return NextResponse.json({ error: "AI хариу үүсгэхэд алдаа" }, { status: 500 });
  }
}
