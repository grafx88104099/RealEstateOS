// POST /api/ai/generate-description
// Generates a professional Mongolian listing description from property metadata
// Uses OpenAI GPT-4o-mini for fast, cost-effective generation

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { aiCostGuard } from "@/lib/ai/cost-guard";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface GenerateRequest {
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  rooms?: number;
  area_sqm?: number;
  floor?: number;
  total_floors?: number;
  district?: string;
  address?: string;
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  const gate = await aiCostGuard(req, { route: "generate-description", identifier: auth.userId });
  if (!gate.ok) return gate.response;

  let body: GenerateRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title) {
    return NextResponse.json({ error: "Гарчиг шаардлагатай" }, { status: 400 });
  }

  const propertyTypeLabels: Record<string, string> = {
    apartment: "Орон сууц",
    house: "Байшин",
    land: "Газар",
    commercial: "Арилжааны",
    office: "Оффис",
  };

  const listingTypeLabels: Record<string, string> = {
    sale: "зарна",
    rent: "түрээслүүлнэ",
  };

  const meta: string[] = [];
  meta.push(`Гарчиг: ${body.title}`);
  meta.push(`Төрөл: ${propertyTypeLabels[body.property_type] ?? body.property_type}`);
  meta.push(`Зорилго: ${listingTypeLabels[body.listing_type] ?? body.listing_type}`);
  if (body.price) meta.push(`Үнэ: ${body.price.toLocaleString()}₮`);
  if (body.rooms) meta.push(`Өрөөний тоо: ${body.rooms}`);
  if (body.area_sqm) meta.push(`Талбай: ${body.area_sqm} м²`);
  if (body.floor && body.total_floors) meta.push(`Давхар: ${body.floor}/${body.total_floors}`);
  if (body.district) meta.push(`Дүүрэг: ${body.district}`);
  if (body.address) meta.push(`Хаяг: ${body.address}`);

  const systemPrompt = `Та Монгол улсын үл хөдлөх хөрөнгийн мэргэжлийн зар бичигч юм.
Өгсөн мэдээллээс мэргэжлийн, сонирхол татахуйц, товч тодорхой зарын тайлбар бичнэ үү.

Дүрэм:
- Монгол хэлээр бичих
- 3-5 өгүүлбэр, 80-150 үгэнд багтаах
- Байршлын давуу тал, орчны тохижилт дурдах
- Худалдан авагч / түрээслэгчид зориулж сэтгэл татам байлгах
- Үнийн мэдээлэл дахин бичихгүй (аль хэдийн зарын хэсэгт харагдана)
- Зөвхөн тайлбар текст буцаах, гарчиг, тэмдэглэгээ нэмэхгүй`;

  const userPrompt = `Дараах мэдээллээр зарын тайлбар бичнэ үү:\n\n${meta.join("\n")}`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI generate failed:", err);
      return NextResponse.json({ error: "AI тайлбар үүсгэхэд алдаа гарлаа" }, { status: 502 });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      description,
      tokens_used: data.usage?.total_tokens ?? 0,
    });
  } catch (err) {
    console.error("Generate description error:", err);
    return NextResponse.json({ error: "AI тайлбар үүсгэхэд алдаа гарлаа" }, { status: 500 });
  }
}
