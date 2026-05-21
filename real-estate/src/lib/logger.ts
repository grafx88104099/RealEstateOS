// Structured logger — JSON output + Sentry forwarding (хэрэв тохируулсан бол)
// Хэрэглээ: logger.error("payment_failed", { userId, tenantId }, err);

type Level = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  tenantId?: string;
  route?: string;
  [key: string]: unknown;
}

// Sentry-г server бас client дээр аль алин нь Sentry/nextjs auto-init хийнэ.
// Lazy import-аар bundle хэмжээг хазайлгахгүй.
async function forwardToSentry(level: Level, event: string, ctx?: LogContext, err?: unknown) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    if (level === "error") {
      if (err) Sentry.captureException(err, { tags: { event }, extra: ctx });
      else Sentry.captureMessage(event, { level: "error", extra: ctx });
    } else if (level === "warn") {
      Sentry.captureMessage(event, { level: "warning", extra: ctx });
    }
  } catch {/* Sentry import failed — silent */}
}

function emit(level: Level, event: string, ctx?: LogContext, err?: unknown) {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(ctx ?? {}),
  };
  if (err instanceof Error) {
    payload.error = err.message;
    payload.stack = err.stack;
  } else if (err !== undefined) {
    payload.error = String(err);
  }
  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));

  // Sentry forwarding (best-effort, fire-and-forget)
  if (level === "error" || level === "warn") {
    forwardToSentry(level, event, ctx, err).catch(() => {});
  }
}

export const logger = {
  debug: (event: string, ctx?: LogContext) => emit("debug", event, ctx),
  info: (event: string, ctx?: LogContext) => emit("info", event, ctx),
  warn: (event: string, ctx?: LogContext, err?: unknown) => emit("warn", event, ctx, err),
  error: (event: string, ctx?: LogContext, err?: unknown) => emit("error", event, ctx, err),
};
