// Sentry client-side initialization
// SENTRY_DSN env var тохируулсан үед идэвхждэг. Үгүй бол no-op.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // Replay-г одоогоор асаахгүй (privacy + cost)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}
