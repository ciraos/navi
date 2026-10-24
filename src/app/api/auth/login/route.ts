import type { NextRequest } from "next/server";

import { authResponse, verifyPassword, type UserRow } from "@/lib/auth";
import { query } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { firstIssue, loginSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const rows = await query<UserRow>(
    `SELECT id, email, password_hash, is_admin, created_at, last_login_at
     FROM users WHERE email = $1`,
    [parsed.data.email],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return errorResponse(401, "邮箱或密码不正确");
  }

  const updated = await query<UserRow>(
    `UPDATE users SET last_login_at = now() AT TIME ZONE 'UTC'
     WHERE id = $1
     RETURNING id, email, password_hash, is_admin, created_at, last_login_at`,
    [user.id],
  );

  return authResponse(updated[0] ?? user);
}
