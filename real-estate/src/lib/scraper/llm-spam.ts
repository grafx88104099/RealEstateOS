// lib/scraper/llm-spam.ts
// LLM judge for "uncertain" spam verdicts. gpt-4o-mini, single-shot, JSON.
// Cached in Upstash Redis by sha256(title+price) for 7 days.

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const redis = Redis.fromEnv();
const TTL_SECONDS = 7 * 24 * 60 * 60;

export interface LlmSpamResult {
  score: number; // 0..1
  reasons: string[];
  cached: boolean;
  tokens?: { input: number; output: number };
}

const SYSTEM = `Та үл хөдлөх хөрөнгийн зар луу спам/хууран мэхлэлт байгаа эсэхийг үнэлэх AI шинжээч.
Хариултаа JSON-аар буцаа: { "score": 0..1, "reasons": ["..."] }
score 0 = цэвэр, 1 = тодорхой спам.
Шалгах: үнэ дунджаас хол гажсан, contact phone сэжигтэй, шинж чанар дутуу, давхардсан текст, off-platform redirect.`;

export async function judgeSpamWithLlm(input: {
  title: string;
  price: number | null;
  raw_text: string | null;
  district: string | null;
}): Promise<LlmSpamResult> {
  const key = `scrape:spam:${sha(input.title + ":" + (input.price ?? ""))}`;

  const cached = await redis.get<LlmSpamResult>(key).catch(() => null);
  if (cached) return { ...cached, cached: true };

  const userText = `Гарчиг: ${input.title}
Үнэ: ${input.price ?? "—"}
Дүүрэг: ${input.district ?? "—"}
Текст: ${(input.raw_text ?? "").slice(0, 600)}`;

  let parsed: { score: number; reasons: string[] } = { score: 0, reasons: [] };
  let tokens = { input: 0, output: 0 };

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userText },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (res.ok) {
      const data = await res.json();
      tokens = {
        input: data.usage?.prompt_tokens ?? 0,
        output: data.usage?.completion_tokens ?? 0,
      };
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const j = JSON.parse(content);
        parsed = {
          score: typeof j.score === "number" ? Math.max(0, Math.min(1, j.score)) : 0,
          reasons: Array.isArray(j.reasons) ? j.reasons.slice(0, 5) : [],
        };
      }
    }
  } catch {
    // Network/timeout — fail closed (low score, will pass through rule layer's existing verdict)
  }

  const result: LlmSpamResult = { ...parsed, cached: false, tokens };
  await redis.set(key, parsed, { ex: TTL_SECONDS }).catch(() => undefined);
  return result;
}

function sha(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}
