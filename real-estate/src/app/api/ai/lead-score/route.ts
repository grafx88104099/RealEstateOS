// POST /api/ai/lead-score
// AI-powered lead scoring for inquiries
// Analyzes inquiry message, buyer history, and listing match to generate score

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { aiCostGuard } from "@/lib/ai/cost-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface ScoreRequest {
  inquiry_id: string;
}

interface LeadScoreResult {
  score: number;        // 0-100
  level: "hot" | "warm" | "cold";
  reasoning: string;    // Mongolian explanation
  suggestions: string[]; // action items for agent
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const gate = await aiCostGuard(req, { route: "lead-score", identifier: auth.userId });
  if (!gate.ok) return gate.response;

  let body: ScoreRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.inquiry_id) {
    return NextResponse.json({ error: "inquiry_id шаардлагатай" }, { status: 400 });
  }

  // Fetch inquiry with listing and buyer details
  const { data: inquiry, error: inqErr } = await supabaseAdmin
    .from("inquiries")
    .select(`
      id, status, message, created_at,
      listing:listings(id, title, price, rooms, district, property_type, area_sqm),
      buyer:users!buyer_id(id, full_name, email)
    `)
    .eq("id", body.inquiry_id)
    .single();

  if (inqErr || !inquiry) {
    return NextResponse.json({ error: "Хүсэлт олдсонгүй" }, { status: 404 });
  }

  // Count buyer's previous inquiries (engagement signal)
  const buyer = inquiry.buyer as { id: string; full_name: string | null; email: string } | null;
  let buyerInquiryCount = 0;
  if (buyer?.id) {
    const { count } = await supabaseAdmin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", buyer.id);
    buyerInquiryCount = count ?? 0;
  }

  // Calculate time since inquiry
  const hoursSinceInquiry = Math.round(
    (Date.now() - new Date(inquiry.created_at).getTime()) / (1000 * 60 * 60)
  );

  const listing = inquiry.listing as {
    title: string; price: number; rooms: number;
    district: string; property_type: string; area_sqm: number;
  } | null;

  const context = `
Хүсэлтийн мэдээлэл:
- Мессеж: "${inquiry.message || "(хоосон)"}"
- Огноо: ${new Date(inquiry.created_at).toLocaleDateString("mn-MN")}
- ${hoursSinceInquiry} цагийн өмнө ирсэн
- Төлөв: ${inquiry.status}

Худалдан авагч:
- Нэр: ${buyer?.full_name || "Тодорхойгүй"}
- Email: ${buyer?.email || "—"}
- Нийт хүсэлтийн тоо: ${buyerInquiryCount}

Зар:
- Гарчиг: ${listing?.title || "—"}
- Үнэ: ${listing?.price?.toLocaleString() || "—"}₮
- Дүүрэг: ${listing?.district || "—"}
- Төрөл: ${listing?.property_type || "—"}
- Талбай: ${listing?.area_sqm || "—"} м²
- Өрөө: ${listing?.rooms || "—"}
`.trim();

  const systemPrompt = `Та үл хөдлөх хөрөнгийн lead scoring AI юм.
Хүсэлтийн мэдээллийг шинжилж, худалдан авагчийн сонирхлын түвшинг 0-100 оноогоор үнэлнэ.

Оноо тооцох шалгуур:
- Мессежний дэлгэрэнгүй байдал (урт, тодорхой асуулт = өндөр оноо)
- Худалдан авагчийн өмнөх идэвхи (олон хүсэлт = сонирхолтой)
- Яаралтай байдал (шинэ хүсэлт = илүү халуун)
- Мессежний агуулга (үзлэг хүсэх, үнэ тохирох, нүүх хугацаа дурдсан = өндөр)

Хариуг зөвхөн JSON форматаар буцаана:
{
  "score": <0-100>,
  "level": "<hot|warm|cold>",
  "reasoning": "<Монгол хэлээр товч тайлбар>",
  "suggestions": ["<санал 1>", "<санал 2>"]
}

Оноо: 80-100 = hot (яаралтай), 50-79 = warm (анхаарах), 0-49 = cold (хүлээх)`;

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
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("Lead scoring failed:", await response.text());
      return NextResponse.json({ error: "AI оноо тооцоход алдаа" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result: LeadScoreResult = JSON.parse(content);

    // Clamp score
    result.score = Math.max(0, Math.min(100, result.score));
    if (result.score >= 80) result.level = "hot";
    else if (result.score >= 50) result.level = "warm";
    else result.level = "cold";

    return NextResponse.json(result);
  } catch (err) {
    console.error("Lead score error:", err);
    return NextResponse.json({ error: "AI оноо тооцоход алдаа" }, { status: 500 });
  }
}
