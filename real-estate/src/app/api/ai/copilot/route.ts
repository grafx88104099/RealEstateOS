// POST /api/ai/copilot
// AI Copilot for real estate agents — streaming chat with context
// Has access to agent's listings, inquiries, and market data via function calling

import { NextRequest } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent"]);
  if (isAuthError(auth)) return auth;

  let body: { messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.messages?.length) {
    return new Response(JSON.stringify({ error: "messages шаардлагатай" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch agent context data
  const [listingsRes, inquiriesRes] = await Promise.all([
    supabaseAdmin
      .from("listings")
      .select("id, title, price, rooms, district, property_type, status, area_sqm, created_at")
      .eq("agent_id", auth.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("inquiries")
      .select(`id, status, message, created_at, listing:listings(title), buyer:users!buyer_id(full_name, email)`)
      .eq("agent_id", auth.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const listings = listingsRes.data ?? [];
  const inquiries = inquiriesRes.data ?? [];

  // Build context summary
  const activeListings = listings.filter((l) => l.status === "active");
  const newInquiries = inquiries.filter((i) => i.status === "new");

  const contextSummary = `
Агентын мэдээлэл:
- Нийт зар: ${listings.length} (идэвхтэй: ${activeListings.length})
- Нийт хүсэлт: ${inquiries.length} (шинэ: ${newInquiries.length})

Миний зарууд (сүүлийн 20):
${listings.map((l) => `- ${l.title} | ${l.price?.toLocaleString()}₮ | ${l.district || "—"} | ${l.rooms || "—"} өрөө | ${l.status}`).join("\n")}

Сүүлийн хүсэлтүүд:
${inquiries.slice(0, 10).map((i) => {
  const listing = i.listing as { title: string } | null;
  const buyer = i.buyer as { full_name: string | null; email: string } | null;
  return `- ${listing?.title || "—"} | ${buyer?.full_name || buyer?.email || "—"} | "${(i.message || "").slice(0, 80)}" | ${i.status} | ${new Date(i.created_at).toLocaleDateString("mn-MN")}`;
}).join("\n")}
`.trim();

  const systemPrompt = `Та RealEstateOS платформ дээрх үл хөдлөх хөрөнгийн агентын AI туслах юм.

Таны үүрэг:
1. Агентын зар, хүсэлтийн талаар мэдээлэл өгөх
2. Зах зээлийн зөвлөгөө өгөх (Улаанбаатар хот)
3. Хүсэлтэд хариу бичихэд тусалах
4. Борлуулалтын стратеги санал болгох
5. Статистик дүн шинжилгээ хийх

Дүрэм:
- Монгол хэлээр хариулах
- Товч, тодорхой байх (3-5 өгүүлбэр хангалттай)
- Тоон мэдээлэл оруулах (зарын тоо, үнэ, хүсэлт)
- Бодит зөвлөгөө өгөх
- Хэрэв мэдээлэл дутуу бол шударгаар хэлэх

${contextSummary}`;

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
          ...body.messages.slice(-10), // Keep last 10 messages for context
        ],
        temperature: 0.6,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!response.ok) {
      console.error("Copilot failed:", response.status);
      return new Response(JSON.stringify({ error: "AI хариу үүсгэхэд алдаа" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Copilot error:", err);
    return new Response(JSON.stringify({ error: "AI хариу үүсгэхэд алдаа" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
