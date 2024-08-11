import type { Metadata } from "next";
import Script from "next/script";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

import Footer from "@/components/common/footer";
import GoogleAnalytics from "@/components/ga4/google-analytics-4";

const font = IBM_Plex_Sans_KR({
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL!),
  title: `Yangoos Github Blog`,
  description: `데이터를 종합해 정보를 만듭니다.`,
  openGraph: {
    images: "/og/og-default.png",
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION!,
    other: {
      "naver-site-verification": process.env.NAVER_VERIFICATION!,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="kr">
      <GoogleAnalytics GA_TRACKING_ID={process.env.GA_TRACKING_ID!} />
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2341342262931969"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
          crossOrigin="anonymous"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta
          name="msapplication-config"
          content="/favicon/browserconfig.xml"
        />
        <meta name="theme-color" content="#000" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body className={`${font.className} h-lvh flex flex-col `}>
        <div className="pt-[55px] px-2 mx-auto w-full text-black/95  grow">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
