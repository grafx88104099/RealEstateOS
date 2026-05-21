// AI endpoint cost / rate guard
// - Daily USD cap across бүх AI endpoint (Upstash Redis counter)
// - IP-based rate limit per route
//
// Хэрэглээ: API route эхэнд `const gate = await aiCostGuard(req, { route: "copilot" }); if (!gate.ok) return gate.response;`
// Дараа нь хариу авсны дараа `await aiCostGuard.recordSpend(usd)`-ыг дуудна.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

// Default cap: $5/өдөр AI-д. ENV-ээр override хийж болно.
const DAILY_CAP_USD = parseFloat(process.env.AI_DAILY_USD_CAP ?? "5");

// Default rate: 1 IP-аас 1 минутад 10 удаа (өндөр стандарт).
const DEFAULT_RATE_WINDOW_SECONDS = 60;
const DEFAULT_RATE_LIMIT_MAX = 10;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function todayKey(): string {
  const d = new Date();
  return `ai:spend:${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

export interface GuardOptions {
  route: string; // 'copilot', 'public-search' г.м.
  rateWindowSeconds?: number;
  rateLimitMax?: number;
  // userId/tenantId-аар тус тусдаа rate limit хийе гэвэл өгнө
  identifier?: string;
}

export type GuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function aiCostGuard(req: NextRequest, opts: GuardOptions): Promise<GuardResult> {
  if (!redis) return { ok: true }; // Local dev redis-гүй

  // 1. Daily cap check (cents-д хадгална)
  const spentCents = (await redis.get<number>(todayKey())) ?? 0;
  if (spentCents / 100 >= DAILY_CAP_USD) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AI үйлчилгээний өдрийн хязгаар дуусчээ. Маргааш дахин үзнэ үү." },
        { status: 429 },
      ),
    };
  }

  // 2. Rate limit
  const id = opts.identifier ?? clientIp(req);
  const window = opts.rateWindowSeconds ?? DEFAULT_RATE_WINDOW_SECONDS;
  const max = opts.rateLimitMax ?? DEFAULT_RATE_LIMIT_MAX;
  const rateKey = `ai:rate:${opts.route}:${id}`;
  const count = await redis.incr(rateKey);
  if (count === 1) await redis.expire(rateKey, window);
  if (count > max) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Хэт олон удаа дуудлаа (${max}/${window}с). Хэсэг хүлээгээд дахин үзнэ үү.` },
        { status: 429 },
      ),
    };
  }

  return { ok: true };
}

// Хэрэглээний өртөгийг бүртгэх. Хариу авсны дараа дуудна.
// usd_cents — нэгж бол cent (e.g. $0.0012 → 0.12 cents → round to 1)
export async function recordAiSpend(usdCents: number): Promise<void> {
  if (!redis) return;
  const key = todayKey();
  await redis.incrby(key, Math.max(0, Math.round(usdCents)));
  // 48 цагт expire (UTC өдөр шилжихэд автоматаар цэвэрлэх)
  await redis.expire(key, 48 * 3600);
}
