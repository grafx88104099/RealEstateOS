// POST /api/ai/generate-document
// Generates contracts, proposals, and fact sheets from listing + buyer data

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface GenerateDocRequest {
  listing_id: string;
  doc_type: "contract" | "proposal" | "fact_sheet";
  buyer_name?: string;
  buyer_phone?: string;
  custom_notes?: string;
}

const DOC_TEMPLATES: Record<string, { name: string; prompt: string }> = {
  contract: {
    name: "Худалдах-Худалдан авах гэрээ",
    prompt: `Монгол хэл дээр үл хөдлөх хөрөнгө худалдах-худалдан авах гэрээний ноорог бич.

Бүтэц:
1. Гэрээний нэр, огноо, дугаар
2. Талууд (зарагч, худалдан авагч)
3. Гэрээний зүйл (юу зарж байна)
4. Үнэ, төлбөрийн нөхцөл
5. Хүлээлгэн өгөх нөхцөл
6. Талуудын эрх, үүрэг
7. Гэрээний хугацаа
8. Маргаан шийдвэрлэх
9. Гарын үсэг

Жич: Энэ бол НООРОГ бөгөөд хуулийн зөвлөгөө биш гэдгийг тэмдэглэ.`,
  },
  proposal: {
    name: "Үнийн санал",
    prompt: `Монгол хэл дээр үл хөдлөх хөрөнгийн үнийн санал (proposal) бич.

Бүтэц:
1. Оффисын мэдээлэл
2. Объектын товч тайлбар
3. Техникийн үзүүлэлтүүд
4. Үнэ ба нөхцөл
5. Оффисын үйлчилгээ
6. Холбоо барих

Мэргэжлийн, товч, ойлгомжтой байх.`,
  },
  fact_sheet: {
    name: "Property Fact Sheet",
    prompt: `Монгол хэл дээр үл хөдлөх хөрөнгийн мэдээллийн хуудас (fact sheet) бич.

Бүтэц:
1. Гарчиг, гол зураг тайлбар
2. Үндсэн мэдээлэл (хүснэгт хэлбэрээр)
3. Тайлбар
4. Байршлын давуу тал
5. Орчны дэд бүтэц
6. Холбоо барих

Маркетингийн материал шиг сонирхол татсан байх.`,
  },
};

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: GenerateDocRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.listing_id || !body.doc_type) {
    return NextResponse.json({ error: "listing_id, doc_type шаардлагатай" }, { status: 400 });
  }

  const template = DOC_TEMPLATES[body.doc_type];
  if (!template) {
    return NextResponse.json({ error: "Буруу doc_type" }, { status: 400 });
  }

  // Fetch listing
  const { data: listing } = await supabaseAdmin
    .from("listings")
    .select("*, agent:users!agent_id(full_name, email)")
    .eq("id", body.listing_id)
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  }

  // Fetch tenant
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, settings")
    .eq("id", auth.tenantId)
    .single();

  const agent = listing.agent as { full_name: string | null; email: string } | null;
  const settings = (tenant?.settings ?? {}) as Record<string, unknown>;

  const context = `
Объектын мэдээлэл:
- Гарчиг: ${listing.title}
- Тайлбар: ${listing.description || "—"}
- Төрөл: ${listing.property_type}
- Зорилго: ${listing.listing_type === "sale" ? "Зарах" : "Түрээслэх"}
- Үнэ: ${Number(listing.price).toLocaleString()}₮
- Талбай: ${listing.area_sqm || "—"} м²
- Өрөөний тоо: ${listing.rooms || "—"}
- Давхар: ${listing.floor || "—"}/${listing.total_floors || "—"}
- Дүүрэг: ${listing.district || "—"}
- Хаяг: ${listing.address || "—"}

Агент: ${agent?.full_name || "—"} (${agent?.email || ""})
Оффис: ${tenant?.name || "—"}
Оффисын утас: ${settings.contact_phone || "—"}
Оффисын email: ${settings.contact_email || "—"}

${body.buyer_name ? `Худалдан авагч: ${body.buyer_name}` : ""}
${body.buyer_phone ? `Худалдан авагчийн утас: ${body.buyer_phone}` : ""}
${body.custom_notes ? `Нэмэлт: ${body.custom_notes}` : ""}

Өнөөдрийн огноо: ${new Date().toLocaleDateString("mn-MN")}
`.trim();

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
          { role: "system", content: template.prompt },
          { role: "user", content: context },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Баримт бичиг үүсгэхэд алдаа" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      document: content,
      doc_type: body.doc_type,
      doc_name: template.name,
      listing_title: listing.title,
    });
  } catch (err) {
    console.error("Document generation error:", err);
    return NextResponse.json({ error: "Баримт бичиг үүсгэхэд алдаа" }, { status: 500 });
  }
}
