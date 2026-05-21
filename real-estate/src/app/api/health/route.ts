// GET /api/health — uptime monitor шалгана.
// DB ping + Redis ping (хэрэв тохируулсан бол). 200 = OK, 503 = degraded.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {};
  let allOk = true;

  // 1. DB ping
  try {
    const { error } = await supabaseAdmin.from("tenants").select("id").limit(1);
    checks.db = error ? "fail" : "ok";
    if (error) allOk = false;
  } catch {
    checks.db = "fail";
    allOk = false;
  }

  // 2. Redis check — set/get with TTL
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = Redis.fromEnv();
      const key = "health:ping";
      await redis.set(key, Date.now(), { ex: 60 });
      const v = await redis.get(key);
      checks.redis = v ? "ok" : "fail";
      if (!v) allOk = false;
    } catch {
      checks.redis = "fail";
      allOk = false;
    }
  }

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
