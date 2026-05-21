// Constant-time string comparison — timing attack-аас сэргийлнэ
import { timingSafeEqual } from "crypto";

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
