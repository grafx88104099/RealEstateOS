import type { Metadata } from "next";
import { Geist, Geist_Mono, Onest } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nemi.mn";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "nemi — Үл хөдлөх хөрөнгийн зар",
    template: "%s | nemi",
  },
  description: "Монгол хэлээр AI хайлттай үл хөдлөх хөрөнгийн зарын платформ. Орон сууц, хувийн сууц, оффис, газар.",
  applicationName: "nemi",
  keywords: ["үл хөдлөх", "орон сууц", "real estate", "Mongolia", "nemi", "зар"],
  openGraph: {
    type: "website",
    locale: "mn_MN",
    url: SITE_URL,
    siteName: "nemi",
    title: "nemi — Үл хөдлөх хөрөнгийн зар",
    description: "Монгол хэлээр AI хайлттай үл хөдлөх хөрөнгийн зарын платформ",
  },
  twitter: {
    card: "summary_large_image",
    title: "nemi — Үл хөдлөх хөрөнгийн зар",
    description: "Монгол хэлээр AI хайлттай үл хөдлөх хөрөнгийн зарын платформ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} ${onest.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
