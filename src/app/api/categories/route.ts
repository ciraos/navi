import { NextResponse, type NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { toCategory, type CategoryRow } from "@/lib/data";
import { notifyNav, query } from "@/lib/db";
import { errorResponse, pgCode } from "@/lib/http";
import { categoryInputSchema, firstIssue } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  try {
    const rows = await query<CategoryRow>(
      `INSERT INTO categories (name, icon, description, sort_order, created_at)
       VALUES ($1, $2, $3, $4, now() AT TIME ZONE 'UTC')
       RETURNING id, name, icon, description, sort_order`,
      [
        parsed.data.name,
        parsed.data.icon ?? null,
        parsed.data.description ?? null,
        parsed.data.sort_order,
      ],
    );

    await notifyNav();
    return NextResponse.json(toCategory(rows[0]), { status: 201 });
  } catch (error) {
    if (pgCode(error) === "23505") return errorResponse(409, "分类名已存在");
    throw error;
  }
}
