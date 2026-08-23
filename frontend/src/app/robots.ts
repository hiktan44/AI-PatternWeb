import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/", "/login"] }],
    sitemap: "https://pattern.seymata.com/sitemap.xml",
    host: "https://pattern.seymata.com",
  };
}
