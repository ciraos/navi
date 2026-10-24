import { connection } from "next/server";

import { buildRss } from "@/lib/feed";
import { fetchNav } from "@/lib/nav-data";

export async function GET() {
  await connection();
  const nav = await fetchNav();

  return new Response(buildRss(nav), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
