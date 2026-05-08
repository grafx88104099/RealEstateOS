// lib/scraper/robots.ts
// Lightweight robots.txt parser. Caches per-host for the lifetime of the process.
// Honors Disallow rules for the bot's User-Agent (or '*' fallback).

const cache = new Map<string, { rules: Rule[]; fetchedAt: number }>();
const TTL_MS = 24 * 60 * 60 * 1000;

interface Rule {
  type: "allow" | "disallow";
  path: string;
}

const UA = "RealEstateOS-Bot";

async function loadRobots(host: string): Promise<Rule[]> {
  const cached = cache.get(host);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.rules;

  try {
    const res = await fetch(`https://${host}/robots.txt`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      cache.set(host, { rules: [], fetchedAt: Date.now() });
      return [];
    }
    const text = await res.text();
    const rules = parse(text);
    cache.set(host, { rules, fetchedAt: Date.now() });
    return rules;
  } catch {
    cache.set(host, { rules: [], fetchedAt: Date.now() });
    return [];
  }
}

function parse(text: string): Rule[] {
  const rules: Rule[] = [];
  let applies = false;
  for (const lineRaw of text.split("\n")) {
    const line = lineRaw.split("#")[0].trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const key = k.trim().toLowerCase();
    if (key === "user-agent") {
      const v = value.toLowerCase();
      applies = v === "*" || UA.toLowerCase().includes(v);
    } else if (applies && (key === "disallow" || key === "allow")) {
      rules.push({ type: key, path: value });
    }
  }
  return rules;
}

export async function isAllowed(url: string): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const rules = await loadRobots(u.host);
  if (rules.length === 0) return true;

  // Most specific match wins (longest matching path)
  let best: Rule | null = null;
  for (const r of rules) {
    if (r.path && u.pathname.startsWith(r.path)) {
      if (!best || r.path.length > best.path.length) best = r;
    } else if (!r.path && r.type === "disallow") {
      // Disallow with empty path means allow everything → ignore.
    }
  }
  return best ? best.type === "allow" : true;
}
