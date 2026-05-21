"use client";
import ErrorFallback from "@/components/error-fallback";
export default function SuperError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback {...props} section="super" />;
}
