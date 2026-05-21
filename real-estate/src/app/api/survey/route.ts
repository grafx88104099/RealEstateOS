// POST /api/survey — public survey collection
// Hardening: IP rate limit, length caps на бүх string талбар, spam guard.
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { supabaseAdmin } from "@/lib/supabase/admin";

const RATE_WINDOW_SECONDS = 60 * 60; // 1 цаг
const RATE_LIMIT_MAX = 3; // 1 IP-аас 1 цагт дээд тал нь 3 удаа

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

function s(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function arr(v: unknown, max: number, itemMax: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, max);
}

export async function POST(req: NextRequest) {
  // Rate limit (best-effort — Redis unreachable бол алгасна, route 500 хийхгүй)
  if (redis) {
    try {
      const key = `survey:${clientIp(req)}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, RATE_WINDOW_SECONDS);
      if (count > RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: "Хэт олон удаа илгээлээ. 1 цагийн дараа дахин үзнэ үү." },
          { status: 429 },
        );
      }
    } catch (err) {
      console.warn("[survey] rate limit skipped (redis error):", err);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Validation
  const lastName = s(body.lastName, 100);
  const firstName = s(body.firstName, 100);
  if (!lastName || !firstName) {
    return NextResponse.json({ error: "Овог нэр шаардлагатай" }, { status: 400 });
  }

  const payload = {
    last_name: lastName,
    first_name: firstName,
    phone: s(body.phone, 50),
    email: s(body.email, 200),
    us_state: s(body.usState, 100),
    contact_time: s(body.contactTime, 100),
    contact_method: arr(body.contactMethod, 10, 50),
    property_type: arr(body.propType, 10, 50),
    property_location: arr(body.propLocation, 20, 100),
    property_purpose: arr(body.propPurpose, 10, 50),
    budget: s(body.budget, 100),
    urgency: s(body.urgency, 100),
    financing: s(body.financing, 100),
    prev_property: s(body.prevProperty, 100),
    notes: s(body.notes, 2000),
    hear_about: arr(body.hearAbout, 10, 50),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin as any)
    .from("survey_responses")
    .insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
