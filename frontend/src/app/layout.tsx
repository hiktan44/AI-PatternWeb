import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-PatternWeb — Üretim Güvenli Kalıp Mühendisliği",
  description: "Fotoğraftan üretime hazır kalıba. Yapay zeka destekli, kural tabanlı, üretim güvenli web pattern engineering platformu.",
  keywords: "kalıp, pattern, moda, konfeksiyon, AI, yapay zeka, DXF, serileme, pastal, marker",
  openGraph: {
    title: "AI-PatternWeb",
    description: "AI destekli, kural tabanlı, üretim güvenli pattern engineering platformu",
    type: "website",
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
