// API route HOC — handler-ийг try/catch-оор хүрээлж 500 алдаа stack trace user-руу гарахаас сэргийлнэ.
// Хэрэглээ:
//   export const POST = withHandler("listings.create", async (req) => { ... });
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

type Handler<Ctx = unknown> = (
  req: NextRequest,
  ctx: Ctx,
) => Promise<NextResponse | Response>;

export function withHandler<Ctx = unknown>(
  routeName: string,
  handler: Handler<Ctx>,
): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      logger.error("api.unhandled", { route: routeName, method: req.method }, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
