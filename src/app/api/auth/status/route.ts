import type { NextRequest } from "next/server";

import { countUsers, getCurrentUser, toPublicUser } from "@/lib/auth";
import { getSiteMeta } from "@/lib/site-settings";

export async function GET(request: NextRequest) {
  const [initialized, user, site] = await Promise.all([
    countUsers(),
    getCurrentUser(request),
    getSiteMeta(),
  ]);

  return Response.json({
    initialized: initialized > 0,
    authenticated: user !== null,
    user: user ? toPublicUser(user) : null,
    site,
  });
}
