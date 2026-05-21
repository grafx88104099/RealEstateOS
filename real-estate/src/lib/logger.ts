// Structured logger — Sentry/Datadog хожим холбохын тулд consistent shape-тэй.
// Хэрэглээ: logger.error("payment_failed", { userId, tenantId, error });

type Level = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  tenantId?: string;
  route?: string;
  [key: string]: unknown;
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
  // Console-д бичинэ — Vercel-д структурлаг JSON хэлбэрээр сэрвэр log-д хадгалагдана.
  // Хожим Sentry холбохдоо энд `Sentry.captureException(err, { extra: ctx })` нэмнэ.
  if (level === "error") console.error(JSON.stringify(payload));
  else if (level === "warn") console.warn(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

export const logger = {
  debug: (event: string, ctx?: LogContext) => emit("debug", event, ctx),
  info: (event: string, ctx?: LogContext) => emit("info", event, ctx),
  warn: (event: string, ctx?: LogContext, err?: unknown) => emit("warn", event, ctx, err),
  error: (event: string, ctx?: LogContext, err?: unknown) => emit("error", event, ctx, err),
};
