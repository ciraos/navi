import { connection } from "next/server";

import { buildAtom } from "@/lib/feed";
import { fetchNav } from "@/lib/nav-data";

export async function GET() {
  await connection();
  const nav = await fetchNav();

  return new Response(buildAtom(nav), {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
