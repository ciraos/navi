import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { toSite, type SiteRow } from "@/lib/data";
import { notifyNav, query } from "@/lib/db";
import { errorResponse, pgCode } from "@/lib/http";
import { firstIssue, siteInputSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const parsed = siteInputSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const categories = await query<{ id: number }>(
    "SELECT id FROM categories WHERE id = $1",
    [parsed.data.category_id],
  );
  if (!categories[0]) return errorResponse(400, "目标分类不存在");

  try {
    const rows = await query<SiteRow>(
      `INSERT INTO sites
        (category_id, title, url, description, icon, sort_order, clicks, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0,
               now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC')
       RETURNING id, category_id, title, url, description, icon, sort_order, clicks, created_at, updated_at`,
      [
        parsed.data.category_id,
        parsed.data.title,
        parsed.data.url,
        parsed.data.description ?? null,
        parsed.data.icon ?? null,
        parsed.data.sort_order,
      ],
    );

    await notifyNav();
    return NextResponse.json(toSite(rows[0]), { status: 201 });
  } catch (error) {
    if (pgCode(error) === "23503") return errorResponse(400, "目标分类不存在");
    throw error;
  }
}
