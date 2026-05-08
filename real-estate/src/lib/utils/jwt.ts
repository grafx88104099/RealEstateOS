// lib/utils/jwt.ts
// JWT payload decode utility — middleware + auth.ts хоёулаа ашиглана

export type AllowedRole = "super_admin" | "tenant_admin" | "agent" | "consumer";

export const ROLE_HOME: Record<AllowedRole, string> = {
  super_admin:  "/super",
  tenant_admin: "/dashboard",
  agent:        "/agent",
  consumer:     "/consumer",
};

export function decodeJWT(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    // base64url → base64 (browser болон Node.js хоёуланд ажиллана)
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof atob !== "undefined"
        ? atob(base64)                                        // browser
        : Buffer.from(base64, "base64").toString("utf-8");   // Node.js
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

export function getRoleFromJWT(token: string): AllowedRole | null {
  const payload = decodeJWT(token);
  const role = payload.user_role as string | undefined;
  if (!role) return null;
  const valid: AllowedRole[] = ["super_admin", "tenant_admin", "agent", "consumer"];
  return valid.includes(role as AllowedRole) ? (role as AllowedRole) : null;
}
