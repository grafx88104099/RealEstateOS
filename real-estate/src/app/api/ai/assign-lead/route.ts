// POST /api/ai/assign-lead
// AI-powered lead assignment — picks the best agent for an inquiry
// Considers: agent specialization (district, property_type), workload, performance

import { NextRequest, NextResponse } from "next/server";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { aiCostGuard, recordOpenAiUsage } from "@/lib/ai/cost-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  const gate = await aiCostGuard(req, { route: "assign-lead", identifier: auth.userId });
  if (!gate.ok) return gate.response;

  let body: { inquiry_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.inquiry_id) {
    return NextResponse.json({ error: "inquiry_id шаардлагатай" }, { status: 400 });
  }

  // Fetch inquiry with listing
  const { data: inquiry } = await supabaseAdmin
    .from("inquiries")
    .select("id, listing_id, agent_id, listing:listings(title, district, property_type, price)")
    .eq("id", body.inquiry_id)
    .single();

  if (!inquiry) {
    return NextResponse.json({ error: "Хүсэлт олдсонгүй" }, { status: 404 });
  }

  const listing = inquiry.listing as {
    title: string; district: string | null;
    property_type: string | null; price: number;
  } | null;

  // Fetch active agents with their stats
  const { data: agents } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email")
    .eq("tenant_id", auth.tenantId)
    .eq("role", "agent")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ error: "Идэвхтэй агент байхгүй" }, { status: 404 });
  }

  const agentIds = agents.map((a) => a.id);

  // Get per-agent stats
  const [agentListings, agentInquiries] = await Promise.all([
    supabaseAdmin.from("listings")
      .select("agent_id, district, property_type, status")
      .eq("tenant_id", auth.tenantId)
      .in("agent_id", agentIds)
      .is("deleted_at", null),
    supabaseAdmin.from("inquiries")
      .select("agent_id, status")
      .eq("tenant_id", auth.tenantId)
      .in("agent_id", agentIds)
      .is("deleted_at", null),
  ]);

  const agentProfiles = agents.map((agent) => {
    const myListings = agentListings.data?.filter((l) => l.agent_id === agent.id) ?? [];
    const myInquiries = agentInquiries.data?.filter((i) => i.agent_id === agent.id) ?? [];

    const districts: string[] = [...new Set(myListings.map((l) => l.district).filter(Boolean))] as string[];
    const types: string[] = [...new Set(myListings.map((l) => l.property_type).filter(Boolean))] as string[];
    const activeLoad = myInquiries.filter((i) => i.status === "new" || i.status === "contacted").length;
    const closedWon = myInquiries.filter((i) => i.status === "closed_won").length;
    const total = myInquiries.length;
    const convRate = total > 0 ? Math.round((closedWon / total) * 100) : 0;

    // District match bonus
    const districtMatch = !!(listing?.district && districts.includes(String(listing.district)));
    const typeMatch = !!(listing?.property_type && types.includes(String(listing.property_type)));

    return {
      id: agent.id,
      name: agent.full_name || agent.email,
      districts: districts.join(", "),
      property_types: types.join(", "),
      active_load: activeLoad,
      total_listings: myListings.length,
      conversion_rate: convRate,
      district_match: districtMatch,
      type_match: typeMatch,
    };
  });

  // AI decision
  const context = `
Шинэ хүсэлт:
- Зар: "${listing?.title ?? "—"}"
- Дүүрэг: ${listing?.district ?? "тодорхойгүй"}
- Төрөл: ${listing?.property_type ?? "тодорхойгүй"}
- Үнэ: ${listing?.price?.toLocaleString() ?? "—"}₮

Идэвхтэй агентууд:
${agentProfiles.map((a, i) => `${i + 1}. ${a.name}
   - Дүүрэг: ${a.districts || "—"} ${a.district_match ? "(ТОХИРЧ БАЙНА)" : ""}
   - Төрөл: ${a.property_types || "—"} ${a.type_match ? "(ТОХИРЧ БАЙНА)" : ""}
   - Ачаалал: ${a.active_load} хариулаагүй хүсэлт
   - Нийт зар: ${a.total_listings}
   - Конверс: ${a.conversion_rate}%`).join("\n")}
`.trim();

  const systemPrompt = `Та үл хөдлөх хөрөнгийн lead routing AI юм.
Хүсэлтийг хамгийн тохиромжтой агентад хуваарилна.

Шалгуурууд (чухлын дарааллаар):
1. Дүүрэг тохирч байна уу (мэргэшил)
2. Төрөл тохирч байна уу
3. Одоогийн ачаалал бага уу
4. Конверсийн хувь өндөр үү

JSON хариу:
{
  "agent_index": <1-с эхлэх дугаар>,
  "reasoning": "<Монгол хэлээр товч тайлбар>",
  "confidence": <0-100>
}`;

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
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "AI хуваарилалт алдаа" }, { status: 502 });
    }

    const data = await response.json();
    recordOpenAiUsage("gpt-4o-mini", data.usage).catch(() => {});
    const result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");

    const agentIdx = Math.max(0, Math.min((result.agent_index ?? 1) - 1, agentProfiles.length - 1));
    const selectedAgent = agentProfiles[agentIdx];

    return NextResponse.json({
      assigned_agent: {
        id: selectedAgent.id,
        name: selectedAgent.name,
      },
      reasoning: result.reasoning ?? "",
      confidence: result.confidence ?? 0,
      all_agents: agentProfiles.map((a) => ({ id: a.id, name: a.name, load: a.active_load, conversion: a.conversion_rate })),
    });
  } catch (err) {
    console.error("Lead assign error:", err);
    // Fallback: round-robin by lowest load
    const lowest = agentProfiles.sort((a, b) => a.active_load - b.active_load)[0];
    return NextResponse.json({
      assigned_agent: { id: lowest.id, name: lowest.name },
      reasoning: "AI боломжгүй — хамгийн бага ачаалалтай агентад хуваарилсан",
      confidence: 50,
      fallback: true,
    });
  }
}
