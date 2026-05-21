import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getRoleFromJWT, ROLE_HOME, AllowedRole } from "@/lib/utils/jwt";

// Role тус бүрийн зөвшөөрөгдсөн route prefix
const ROUTE_ROLES: Record<string, AllowedRole[]> = {
  "/super":     ["super_admin"],
  "/dashboard": ["tenant_admin", "super_admin"],
  "/agent":     ["agent"],
  "/consumer":  ["consumer"],
};

export async function middleware(req: NextRequest) {
  const response = NextResponse.next({ request: req });
  response.headers.set("x-next-pathname", req.nextUrl.pathname);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;

  const role = session ? getRoleFromJWT(session.access_token) : null;

  // Super admin login хуудсыг хамгаалалтгүй болгох
  if (pathname === "/super/login") {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/super", req.url));
    }
    return response;
  }

  // Нэвтэрсэн хэрэглэгчийг login/register/agent-portal-с role-ийн dashboard руу
  if (pathname === "/login" || pathname.startsWith("/register") || pathname === "/agent-portal") {
    if (role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], req.url));
    }
    return response;
  }

  // Role-based route protection
  for (const [prefix, allowed] of Object.entries(ROUTE_ROLES)) {
    if (pathname.startsWith(prefix)) {
      if (!session) {
        const loginUrl = prefix === "/super" ? "/super/login" : "/login";
        return NextResponse.redirect(new URL(loginUrl, req.url));
      }
      if (!role || !allowed.includes(role)) {
        const home = role ? ROLE_HOME[role] : "/login";
        if (pathname !== home) {
          return NextResponse.redirect(new URL(home, req.url));
        }
      }
      break;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/super/:path*",
    "/dashboard/:path*",
    "/agent/:path*",
    "/consumer/:path*",
    "/login",
    "/register",
    "/register/:path*",
    "/agent-portal",
  ],
};
