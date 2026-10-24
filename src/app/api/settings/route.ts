import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { notifyNav, query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { firstIssue, siteSettingsSchema } from "@/lib/schemas";
import { getSiteSettings } from "@/lib/site-settings";

type SettingsRow = {
  site_name: string | null;
  icp: string | null;
  police: string | null;
};

function normalize(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

export async function GET() {
  await connection();
  return Response.json(await getSiteSettings());
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const current = await getSiteSettings();
  const has = (key: keyof typeof parsed.data) =>
    Object.prototype.hasOwnProperty.call(parsed.data, key);

  const rows = await query<SettingsRow>(
    `INSERT INTO site_settings (id, site_name, icp, police, updated_at)
     VALUES (1, $1, $2, $3, now() AT TIME ZONE 'UTC')
     ON CONFLICT (id) DO UPDATE SET
       site_name = EXCLUDED.site_name,
       icp = EXCLUDED.icp,
       police = EXCLUDED.police,
       updated_at = EXCLUDED.updated_at
     RETURNING site_name, icp, police`,
    [
      has("site_name") ? normalize(parsed.data.site_name) : current.site_name,
      has("icp") ? normalize(parsed.data.icp) : current.icp,
      has("police") ? normalize(parsed.data.police) : current.police,
    ],
  );

  await notifyNav();
  return Response.json(rows[0]);
}
