import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://pattern.seymata.com/", changeFrequency: "weekly", priority: 1 },
    { url: "https://pattern.seymata.com/privacy", changeFrequency: "yearly", priority: 0.3 },
    { url: "https://pattern.seymata.com/terms", changeFrequency: "yearly", priority: 0.3 },
  ];
}
