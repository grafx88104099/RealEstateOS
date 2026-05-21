// URL аюулгүй байдлын шалгалт — SSRF-аас сэргийлнэ.
// Private/loopback/link-local IP-уудыг блоклоно.
import { lookup } from "dns";
import { promisify } from "util";

const dnsLookup = promisify(lookup);

const PRIVATE_RANGES = [
  // IPv4
  /^10\./,
  /^127\./,
  /^169\.254\./, // link-local (AWS metadata)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  // IPv6
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((rx) => rx.test(ip));
}

export async function assertSafePublicUrl(rawUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, error: "Only http(s) allowed" };
  }

  const host = url.hostname;
  if (!host || host === "localhost") {
    return { ok: false, error: "Localhost disallowed" };
  }

  // Hostname-ыг шууд IP-аар бичсэн бол шалгана
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) {
      return { ok: false, error: "Private/loopback IP disallowed" };
    }
    return { ok: true };
  }

  // DNS lookup — resolved IP-ыг шалгана (DNS rebinding-аас бага зэрэг хамгаална)
  try {
    const { address } = await dnsLookup(host);
    if (isPrivateIp(address)) {
      return { ok: false, error: "Hostname resolves to private IP" };
    }
  } catch {
    return { ok: false, error: "DNS resolution failed" };
  }

  return { ok: true };
}
