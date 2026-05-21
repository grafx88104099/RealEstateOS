// GET  /api/inquiries — role-scoped inquiry list
// POST /api/inquiries — consumer эсвэл anonymous-гүйгээр хүсэлт илгээнэ
//                       (anonymous үед guest_name + guest_email/guest_phone заавал)
//                       Rate-limit (IP-аар) + agent-руу email notification.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { withAuth, isAuthError } from "@/lib/middleware/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { inquiryNotificationTemplate } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

const RATE_WINDOW_SECONDS = 60 * 60; // 1 цаг
const RATE_LIMIT_MAX = 10; // 1 IP-аас 1 цагт 10 удаа

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const auth = await withAuth(req, ["super_admin", "tenant_admin", "agent", "consumer"]);
  if (isAuthError(auth)) return auth;

  const supabase = await createSupabaseServer();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("inquiries")
    .select(`
      id, status, message, created_at, guest_name, guest_email, guest_phone,
      listing:listings(id, title, district, price),
      buyer:users!buyer_id(id, full_name, email)
    `, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Role-based scoping
  if (auth.role === "consumer") {
    query = query.eq("buyer_id", auth.userId);
  } else if (auth.role === "agent") {
    query = query.eq("agent_id", auth.userId);
  } else {
    query = query.eq("tenant_id", auth.tenantId);
  }

  if (status) query = query.eq("status", status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inquiries: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  // Auth optional — anonymous OK
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  // Rate limit IP-аар (anonymous болон authenticated хоёуланд) — Redis fail бол алгасна
  if (redis) {
    try {
      const key = `inquiry:${user?.id ?? clientIp(req)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, RATE_WINDOW_SECONDS);
      if (count > RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: "Хэт олон удаа илгээллээ. 1 цагийн дараа дахин үзнэ үү." },
          { status: 429 },
        );
      }
    } catch (err) {
      console.warn("[inquiry] rate limit skipped (redis error):", err);
    }
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const listingId = String(body.listing_id ?? "");
  if (!listingId) return NextResponse.json({ error: "listing_id шаардлагатай" }, { status: 400 });

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : null;

  // Guest хэрэглэгчийн мэдээлэл (login хэрэглэгч бол хэрэгсэхгүй)
  const guestName = typeof body.guest_name === "string" ? body.guest_name.trim().slice(0, 100) : "";
  const guestEmail = typeof body.guest_email === "string" ? body.guest_email.trim().slice(0, 200) : "";
  const guestPhone = typeof body.guest_phone === "string" ? body.guest_phone.trim().slice(0, 50) : "";

  // Listing шалгах
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listing, error: lErr } = await (supabaseAdmin as any)
    .from("listings")
    .select("id, agent_id, tenant_id, status, title, tenant:tenants(status, deleted_at)")
    .eq("id", listingId)
    .is("deleted_at", null)
    .single();

  if (lErr || !listing) return NextResponse.json({ error: "Зар олдсонгүй" }, { status: 404 });
  if (listing.status !== "active") return NextResponse.json({ error: "Зар идэвхтэй биш" }, { status: 400 });
  if (!listing.tenant || listing.tenant.deleted_at || listing.tenant.status !== "active") {
    return NextResponse.json({ error: "Оффис түр хаагдсан" }, { status: 400 });
  }

  // Buyer эсвэл guest шалгалт
  const isAnon = !user;
  if (isAnon) {
    if (!guestName || (!guestEmail && !guestPhone)) {
      return NextResponse.json(
        { error: "Нэр + (имэйл эсвэл утас) шаардлагатай" },
        { status: 400 },
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inquiry, error } = await (supabaseAdmin as any)
    .from("inquiries")
    .insert({
      tenant_id: listing.tenant_id,
      listing_id: listingId,
      buyer_id: user?.id ?? null,
      agent_id: listing.agent_id,
      message,
      status: "new",
      guest_name: isAnon ? guestName : null,
      guest_email: isAnon ? guestEmail || null : null,
      guest_phone: isAnon ? guestPhone || null : null,
    })
    .select()
    .single();

  if (error) {
    logger.error("inquiry.create_failed", { listingId, tenantId: listing.tenant_id }, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Agent-руу email notification (background)
  (async () => {
    try {
      let agentEmail: string | undefined;
      let agentName = "Агент";
      if (listing.agent_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: ag } = await (supabaseAdmin as any)
          .from("users")
          .select("email, full_name, is_active")
          .eq("id", listing.agent_id)
          .is("deleted_at", null)
          .maybeSingle();
        if (ag?.is_active) {
          agentEmail = ag.email;
          agentName = ag.full_name ?? "Агент";
        }
      }

      // Agent байхгүй/идэвхгүй бол tenant_admin-руу fall back
      if (!agentEmail) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: admin } = await (supabaseAdmin as any)
          .from("users")
          .select("email, full_name")
          .eq("tenant_id", listing.tenant_id)
          .eq("role", "tenant_admin")
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (admin) {
          agentEmail = admin.email;
          agentName = admin.full_name ?? "Удирдлага";
        }
      }

      if (!agentEmail) return;

      // Buyer-ийн нэр / хаягийг тогтоох
      let buyerName = guestName;
      let buyerEmail = guestEmail;
      let buyerPhone = guestPhone;
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: b } = await (supabaseAdmin as any)
          .from("users")
          .select("full_name, email, phone")
          .eq("id", user.id)
          .maybeSingle();
        buyerName = b?.full_name ?? user.email ?? "Хэрэглэгч";
        buyerEmail = b?.email ?? user.email ?? "";
        buyerPhone = b?.phone ?? "";
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nemi.mn";
      const tpl = inquiryNotificationTemplate({
        agentName,
        listingTitle: listing.title,
        buyerName,
        buyerEmail: buyerEmail || undefined,
        buyerPhone: buyerPhone || undefined,
        message: message ?? undefined,
        inquiryUrl: `${siteUrl}/dashboard/inquiries/${inquiry.id}`,
      });
      await sendEmail({ to: agentEmail, subject: tpl.subject, html: tpl.html });
    } catch (err) {
      logger.warn("inquiry.notify_failed", { inquiryId: inquiry.id }, err);
    }
  })();

  return NextResponse.json({ inquiry }, { status: 201 });
}
