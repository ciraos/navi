import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  return clearAuthCookie(NextResponse.json({ detail: "已退出登录" }));
}
