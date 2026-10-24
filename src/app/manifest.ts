import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { fetchNav } from "@/lib/nav-data";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-url";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection();
  const nav = await fetchNav();
  const name = nav?.site.name?.trim() || SITE_NAME;
  const description = nav?.site.description?.trim() || SITE_DESCRIPTION;

  return {
    name,
    short_name: name,
    description,
    lang: "zh-CN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f6f7",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
