import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { toSite, type SiteRow } from "@/lib/data";
import { notifyNav, query } from "@/lib/db";
import { errorResponse, parseId, pgCode } from "@/lib/http";
import { firstIssue, siteUpdateSchema } from "@/lib/schemas";

const SITE_COLUMNS = `id, category_id, title, url, description, icon, sort_order, clicks, created_at, updated_at`;

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await context.params;
  const siteId = parseId(id);
  if (!siteId) return errorResponse(404, "站点不存在");

  const body = await request.json().catch(() => null);
  const parsed = siteUpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const existing = await query<SiteRow>(
    `SELECT ${SITE_COLUMNS} FROM sites WHERE id = $1`,
    [siteId],
  );
  if (!existing[0]) return errorResponse(404, "站点不存在");

  if (parsed.data.category_id !== undefined) {
    const categories = await query<{ id: number }>(
      "SELECT id FROM categories WHERE id = $1",
      [parsed.data.category_id],
    );
    if (!categories[0]) return errorResponse(400, "目标分类不存在");
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of [
    "category_id",
    "title",
    "url",
    "description",
    "icon",
    "sort_order",
  ] as const) {
    if (field in parsed.data) {
      values.push(parsed.data[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json(toSite(existing[0]));
  }

  updates.push("updated_at = now() AT TIME ZONE 'UTC'");
  values.push(siteId);

  try {
    const rows = await query<SiteRow>(
      `UPDATE sites SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING ${SITE_COLUMNS}`,
      values,
    );

    await notifyNav();
    return NextResponse.json(toSite(rows[0]));
  } catch (error) {
    if (pgCode(error) === "23503") return errorResponse(400, "目标分类不存在");
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await context.params;
  const siteId = parseId(id);
  if (!siteId) return errorResponse(404, "站点不存在");

  const rows = await query<{ title: string }>(
    "DELETE FROM sites WHERE id = $1 RETURNING title",
    [siteId],
  );
  if (!rows[0]) return errorResponse(404, "站点不存在");

  await notifyNav();
  return Response.json({ detail: `已删除站点「${rows[0].title}」` });
}
