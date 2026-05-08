// POST /api/ai/buyer-agent/chat
// Multi-turn buyer-side AI agent with tool-calling.
// Tools: search_listings, get_market_analysis, draft_offer, schedule_viewing.
// Streams SSE events: { type: 'token'|'tool_call'|'tool_result'|'done'|'error', ... }

import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { supabaseAdmin as typedAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { searchListings } from "@/lib/ai/search";

// Loose-typed admin for new Phase 2 tables (regenerate types after migration applied).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = typedAdmin as unknown as SupabaseClient<any, any, any>;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini"; // function-calling capable
const MAX_TOOL_ITERATIONS = 4;

interface ChatRequestBody {
  conversation_id?: string;
  message: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_listings",
      description:
        "Search active real estate listings using semantic similarity over a Mongolian-language query plus optional structured filters.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Free-text search in Mongolian" },
          district: { type: "string" },
          property_type: {
            type: "string",
            enum: ["apartment", "house", "office", "land", "commercial"],
          },
          listing_type: { type: "string", enum: ["sale", "rent"] },
          min_rooms: { type: "integer" },
          max_price: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_offer",
      description:
        "Draft a purchase/rent offer the buyer can review before sending. Does NOT submit yet.",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string" },
          amount: { type: "number" },
          message: { type: "string" },
        },
        required: ["listing_id", "amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "schedule_viewing",
      description: "Propose viewing time-slots for a specific listing.",
      parameters: {
        type: "object",
        properties: {
          listing_id: { type: "string" },
          proposed_slots: {
            type: "array",
            items: { type: "string", description: "ISO 8601 timestamp" },
          },
        },
        required: ["listing_id", "proposed_slots"],
      },
    },
  },
];

const SYSTEM_PROMPT = `Та "RealEstateOS" платформын **AI Buyer Agent** (худалдан авагчийн зуучлагч). Хэрэглэгчийн зүгээс ажиллана.

Үүрэг:
1. Хэрэглэгчийн хэрэгцээг асуулгаар тодруулах (дүүрэг, өрөө, төсөв, хугацаа).
2. \`search_listings\` хэрэгслээр тохирох зар олох.
3. Сонирхсон зар дээр нь \`draft_offer\` эсвэл \`schedule_viewing\` хэрэгсэл санал болгох.
4. Хариултаа товч, ойлгомжтой Монгол хэлээр өгөх.

Дүрэм:
- Эхлээд хэрэгцээг ойлгох. Шууд хайхын өмнө дутуу мэдээллийг асуу.
- Үнийн санал гаргахдаа маркет дунджтай харьцуулсан тайлбар өг.
- Хэрэглэгчийн зөвшөөрөлгүйгээр санал илгээхгүй (зөвхөн draft).
- Хэт олон tool-call хийхгүй (нэг ээлжид 1-2).`;

export async function POST(req: NextRequest) {
  const auth = await withAuth(req, ["consumer", "agent", "tenant_admin"]);
  if (isAuthError(auth)) return auth;

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "message шаардлагатай" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ─── Resolve or create conversation ──────────────────────────────
  let conversationId = body.conversation_id;
  if (!conversationId) {
    const { data: conv, error: convErr } = await supabaseAdmin
      .from("ai_conversations")
      .insert({
        user_id: auth.userId,
        tenant_id: auth.tenantId,
        agent_type: "buyer",
        title: body.message.slice(0, 60),
      })
      .select("id")
      .single();
    if (convErr || !conv) {
      return new Response(
        JSON.stringify({ error: `Conversation үүсгэхэд алдаа: ${convErr?.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    conversationId = conv.id;
  }

  // Persist user message
  await supabaseAdmin.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: body.message.trim(),
  });

  // Load history (last 20)
  const { data: history } = await supabaseAdmin
    .from("ai_messages")
    .select("role, content, tool_calls, tool_results")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  type OAIMsg = {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    name?: string;
    tool_calls?: OpenAIToolCall[];
    tool_call_id?: string;
  };

  const messages: OAIMsg[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((m) => {
      const base: OAIMsg = {
        role: m.role as OAIMsg["role"],
        content: m.content || "",
      };
      if (m.tool_calls) base.tool_calls = m.tool_calls as OpenAIToolCall[];
      return base;
    }),
  ];

  // ─── SSE stream ──────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const supabaseTenantClient = await createSupabaseServer();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: "conversation", conversation_id: conversationId });

      try {
        for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
          const res = await fetch(OPENAI_CHAT_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: MODEL,
              messages,
              tools: TOOLS,
              tool_choice: "auto",
              temperature: 0.5,
              max_tokens: 600,
            }),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            send({ type: "error", error: `OpenAI ${res.status}: ${errText.slice(0, 200)}` });
            break;
          }

          const data = await res.json();
          const choice = data.choices?.[0];
          const msg = choice?.message;
          if (!msg) {
            send({ type: "error", error: "OpenAI хариу хоосон" });
            break;
          }

          // No tool calls → final answer
          if (!msg.tool_calls?.length) {
            const finalText = (msg.content as string) || "";
            // Stream tokens (chunked) for UX consistency
            const chunks = finalText.match(/[\s\S]{1,40}/g) ?? [finalText];
            for (const c of chunks) {
              send({ type: "token", text: c });
            }

            await supabaseAdmin.from("ai_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: finalText,
              tokens_used: data.usage?.total_tokens ?? null,
            });
            send({ type: "done", conversation_id: conversationId });
            break;
          }

          // Persist assistant tool-call message + add to context
          await supabaseAdmin.from("ai_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: (msg.content as string) || "",
            tool_calls: msg.tool_calls,
          });
          messages.push({
            role: "assistant",
            content: (msg.content as string) || "",
            tool_calls: msg.tool_calls,
          });

          // Execute each tool
          for (const tc of msg.tool_calls as OpenAIToolCall[]) {
            send({
              type: "tool_call",
              id: tc.id,
              name: tc.function.name,
              arguments: safeParse(tc.function.arguments),
            });

            const result = await executeTool(tc, {
              tenantId: auth.tenantId,
              userId: auth.userId,
              supabase: supabaseTenantClient,
            });

            send({ type: "tool_result", id: tc.id, name: tc.function.name, result });

            await supabaseAdmin.from("ai_messages").insert({
              conversation_id: conversationId,
              role: "tool",
              content: JSON.stringify(result).slice(0, 8000),
              tool_results: result,
            });

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: JSON.stringify(result).slice(0, 8000),
            });
          }
        }
      } catch (err) {
        console.error("buyer-agent chat error:", err);
        send({ type: "error", error: (err as Error).message });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

interface ToolCtx {
  tenantId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>;
}

async function executeTool(
  tc: OpenAIToolCall,
  ctx: ToolCtx
): Promise<Record<string, unknown>> {
  const args = safeParse(tc.function.arguments);

  switch (tc.function.name) {
    case "search_listings": {
      const query = (args.query as string) || "";
      try {
        const { results } = await searchListings(query, ctx.tenantId, ctx.supabase, {
          threshold: 0.65,
          limit: 6,
          filters: {
            district: (args.district as string) || undefined,
            propertyType: (args.property_type as string) || undefined,
            minRooms: (args.min_rooms as number) || undefined,
            maxPrice: (args.max_price as number) || undefined,
          },
        });
        return {
          ok: true,
          count: results.length,
          listings: results.map((r) => ({
            id: r.id,
            title: r.title,
            price: r.price,
            district: r.district,
            rooms: r.rooms,
            area_sqm: r.area_sqm,
            property_type: r.property_type,
            listing_type: r.listing_type,
            similarity: r.similarity,
          })),
        };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    }

    case "draft_offer": {
      const listingId = args.listing_id as string;
      const amount = args.amount as number;
      if (!listingId || !amount) return { ok: false, error: "Дутуу аргумент" };

      const { data: listing, error: lErr } = await supabaseAdmin
        .from("listings")
        .select("id, title, price, agent_id, tenant_id")
        .eq("id", listingId)
        .single();
      if (lErr || !listing) {
        return { ok: false, error: "Зар олдсонгүй" };
      }

      const { data: offer, error: oErr } = await supabaseAdmin
        .from("offers")
        .insert({
          listing_id: listingId,
          buyer_id: ctx.userId,
          seller_id: listing.agent_id,
          tenant_id: listing.tenant_id,
          amount,
          message: (args.message as string) || null,
          status: "draft",
          created_by: "ai",
          ai_reasoning: `AI санал: ₮${amount.toLocaleString()} (зарын үнэ ₮${listing.price?.toLocaleString()})`,
        })
        .select("id, status")
        .single();

      if (oErr) return { ok: false, error: oErr.message };
      return {
        ok: true,
        offer_id: offer.id,
        status: offer.status,
        listing_title: listing.title,
        amount,
      };
    }

    case "schedule_viewing": {
      const listingId = args.listing_id as string;
      const slots = (args.proposed_slots as string[]) ?? [];
      if (!listingId || slots.length === 0) {
        return { ok: false, error: "Дутуу аргумент" };
      }

      const { data: listing } = await supabaseAdmin
        .from("listings")
        .select("agent_id, tenant_id")
        .eq("id", listingId)
        .single();

      const { data: viewing, error } = await supabaseAdmin
        .from("viewings")
        .insert({
          listing_id: listingId,
          buyer_id: ctx.userId,
          seller_id: listing?.agent_id,
          tenant_id: listing?.tenant_id ?? ctx.tenantId,
          proposed_slots: slots,
          status: "proposed",
          created_by: "ai",
        })
        .select("id, status")
        .single();

      if (error) return { ok: false, error: error.message };
      return { ok: true, viewing_id: viewing.id, slots };
    }

    default:
      return { ok: false, error: `Үл мэдэгдэх tool: ${tc.function.name}` };
  }
}
