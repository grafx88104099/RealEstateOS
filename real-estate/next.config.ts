import type { NextConfig } from "next";

const securityHeaders = [
  // HSTS — 6 сар хүчинтэй, бүх subdomain
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  // Clickjacking хамгаалалт
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Бүх route-д ерөнхий security header-уудыг
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Listing image-уудыг гадаад domain-аас зөвшөөрнө (CDN, Supabase storage)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn1.unegui.mn" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
};

export default nextConfig;
