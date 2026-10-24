import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { toCategory, type CategoryRow } from "@/lib/data";
import { notifyNav, query } from "@/lib/db";
import { errorResponse, parseId, pgCode } from "@/lib/http";
import { categoryUpdateSchema, firstIssue } from "@/lib/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await context.params;
  const categoryId = parseId(id);
  if (!categoryId) return errorResponse(404, "分类不存在");

  const body = await request.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const existing = await query<CategoryRow>(
    "SELECT id, name, icon, description, sort_order FROM categories WHERE id = $1",
    [categoryId],
  );
  if (!existing[0]) return errorResponse(404, "分类不存在");

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of ["name", "icon", "description", "sort_order"] as const) {
    if (field in parsed.data) {
      values.push(parsed.data[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (updates.length === 0) {
    return NextResponse.json(toCategory(existing[0]));
  }

  try {
    values.push(categoryId);
    const rows = await query<CategoryRow>(
      `UPDATE categories SET ${updates.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, name, icon, description, sort_order`,
      values,
    );

    await notifyNav();
    return NextResponse.json(toCategory(rows[0]));
  } catch (error) {
    if (pgCode(error) === "23505") return errorResponse(409, "分类名已存在");
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await context.params;
  const categoryId = parseId(id);
  if (!categoryId) return errorResponse(404, "分类不存在");

  const rows = await query<{ name: string }>(
    "DELETE FROM categories WHERE id = $1 RETURNING name",
    [categoryId],
  );
  if (!rows[0]) return errorResponse(404, "分类不存在");

  await notifyNav();
  return Response.json({ detail: `已删除分类「${rows[0].name}」及其下所有站点` });
}
