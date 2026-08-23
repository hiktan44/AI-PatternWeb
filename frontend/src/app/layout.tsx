import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://pattern.seymata.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AI-PatternWeb — Üretim Güvenli Kalıp Mühendisliği",
  description: "Fotoğraftan üretime hazır kalıba. Yapay zeka destekli, kural tabanlı, üretim güvenli web pattern engineering platformu.",
  keywords: "kalıp, pattern, moda, konfeksiyon, AI, yapay zeka, DXF, serileme, pastal, marker",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "AI-PatternWeb",
    description: "AI destekli, kural tabanlı, üretim güvenli pattern engineering platformu",
    url: siteUrl,
    siteName: "AI-PatternWeb",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AI-PatternWeb — Üretim Güvenli Kalıp Mühendisliği",
    description: "Fotoğraftan üretime hazır kalıp oluşturan yapay zeka destekli platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "AI-PatternWeb",
              applicationCategory: "DesignApplication",
              operatingSystem: "Web",
              url: siteUrl,
              description: metadata.description,
            }),
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
