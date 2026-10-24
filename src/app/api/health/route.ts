import { connection } from "next/server";

import { countUsers } from "@/lib/auth";
import { getSiteMeta } from "@/lib/site-settings";

export async function GET() {
  await connection();
  const [initialized, site] = await Promise.all([countUsers(), getSiteMeta()]);

  return Response.json({
    status: "ok",
    database: "postgresql",
    initialized: initialized > 0,
    site: site.name,
    env: process.env.APP_ENV ?? "development",
  });
}
