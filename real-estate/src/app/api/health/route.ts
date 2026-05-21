// GET /api/health — uptime monitor шалгана.
// DB ping + Redis REST API direct call (no client init issues).
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "fail" | "skip"> = {};
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

  // 2. Redis — REST API-аар шууд ping хийнэ (Redis client init-аас зайлсхийнэ)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: "no-store",
      });
      checks.redis = res.ok ? "ok" : "fail";
      if (!res.ok) allOk = false;
    } catch {
      checks.redis = "fail";
      allOk = false;
    }
  } else {
    checks.redis = "skip";
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
