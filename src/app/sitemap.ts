import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { latestSiteDate } from "@/lib/feed";
import { fetchNav } from "@/lib/nav-data";
import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const nav = await fetchNav();

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: latestSiteDate(nav),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
