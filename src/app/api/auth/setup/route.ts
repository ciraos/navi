import type { NextRequest } from "next/server";

import {
  authResponse,
  countUsers,
  hashPassword,
  passwordTooLong,
  type UserRow,
} from "@/lib/auth";
import { notifyNav, query, withTransaction } from "@/lib/db";
import { errorResponse, pgCode } from "@/lib/http";
import { firstIssue, setupSchema } from "@/lib/schemas";
import { seedDemo } from "@/lib/seed";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) return errorResponse(422, firstIssue(parsed.error));

  const { email, password, seed_demo } = parsed.data;
  if (passwordTooLong(password)) {
    return errorResponse(422, "密码超过 72 字节");
  }

  if ((await countUsers()) > 0) {
    return errorResponse(409, "系统已经初始化过，请直接登录");
  }

  const passwordHash = await hashPassword(password);
  let user: UserRow;
  try {
    const rows = await query<UserRow>(
      `INSERT INTO users (email, password_hash, is_admin, created_at)
       VALUES ($1, $2, TRUE, now() AT TIME ZONE 'UTC')
       RETURNING id, email, password_hash, is_admin, created_at, last_login_at`,
      [email, passwordHash],
    );
    user = rows[0];
  } catch (error) {
    if (pgCode(error) === "23505") {
      return errorResponse(409, "该邮箱已被使用");
    }
    throw error;
  }

  if (seed_demo) {
    try {
      await withTransaction((client) => seedDemo(client));
    } catch (error) {
      console.error("[setup] 写入示例数据失败，已跳过", error);
    }
  }

  await notifyNav();
  return authResponse(user, 201);
}
