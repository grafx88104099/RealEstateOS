// lib/scraper/spam-rules.ts
// Cheap rule-based spam classifier. Returns:
//   verdict: 'clean' | 'spam' | 'uncertain'
//   score:   0..1 (higher = more spammy)
//   reasons: human-readable list of triggers
//
// LLM judge (Phase B) only fires when verdict='uncertain'.

export interface SpamCheckInput {
  title: string | null | undefined;
  raw_text: string | null | undefined;
  price: number | null | undefined;
  area_sqm: number | null | undefined;
  contact_phone: string | null | undefined;
}

export interface SpamCheckResult {
  verdict: "clean" | "spam" | "uncertain";
  score: number;
  reasons: string[];
}

// Env-controlled blocklist (CSV of phone numbers, partial-match).
const SCAM_PHONES = (process.env.SCRAPER_SCAM_PHONE_LIST ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length >= 4);

// Suspicious URL hosts in raw_text (telegram-only contact, off-platform redirect).
const SUSPECT_URL_PATTERNS = [
  /\bt\.me\//i,
  /telegram\.org/i,
  /chatlink/i,
  /bit\.ly/i,
  /tinyurl/i,
];

export function checkSpam(input: SpamCheckInput): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;

  const title = (input.title ?? "").trim();
  const raw = (input.raw_text ?? "").trim();

  // 1. All-caps + emoji ratio
  if (title.length >= 8) {
    const caps = (title.match(/[A-ZА-Я]/g) ?? []).length;
    const emoji = (title.match(/\p{Extended_Pictographic}/gu) ?? []).length;
    const ratio = (caps + emoji * 2) / title.length;
    if (ratio > 0.4) {
      score += 0.5;
      reasons.push("title:all_caps_emoji");
    }
  }

  // 2. Price suspiciously high without area
  if (
    input.price != null &&
    input.price > 100_000_000 &&
    (input.area_sqm == null || input.area_sqm <= 0)
  ) {
    score += 0.4;
    reasons.push("price:high_no_area");
  }

  // 3. Phone in scam blocklist
  if (input.contact_phone && SCAM_PHONES.length > 0) {
    const normalized = input.contact_phone.replace(/\D/g, "");
    if (SCAM_PHONES.some((p) => normalized.includes(p.replace(/\D/g, "")))) {
      score += 1.0;
      reasons.push("phone:scam_blocklist");
    }
  }

  // 4. Off-platform contact links in raw_text
  if (raw && SUSPECT_URL_PATTERNS.some((re) => re.test(raw))) {
    score += 0.3;
    reasons.push("text:off_platform_link");
  }

  // 5. Empty title or raw_text
  if (title.length < 5) {
    score += 0.4;
    reasons.push("title:too_short");
  }

  // 6. Price = 0 or negative
  if (input.price != null && input.price <= 0) {
    score += 0.5;
    reasons.push("price:zero_or_negative");
  }

  // Clamp + verdict
  score = Math.min(1, score);
  let verdict: SpamCheckResult["verdict"];
  if (score >= 0.7) verdict = "spam";
  else if (score >= 0.3) verdict = "uncertain";
  else verdict = "clean";

  return { verdict, score, reasons };
}
