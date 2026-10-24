import type { NextRequest } from "next/server";

import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return errorResponse(401, "未登录或登录已过期");
  return Response.json(toPublicUser(user));
}
